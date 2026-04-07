import app from './app';
import { env } from './config/env';
import { browserService } from './services/browser.service';
import { logger } from './utils/logger';

const server = app.listen(env.port);

server.on('listening', () => {
  logger.info(`Service listening on port ${env.port}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${env.port} is already in use. Stop the other process or set a different PORT.`);
    process.exit(1);
    return;
  }

  logger.error(`Server error: ${error.name}: ${error.message}`);
  process.exit(1);
});

const formatUnknownError = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
};

const closeServer = async (): Promise<void> => {
  if (!server.listening) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error?: Error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};

let shuttingDown = false;

const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info(`Received ${signal}. Starting graceful shutdown`);

  try {
    await closeServer();
    await browserService.closeBrowser();
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error: unknown) {
    logger.error(`Shutdown error: ${formatUnknownError(error)}`);
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error(`Unhandled promise rejection: ${formatUnknownError(reason)}`);
});

process.on('uncaughtException', (error: Error) => {
  logger.error(`Uncaught exception: ${error.name}: ${error.message}`);
  void shutdown('uncaughtException');
});
