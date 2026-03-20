import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { ZodError } from 'zod';

import { createLogger } from './logger';
import { registerAnalyticsRoutes } from './routes/analytics';
import { registerEventRoutes } from './routes/events';
import { registerHealthRoutes } from './routes/health';
import { AnalyticsService } from './services/analytics-service';
import { IngestionService } from './services/ingestion-service';
import type { EventRepository } from './repositories/types';

export function createApp(repository: EventRepository) {
  const app = express();
  const logger = createLogger();
  const ingestionService = new IngestionService(repository);
  const analyticsService = new AnalyticsService(repository);

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) => {
        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please retry shortly.',
        });
      },
    }),
  );
  app.use(
    pinoHttp({
      logger,
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
        }),
      },
    }),
  );

  registerHealthRoutes(app);
  registerEventRoutes(app, ingestionService);
  registerAnalyticsRoutes(app, analyticsService, (projectKey) =>
    repository.findProjectByKey(projectKey),
  );

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    logger.error({ error }, 'Unhandled API error');
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
