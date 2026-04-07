import { Page, Response } from 'playwright';
import { env } from '../config/env';
import { ApiCall, DetectResponse } from '../types/detection';
import { TimeoutError } from '../utils/errors';
import { logger } from '../utils/logger';
import { browserService } from './browser.service';

interface DetectOptions {
  filters: string[];
}

interface ExtractedPayload {
  size: number;
  data: unknown | null;
}

class DetectionService {
  private readonly allowedResourceTypes = new Set<string>(['xhr', 'fetch']);
  private readonly networkIdleWaitMs = 4_000;
  private readonly extraCaptureWaitMs = 1_500;
  private readonly bodyReadTimeoutMs = 1_200;
  private readonly maxBodyParseBytes = 1_000_000;

  public async detect(targetUrl: string, options: DetectOptions): Promise<DetectResponse> {
    const context = await browserService.createContext();
    const page = await context.newPage();
    const startedAt = Date.now();
    const deadline = startedAt + env.detectionTimeoutMs;

    page.setDefaultNavigationTimeout(env.detectionTimeoutMs);
    page.setDefaultTimeout(env.detectionTimeoutMs);

    const detectedCalls = new Map<string, ApiCall>();
    const pendingTasks = new Set<Promise<void>>();

    const normalizedFilters = options.filters
      .map((filter) => filter.trim().toLowerCase())
      .filter((filter) => filter.length > 0);

    const handleResponse = (response: Response): void => {
      const task = this.captureResponse(response, detectedCalls, normalizedFilters, deadline).catch(
        (error: unknown) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Failed to capture response data: ${errorMessage}`);
        },
      );

      pendingTasks.add(task);
      void task.finally(() => {
        pendingTasks.delete(task);
      });
    };

    page.on('response', handleResponse);

    try {
      try {
        await this.runWithTimeout(
          async () => {
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
            await this.waitForNetworkIdleBestEffort(page);
            await this.sleep(this.extraCaptureWaitMs);
            await this.waitForPendingTasksWithinBudget(pendingTasks, deadline);
          },
          env.detectionTimeoutMs,
          `Detection timed out after ${env.detectionTimeoutMs}ms`,
        );
      } catch (error: unknown) {
        if (error instanceof TimeoutError) {
          logger.info(`Detection timeout reached for ${targetUrl}; returning partial captured calls.`);
        } else {
          throw error;
        }
      }

      await this.waitForPendingTasksWithinBudget(pendingTasks, deadline);

      const records = Array.from(detectedCalls.values());
      const matchId = this.extractMatchId(targetUrl);
      const teamIds = this.extractNextMatchTeamIds(records, normalizedFilters);

      logger.info(
        `Detection complete for ${targetUrl}: ${records.length} unique API calls in ${Date.now() - startedAt}ms`,
      );

      return {
        matchId,
        teamIds,
        totalRecords: records.length,
        records,
      };
    } finally {
      page.off('response', handleResponse);
      await page.close().catch(() => undefined);
      await context.close().catch(() => undefined);
    }
  }

  private extractMatchId(targetUrl: string): string | null {
    try {
      const parsed = new URL(targetUrl);
      const hashValue = parsed.hash.replace('#', '').trim();

      if (/^\d+$/.test(hashValue)) {
        return hashValue;
      }

      const hashMatch = parsed.hash.match(/(\d+)/);
      return hashMatch ? hashMatch[1] : null;
    } catch {
      return null;
    }
  }

  private extractNextMatchTeamIds(records: ApiCall[], filters: string[]): string[] {
    const shouldExtractFromNextMatch =
      filters.length === 0 || filters.some((filter) => filter.includes('nextmatch'));

    if (!shouldExtractFromNextMatch) {
      return [];
    }

    const teamIds = new Set<string>();

    for (const record of records) {
      try {
        const parsed = new URL(record.url);
        const isNextMatchCall = parsed.pathname.toLowerCase().includes('nextmatch');
        if (!isNextMatchCall) {
          continue;
        }

        const teamId = parsed.searchParams.get('teamId');
        if (teamId && teamId.trim().length > 0) {
          teamIds.add(teamId.trim());
        }
      } catch {
        // Ignore malformed URLs safely.
      }
    }

    return Array.from(teamIds);
  }

  private async captureResponse(
    response: Response,
    detectedCalls: Map<string, ApiCall>,
    filters: string[],
    deadline: number,
  ): Promise<void> {
    if (Date.now() >= deadline) {
      return;
    }

    const request = response.request();
    const resourceType = request.resourceType();

    if (!this.allowedResourceTypes.has(resourceType)) {
      return;
    }

    const requestUrl = request.url();
    if (!this.matchesFilter(requestUrl, filters)) {
      return;
    }

    if (detectedCalls.has(requestUrl)) {
      return;
    }

    const method = request.method();
    const status = response.status();
    const timestamp = Date.now();

    const headers = response.headers();
    const contentType = headers['content-type'];
    const contentLength = headers['content-length'];
    const payload = await this.extractPayload(response, contentType, contentLength, deadline);

    detectedCalls.set(requestUrl, {
      url: requestUrl,
      method,
      status,
      timestamp,
      size: payload.size,
      data: payload.data,
    });
  }

  private matchesFilter(requestUrl: string, filters: string[]): boolean {
    if (filters.length === 0) {
      return true;
    }

    const normalizedUrl = requestUrl.toLowerCase();
    return filters.some((filter) => normalizedUrl.includes(filter));
  }

  private async extractPayload(
    response: Response,
    contentTypeHeader?: string,
    contentLengthHeader?: string,
    deadline?: number,
  ): Promise<ExtractedPayload> {
    const contentType = (contentTypeHeader ?? '').toLowerCase();
    const parsedContentLength = Number.parseInt(contentLengthHeader ?? '', 10);

    let size = Number.isFinite(parsedContentLength) ? parsedContentLength : 0;
    let data: unknown | null = null;
    const isJsonContentType = contentType.includes('application/json') || contentType.includes('+json');

    if (size > 0 && !isJsonContentType) {
      return { size, data };
    }

    const canAttemptBodyRead = !Number.isFinite(parsedContentLength) || parsedContentLength <= this.maxBodyParseBytes;

    if (!canAttemptBodyRead) {
      return { size, data };
    }

    const remainingBudgetMs =
      typeof deadline === 'number' ? Math.max(0, deadline - Date.now()) : this.bodyReadTimeoutMs;
    const readTimeoutMs = Math.max(1, Math.min(this.bodyReadTimeoutMs, remainingBudgetMs));
    const bodyBuffer = await this.withTimeout<Buffer>(response.body(), readTimeoutMs);

    if (!bodyBuffer) {
      return { size, data };
    }

    if (size === 0) {
      size = bodyBuffer.byteLength;
    }

    if (bodyBuffer && bodyBuffer.byteLength > 0) {
      const bodyText = bodyBuffer.toString('utf-8').trim();
      const looksLikeJson = bodyText.startsWith('{') || bodyText.startsWith('[');
      const shouldTryJson = isJsonContentType || looksLikeJson;

      if (shouldTryJson) {
        try {
          data = JSON.parse(bodyText) as unknown;
        } catch {
          // Ignore parse issues and return null data.
        }
      }
    }

    return { size, data };
  }

  private async waitForPendingTasksWithinBudget(
    pendingTasks: Set<Promise<void>>,
    deadline: number,
  ): Promise<void> {
    if (pendingTasks.size === 0) {
      return;
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      return;
    }

    const settled = await this.withTimeout<void>(
      Promise.allSettled(Array.from(pendingTasks)).then(() => undefined),
      remainingMs,
    );

    if (settled === null) {
      logger.info('Stopped waiting for pending response parsing due to detection time budget.');
    }
  }

  private async waitForNetworkIdleBestEffort(page: Page): Promise<void> {
    try {
      await page.waitForLoadState('networkidle', { timeout: this.networkIdleWaitMs });
    } catch {
      logger.info(
        `Network idle was not reached within ${this.networkIdleWaitMs}ms; returning best-effort captured calls.`,
      );
    }
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
    return new Promise<T | null>((resolve) => {
      const timeoutHandle = setTimeout(() => {
        resolve(null);
      }, timeoutMs);

      void promise
        .then((value) => {
          clearTimeout(timeoutHandle);
          resolve(value);
        })
        .catch(() => {
          clearTimeout(timeoutHandle);
          resolve(null);
        });
    });
  }

  private async runWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage: string,
  ): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | null = null;

    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new TimeoutError(timeoutMessage));
      }, timeoutMs);
    });

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }
}

export const detectionService = new DetectionService();
