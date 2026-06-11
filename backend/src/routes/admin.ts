import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { User } from '../models/User.js';
import { DocumentModel } from '../models/Document.js';
import { ChatSession } from '../models/ChatSession.js';

const router = Router();

router.use(authenticate, requireAdmin);

// GET /api/admin/stats
router.get('/stats', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [userCount, docCount, sessionCount, storageAgg] = await Promise.all([
      User.countDocuments(),
      DocumentModel.countDocuments(),
      ChatSession.countDocuments(),
      DocumentModel.aggregate([{ $group: { _id: null, total: { $sum: '$size' } } }]),
    ]);
    return res.json({
      users: userCount,
      documents: docCount,
      chatSessions: sessionCount,
      storageBytes: (storageAgg[0] as { total?: number } | undefined)?.total ?? 0,
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/admin/users
router.get('/users', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return res.json({ users });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.params['id'] === req.user!.id) {
      return next(createError('Cannot delete your own account', 400));
    }
    const user = await User.findByIdAndDelete(req.params['id']);
    if (!user) return next(createError('User not found', 404));

    await Promise.all([
      DocumentModel.deleteMany({ userId: req.params['id'] }),
      ChatSession.deleteMany({ userId: req.params['id'] }),
    ]);

    return res.json({ message: 'User deleted' });
  } catch (err) {
    return next(err);
  }
});

// GET /api/admin/documents
router.get('/documents', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const documents = await DocumentModel.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    return res.json({ documents });
  } catch (err) {
    return next(err);
  }
});

export default router;
