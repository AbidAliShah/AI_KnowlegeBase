import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireWorkspace, requireRole, type WorkspaceRequest } from '../middleware/workspace.js';
import { createError } from '../middleware/errorHandler.js';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { User } from '../models/User.js';

const router = Router();

function makeSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 40) || `ws-${Date.now()}`
  );
}

// GET /api/workspaces — list workspaces user belongs to
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const memberships = await WorkspaceMember.find({ userId: req.user!.id });
    const workspaceIds = memberships.map((m) => m.workspaceId);
    const workspaces = await Workspace.find({ _id: { $in: workspaceIds } }).sort({ createdAt: 1 });

    const result = workspaces.map((ws) => {
      const m = memberships.find((mem) => mem.workspaceId.equals(ws._id));
      return { ...ws.toObject(), role: m?.role };
    });

    return res.json({ workspaces: result });
  } catch (err) {
    return next(err);
  }
});

// POST /api/workspaces — create new workspace
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body as { name?: string };
    if (!name || name.trim().length < 2) {
      return next(createError('Workspace name is required (min 2 chars)', 400));
    }

    let slug = makeSlug(name);
    const existing = await Workspace.findOne({ slug });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const workspace = await Workspace.create({
      name: name.trim(),
      slug,
      ownerId: req.user!.id,
    });

    await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId: req.user!.id,
      role: 'owner',
    });

    return res.status(201).json({ workspace: { ...workspace.toObject(), role: 'owner' } });
  } catch (err) {
    return next(err);
  }
});

// GET /api/workspaces/:id/members — list members
router.get(
  '/:id/members',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const membership = await WorkspaceMember.findOne({
        workspaceId: req.params['id'],
        userId: req.user!.id,
      });
      if (!membership) return next(createError('Not a member of this workspace', 403));

      const members = await WorkspaceMember.find({ workspaceId: req.params['id'] }).populate(
        'userId',
        'email name',
      );
      return res.json({ members });
    } catch (err) {
      return next(err);
    }
  },
);

// POST /api/workspaces/:id/members — invite user by email
router.post(
  '/:id/members',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { email, role } = req.body as { email?: string; role?: string };
      if (!email) return next(createError('Email is required', 400));

      const requester = await WorkspaceMember.findOne({
        workspaceId: req.params['id'],
        userId: req.user!.id,
      });
      if (!requester || !['owner', 'admin'].includes(requester.role)) {
        return next(createError('Only owners and admins can invite members', 403));
      }

      const workspace = await Workspace.findById(req.params['id']);
      if (!workspace) return next(createError('Workspace not found', 404));

      const memberCount = await WorkspaceMember.countDocuments({ workspaceId: workspace._id });
      if (memberCount >= workspace.seatLimit) {
        return next(
          createError(`Seat limit reached (${workspace.seatLimit}). Upgrade your plan.`, 402),
        );
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return next(createError('User with this email is not registered yet', 404));
      }

      const existing = await WorkspaceMember.findOne({
        workspaceId: workspace._id,
        userId: user._id,
      });
      if (existing) return next(createError('User is already a member', 409));

      const safeRole =
        role === 'admin' || role === 'viewer' || role === 'member' ? role : 'member';

      const member = await WorkspaceMember.create({
        workspaceId: workspace._id,
        userId: user._id,
        role: safeRole,
      });

      return res.status(201).json({ member });
    } catch (err) {
      return next(err);
    }
  },
);

// PATCH /api/workspaces/:id/members/:userId — change role
router.patch(
  '/:id/members/:userId',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { role } = req.body as { role?: string };
      const requester = await WorkspaceMember.findOne({
        workspaceId: req.params['id'],
        userId: req.user!.id,
      });
      if (!requester || requester.role !== 'owner') {
        return next(createError('Only the owner can change roles', 403));
      }

      const safeRole =
        role === 'admin' || role === 'viewer' || role === 'member' ? role : null;
      if (!safeRole) return next(createError('Invalid role', 400));

      const member = await WorkspaceMember.findOneAndUpdate(
        { workspaceId: req.params['id'], userId: req.params['userId'] },
        { role: safeRole },
        { new: true },
      );
      if (!member) return next(createError('Member not found', 404));
      return res.json({ member });
    } catch (err) {
      return next(err);
    }
  },
);

// DELETE /api/workspaces/:id/members/:userId — remove member
router.delete(
  '/:id/members/:userId',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const requester = await WorkspaceMember.findOne({
        workspaceId: req.params['id'],
        userId: req.user!.id,
      });
      if (!requester || !['owner', 'admin'].includes(requester.role)) {
        return next(createError('Only owners and admins can remove members', 403));
      }

      const target = await WorkspaceMember.findOne({
        workspaceId: req.params['id'],
        userId: req.params['userId'],
      });
      if (!target) return next(createError('Member not found', 404));
      if (target.role === 'owner') {
        return next(createError('Cannot remove the workspace owner', 400));
      }

      await target.deleteOne();
      return res.json({ ok: true });
    } catch (err) {
      return next(err);
    }
  },
);

// GET /api/workspaces/current — get current workspace details
router.get(
  '/current/info',
  authenticate,
  requireWorkspace,
  async (req: WorkspaceRequest, res: Response, next: NextFunction) => {
    try {
      const workspace = await Workspace.findById(req.workspaceId);
      if (!workspace) return next(createError('Workspace not found', 404));
      const memberCount = await WorkspaceMember.countDocuments({ workspaceId: workspace._id });
      return res.json({
        workspace: { ...workspace.toObject(), role: req.memberRole, memberCount },
      });
    } catch (err) {
      return next(err);
    }
  },
);

// PATCH /api/workspaces/:id — update workspace name (owner only)
router.patch(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name } = req.body as { name?: string };
      const requester = await WorkspaceMember.findOne({
        workspaceId: req.params['id'],
        userId: req.user!.id,
      });
      if (!requester || requester.role !== 'owner') {
        return next(createError('Only the owner can update the workspace', 403));
      }
      const workspace = await Workspace.findByIdAndUpdate(
        req.params['id'],
        { name: name?.trim() },
        { new: true },
      );
      return res.json({ workspace });
    } catch (err) {
      return next(err);
    }
  },
);

// Suppress unused requireRole import in case it's not referenced
void requireRole;

export default router;
