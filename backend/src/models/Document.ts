import mongoose, { Schema, type Document as MongoDocument } from 'mongoose';

export interface IDocument extends MongoDocument {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  originalName: string;
  storedName: string;
  size: number;
  mimeType: string;
  status: 'processing' | 'ready' | 'failed';
  pageCount?: number;
  chunkCount?: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      default: 'processing',
    },
    pageCount: Number,
    chunkCount: Number,
    errorMessage: String,
  },
  { timestamps: true },
);

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
