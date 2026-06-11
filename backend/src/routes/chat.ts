import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { ChatSession } from '../models/ChatSession.js';
import { queryDocuments } from '../services/aiService.js';

const router = Router();

// POST /api/chat/query
router.post('/query', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { message, sessionId } = req.body as { message?: string; sessionId?: string };
    if (!message) return next(createError('Message is required', 400));

    let session;
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, userId: req.user!.id });
      if (!session) return next(createError('Session not found', 404));
    } else {
      session = await ChatSession.create({
        userId: req.user!.id,
        title: message.length > 60 ? message.substring(0, 60) + '…' : message,
        messages: [],
      });
    }

    session.messages.push({ role: 'user', content: message, timestamp: new Date() });

    const { answer, sources } = await queryDocuments(
      message,
      req.user!.id,
      session.messages.map((m) => ({ role: m.role, content: m.content })),
    );

    session.messages.push({ role: 'assistant', content: answer, sources, timestamp: new Date() });
    await session.save();

    return res.json({ sessionId: session._id, message: answer, sources });
  } catch (err) {
    return next(err);
  }
});

// GET /api/chat/sessions
router.get('/sessions', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user!.id })
      .select('title createdAt updatedAt messages')
      .sort({ updatedAt: -1 });
    return res.json({ sessions });
  } catch (err) {
    return next(err);
  }
});

// GET /api/chat/sessions/:id
router.get(
  '/sessions/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const session = await ChatSession.findOne({ _id: req.params['id'], userId: req.user!.id });
      if (!session) return next(createError('Session not found', 404));
      return res.json({ session });
    } catch (err) {
      return next(err);
    }
  },
);

// DELETE /api/chat/sessions/:id
router.delete(
  '/sessions/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const session = await ChatSession.findOneAndDelete({
        _id: req.params['id'],
        userId: req.user!.id,
      });
      if (!session) return next(createError('Session not found', 404));
      return res.json({ message: 'Session deleted' });
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
