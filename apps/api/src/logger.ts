import pino from 'pino';

export function createLogger() {
  return pino({
    level: process.env.LOG_LEVEL ?? 'info',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers["x-project-key"]',
        'traits.email',
        'traits.phone',
        'properties.email',
        'properties.phone',
      ],
      censor: '[REDACTED]',
    },
  });
}
