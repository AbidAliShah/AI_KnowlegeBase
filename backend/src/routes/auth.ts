import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { authenticate } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name || !email || !password) {
      return next(createError('Name, email, and password are required', 400));
    }
    if (password.length < 8) {
      return next(createError('Password must be at least 8 characters', 400));
    }
    if (!/[A-Z]/.test(password)) {
      return next(createError('Password must contain at least one uppercase letter', 400));
    }
    if (!/[0-9]/.test(password)) {
      return next(createError('Password must contain at least one number', 400));
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return next(createError('Password must contain at least one special character', 400));
    }

    const existing = await User.findOne({ email });
    if (existing) return next(createError('Email already registered', 409));

    // First registered user becomes admin
    const count = await User.countDocuments();
    const role: 'admin' | 'user' = count === 0 ? 'admin' : 'user';

    const user = await User.create({ name, email, password, role });

    // Auto-create personal workspace for new user
    const baseSlug = (name as string)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 30) || 'workspace';
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    const workspace = await Workspace.create({
      name: `${(name as string).split(' ')[0]}'s Workspace`,
      slug,
      ownerId: user._id,
    });
    await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId: user._id,
      role: 'owner',
    });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' },
    );

    return res.status(201).json({ token, user, workspace });
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return next(createError('Email and password are required', 400));
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return next(createError('Invalid credentials', 401));
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' },
    );

    return res.json({ token, user });
  } catch (err) {
    return next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.id).select('-password');
    if (!user) return next(createError('User not found', 404));
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

export default router;
