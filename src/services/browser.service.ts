import { Browser, BrowserContext, chromium } from 'playwright';
import { logger } from '../utils/logger';

class BrowserService {
  private static instance: BrowserService;
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;

  private constructor() {}

  public static getInstance(): BrowserService {
    if (!BrowserService.instance) {
      BrowserService.instance = new BrowserService();
    }

    return BrowserService.instance;
  }

  public async getBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    if (this.launching) {
      return this.launching;
    }

    const launchingPromise = chromium
      .launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
      .then((browser) => {
        this.browser = browser;
        this.launching = null;
        logger.info('Shared Chromium browser launched');
        return browser;
      })
      .catch((error: unknown) => {
        this.launching = null;
        throw error;
      });

    this.launching = launchingPromise;
    return launchingPromise;
  }

  public async createContext(): Promise<BrowserContext> {
    const browser = await this.getBrowser();
    return browser.newContext();
  }

  public async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Shared Chromium browser closed');
    }
  }
}

export const browserService = BrowserService.getInstance();
