import mongoose, { Schema, type Document as MongoDocument } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends MongoDocument {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true },
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password as string);
};

UserSchema.set('toJSON', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc: any, obj: any) => {
    delete obj.password;
    return obj;
  },
});

export const User = mongoose.model<IUser>('User', UserSchema);
