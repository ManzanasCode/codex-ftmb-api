export const env = {
  port: Number(process.env.PORT ?? 3000),
  detectionTimeoutMs: 10_000,
  requestTimeoutMs: 20_000,
};
