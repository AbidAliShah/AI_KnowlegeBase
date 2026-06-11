import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { DocumentModel } from '../models/Document.js';
import { ChatSession } from '../models/ChatSession.js';

export async function migrateUsersToWorkspaces(): Promise<void> {
  const users = await User.find();
  let migrated = 0;

  for (const user of users) {
    const existing = await WorkspaceMember.findOne({ userId: user._id });
    if (existing) continue;

    const baseSlug =
      user.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 30) || 'workspace';
    const slug = `${baseSlug}-${user._id.toString().slice(-6)}`;

    const workspace = await Workspace.create({
      name: `${user.name.split(' ')[0] ?? user.name}'s Workspace`,
      slug,
      ownerId: user._id,
    });

    await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId: user._id,
      role: 'owner',
    });

    // Backfill workspaceId on existing documents and sessions
    await DocumentModel.updateMany(
      { userId: user._id, workspaceId: { $exists: false } },
      { $set: { workspaceId: workspace._id } },
    );
    await ChatSession.updateMany(
      { userId: user._id, workspaceId: { $exists: false } },
      { $set: { workspaceId: workspace._id } },
    );

    migrated++;
  }

  if (migrated > 0) {
    console.log(`Migration: created workspaces for ${migrated} existing user(s)`);
  }
}
