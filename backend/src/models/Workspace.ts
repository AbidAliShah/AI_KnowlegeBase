import mongoose, { Schema, type Document as MongoDocument } from 'mongoose';

export type WorkspacePlan = 'free' | 'team' | 'business' | 'enterprise';

export interface IWorkspace extends MongoDocument {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  ownerId: mongoose.Types.ObjectId;
  plan: WorkspacePlan;
  seatLimit: number;
  documentLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: String, enum: ['free', 'team', 'business', 'enterprise'], default: 'free' },
    seatLimit: { type: Number, default: 3 },
    documentLimit: { type: Number, default: 50 },
  },
  { timestamps: true },
);

export const Workspace = mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);
