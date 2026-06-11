import mongoose, { Schema, type Document as MongoDocument } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: Date;
}

export interface IChatSession extends MongoDocument {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    sources: [String],
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ChatSessionSchema = new Schema<IChatSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    messages: [MessageSchema],
  },
  { timestamps: true },
);

export const ChatSession = mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
