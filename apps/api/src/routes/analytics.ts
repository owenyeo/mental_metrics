import type { Tier } from '@sil/shared';
import type { Express, Request, Response } from 'express';

import { AnalyticsService } from '../services/analytics-service';
import type { ProjectRecord } from '../repositories/types';

function filterFromRequest(req: Request) {
  const requestedTier = req.query.tier ? String(req.query.tier) : undefined;

  return {
    from: String(req.query.from),
    to: String(req.query.to),
    tier:
      requestedTier === 'at_risk' || requestedTier === 'distressed' || requestedTier === 'unwell'
        ? (requestedTier as Tier)
        : undefined,
  };
}

export function registerAnalyticsRoutes(
  app: Express,
  analyticsService: AnalyticsService,
  resolveProject: (projectKey: string) => Promise<ProjectRecord | null>,
) {
  app.get('/v1/analytics/overview', async (req: Request, res: Response) => {
    const projectKey = req.header('x-project-key');

    if (!projectKey) {
      return res.status(401).json({ error: 'Missing project key' });
    }

    const project = await resolveProject(projectKey);

    if (!project) {
      return res.status(401).json({ error: 'Invalid project key' });
    }

    const overview = await analyticsService.getOverview(project.id, filterFromRequest(req));
    return res.json(overview);
  });

  app.get('/v1/analytics/interventions', async (req: Request, res: Response) => {
    const projectKey = req.header('x-project-key');

    if (!projectKey) {
      return res.status(401).json({ error: 'Missing project key' });
    }

    const project = await resolveProject(projectKey);

    if (!project) {
      return res.status(401).json({ error: 'Invalid project key' });
    }

    const rows = await analyticsService.getInterventions(project.id, filterFromRequest(req));
    return res.json({ items: rows });
  });
}
