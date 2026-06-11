import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireWorkspace, type WorkspaceRequest } from '../middleware/workspace.js';
import { createError } from '../middleware/errorHandler.js';
import { runAction, type ActionIntent } from '../services/actionService.js';

const router = Router();

// POST /api/actions/execute
router.post(
  '/execute',
  authenticate,
  requireWorkspace,
  async (req: WorkspaceRequest, res: Response, next: NextFunction) => {
    try {
      if (req.memberRole === 'viewer') {
        return next(createError('Viewers cannot run actions', 403));
      }
      const { query, intent } = req.body as { query?: string; intent?: ActionIntent };
      if (!query || query.trim().length === 0) {
        return next(createError('Query is required', 400));
      }
      const result = await runAction(query, req.workspaceId!, req.user!.id, intent);
      return res.json({ result });
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
