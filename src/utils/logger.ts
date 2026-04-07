const formatMessage = (level: string, message: string): string => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
};

export const logger = {
  info: (message: string): void => {
    console.log(formatMessage('INFO', message));
  },
  error: (message: string): void => {
    console.error(formatMessage('ERROR', message));
  },
};
