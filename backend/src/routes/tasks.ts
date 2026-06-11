import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireWorkspace, type WorkspaceRequest } from '../middleware/workspace.js';
import { createError } from '../middleware/errorHandler.js';
import { Task } from '../models/Task.js';

const router = Router();

// GET /api/tasks
router.get(
  '/',
  authenticate,
  requireWorkspace,
  async (req: WorkspaceRequest, res: Response, next: NextFunction) => {
    try {
      const tasks = await Task.find({ workspaceId: req.workspaceId })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name email');
      return res.json({ tasks });
    } catch (err) {
      return next(err);
    }
  },
);

// POST /api/tasks
router.post(
  '/',
  authenticate,
  requireWorkspace,
  async (req: WorkspaceRequest, res: Response, next: NextFunction) => {
    try {
      if (req.memberRole === 'viewer') {
        return next(createError('Viewers cannot create tasks', 403));
      }
      const { title, description, priority, assignedTo, dueDate } = req.body as {
        title?: string;
        description?: string;
        priority?: 'low' | 'medium' | 'high';
        assignedTo?: string;
        dueDate?: string;
      };
      if (!title) return next(createError('Title is required', 400));

      const task = await Task.create({
        workspaceId: req.workspaceId,
        createdBy: req.user!.id,
        title,
        description,
        priority: priority ?? 'medium',
        assignedTo,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });
      return res.status(201).json({ task });
    } catch (err) {
      return next(err);
    }
  },
);

// PATCH /api/tasks/:id
router.patch(
  '/:id',
  authenticate,
  requireWorkspace,
  async (req: WorkspaceRequest, res: Response, next: NextFunction) => {
    try {
      if (req.memberRole === 'viewer') {
        return next(createError('Viewers cannot update tasks', 403));
      }
      const updates = req.body as Partial<{
        title: string;
        description: string;
        status: 'todo' | 'in_progress' | 'done';
        priority: 'low' | 'medium' | 'high';
        assignedTo: string;
        dueDate: string;
      }>;
      const task = await Task.findOneAndUpdate(
        { _id: req.params['id'], workspaceId: req.workspaceId },
        updates,
        { new: true },
      );
      if (!task) return next(createError('Task not found', 404));
      return res.json({ task });
    } catch (err) {
      return next(err);
    }
  },
);

// DELETE /api/tasks/:id
router.delete(
  '/:id',
  authenticate,
  requireWorkspace,
  async (req: WorkspaceRequest, res: Response, next: NextFunction) => {
    try {
      if (req.memberRole === 'viewer') {
        return next(createError('Viewers cannot delete tasks', 403));
      }
      const task = await Task.findOneAndDelete({
        _id: req.params['id'],
        workspaceId: req.workspaceId,
      });
      if (!task) return next(createError('Task not found', 404));
      return res.json({ ok: true });
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
