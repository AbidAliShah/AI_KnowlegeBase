import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import { authenticate } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { DocumentModel } from '../models/Document.js';
import { ingestPDF } from '../services/aiService.js';

const router = Router();

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    await fs.mkdir('uploads', { recursive: true });
    cb(null, 'uploads');
  },
  filename: (_req, _file, cb) => {
    cb(null, `${Date.now()}-${Math.random().toString(36).substring(2)}.pdf`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// POST /api/documents/upload
router.post(
  '/upload',
  authenticate,
  upload.single('file'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) return next(createError('No file uploaded', 400));

      const doc = await DocumentModel.create({
        userId: req.user!.id,
        originalName: req.file.originalname,
        storedName: req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype,
        status: 'processing',
      });

      // Process asynchronously so response is immediate
      ingestPDF(req.file.path, req.user!.id, doc._id.toString())
        .then(({ pageCount, chunkCount }) =>
          DocumentModel.findByIdAndUpdate(doc._id, { status: 'ready', pageCount, chunkCount }),
        )
        .catch(async (err: Error) => {
          await DocumentModel.findByIdAndUpdate(doc._id, {
            status: 'failed',
            errorMessage: err.message,
          });
        });

      return res.status(201).json({ document: doc });
    } catch (err) {
      return next(err);
    }
  },
);

// GET /api/documents
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const docs = await DocumentModel.find({ userId: req.user!.id }).sort({ createdAt: -1 });
    return res.json({ documents: docs });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/documents/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const doc = await DocumentModel.findOne({ _id: req.params['id'], userId: req.user!.id });
    if (!doc) return next(createError('Document not found', 404));

    await fs.unlink(`uploads/${doc.storedName}`).catch(() => undefined);
    await doc.deleteOne();

    return res.json({ message: 'Document deleted' });
  } catch (err) {
    return next(err);
  }
});

export default router;
