import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';
import { WorkspaceMember, type MemberRole } from '../models/WorkspaceMember.js';
import { createError } from './errorHandler.js';

export interface WorkspaceRequest extends AuthRequest {
  workspaceId?: string;
  memberRole?: MemberRole;
}

export async function requireWorkspace(
  req: WorkspaceRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string | undefined) ?? '';
    if (!workspaceId) {
      return next(createError('Missing X-Workspace-Id header', 400));
    }
    if (!req.user) return next(createError('Unauthorized', 401));

    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: req.user.id,
    });

    if (!membership) {
      return next(createError('You are not a member of this workspace', 403));
    }

    req.workspaceId = workspaceId;
    req.memberRole = membership.role;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowed: MemberRole[]) {
  return (req: WorkspaceRequest, _res: Response, next: NextFunction): void => {
    if (!req.memberRole || !allowed.includes(req.memberRole)) {
      return next(createError(`Requires role: ${allowed.join(' or ')}`, 403));
    }
    next();
  };
}
