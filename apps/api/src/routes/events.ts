import type { Express, Request, Response } from 'express';

import { IngestionService } from '../services/ingestion-service';

export function registerEventRoutes(app: Express, ingestionService: IngestionService) {
  app.post('/v1/events/ingest', async (req: Request, res: Response) => {
    const projectKey = req.header('x-project-key');

    if (!projectKey) {
      return res.status(401).json({ error: 'Missing project key' });
    }

    const result = await ingestionService.ingest(projectKey, req.body);
    return res.status(result.status).json(result.body);
  });
}
