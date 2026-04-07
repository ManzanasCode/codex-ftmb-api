import fs from 'node:fs';
import path from 'node:path';
import { AppInfoResponse } from '../types/app';

class AppInfoService {
  private readonly packageJsonPath = path.resolve(process.cwd(), 'package.json');

  private getPackageMetadata(): { name: string; version: string } {
    try {
      const raw = fs.readFileSync(this.packageJsonPath, 'utf-8');
      const parsed = JSON.parse(raw) as { name?: unknown; version?: unknown };
      const name =
        typeof parsed.name === 'string' && parsed.name.trim().length > 0 ? parsed.name : 'api-service';
      const version =
        typeof parsed.version === 'string' && parsed.version.trim().length > 0 ? parsed.version : 'unknown';

      return { name, version };
    } catch {
      // Ignore read/parse errors and fallback to unknown.
    }

    return { name: 'api-service', version: 'unknown' };
  }

  public getInfo(): AppInfoResponse {
    const metadata = this.getPackageMetadata();

    return {
      serviceName: metadata.name,
      deployedVersion: metadata.version,
      environment: process.env.NODE_ENV ?? 'development',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}

export const appInfoService = new AppInfoService();
