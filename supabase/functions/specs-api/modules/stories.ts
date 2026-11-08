import { FirestoreRestClient } from '../firebase/firestore.ts';
import { assetKey, linkedStudent, referenceId, staffRole } from './access.ts';
import type { AppConfig, AuthenticatedUser, JsonMap } from '../types.ts';

const contentFields = ['title', 'post_description', 'post_details', 'image_bucket', 'imageFileId', 'related_links', 'meaning'];

export async function storyAction(user: AuthenticatedUser, payload: JsonMap, config: AppConfig, store = new FirestoreRestClient()): Promise<JsonMap> {
  const operation = String(payload.operation || '');
  const id = typeof payload.storyId === 'string' ? payload.storyId : '';
  if (!/^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$/.test(id)) throw new Error('Invalid story ID');
  const data = payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data) ? payload.data as JsonMap : {};
  return store.runTransaction(async (tx) => {
    const account = await tx.get(config.collections.accounts, user.uid);
    if (!account) throw new Error('Application account not found');
    const studentId = linkedStudent(account) || user.uid;
    const student = await tx.get(config.collections.students, studentId);
    const existing = await tx.get(config.collections.stories, id);
    const authorId = existing ? referenceId(existing.authorId) || referenceId(existing.students) : null;
    const owner = authorId === studentId;
    const staff = staffRole(user.role);
    if (operation === 'delete') {
      if (!existing) return { success: true };
      if (!staff && !owner) throw new Error('Permission denied: this story belongs to another author');
      tx.delete(config.collections.stories, id);
      return { success: true };
    }
    if (operation === 'approve' || operation === 'reject') {
      if (!staff) throw new Error('Permission denied: only officers and administrators can review stories');
      if (!existing) throw new Error('Story not found');
      if (payload.expectedRevision !== (existing.revision || 0)) {
        throw new Error('This story changed since it was opened. Refresh and review its latest version.');
      }
      if (operation === 'reject') tx.delete(config.collections.stories, id);
      else {
        const safeStory: JsonMap = {
          ...existing, students: authorId, authorId,
          author: existing.author || (existing.authorSnapshot as JsonMap)?.name || (existing.students as JsonMap)?.name || 'SPECS Contributor',
          authorSnapshot: { id: authorId, name: (existing.authorSnapshot as JsonMap)?.name || null },
          ...(user.role === 'admin' ? { adminApproval: true, officerApproval: true, isAccepted: true } : { officerApproval: true }),
          revision: Number(existing.revision || 0), updatedAt: new Date(),
        };
        delete safeStory.studentSnapshot;
        tx.set(config.collections.stories, id, safeStory);
      }
      return { success: true };
    }
    if (!['create', 'update'].includes(operation)) throw new Error('Unsupported story operation');
    if (!staff && (!student?.is_volunteer || (operation === 'update' && !owner))) throw new Error('Permission denied: only approved volunteers can manage their own stories');
    if (operation === 'create' && existing) {
      if (!staff && !owner) throw new Error('Permission denied: this story belongs to another author');
      return { success: true, story: existing };
    }
    if (operation === 'update' && !existing) throw new Error('Story not found');
    const content = Object.fromEntries(contentFields.filter((key) => data[key] !== undefined).map((key) => [key, data[key]]));
    const story: JsonMap = { ...existing, ...content };
    for (const key of ['title', 'post_description', 'post_details']) {
      if (typeof story[key] !== 'string' || !String(story[key]).trim() || String(story[key]).length > (key === 'post_details' ? 100000 : 1000)) throw new Error(`Invalid story ${key}`);
    }
    for (const key of ['related_links', 'meaning']) {
      if (story[key] !== undefined && (!Array.isArray(story[key]) || (story[key] as unknown[]).length > 20 || (story[key] as unknown[]).some((value) => typeof value !== 'string' || value.length > 2000))) throw new Error(`Invalid story ${key}`);
    }
    for (const link of (story.related_links || []) as string[]) {
      try { if (!['http:', 'https:'].includes(new URL(link).protocol)) throw new Error(); } catch { throw new Error('Story links must use http or https'); }
    }
    const image = referenceId(data.image_bucket !== undefined ? data.image_bucket : data.imageFileId !== undefined ? data.imageFileId : existing?.image_bucket || existing?.imageFileId);
    if (image && !staff && image !== referenceId(existing?.image_bucket || existing?.imageFileId)) {
      const bucket = Deno.env.get('BUCKET_ID_HIGHLIGHT_IMAGES') || 'specs-highlights';
      const asset = await tx.get('storage_assets', await assetKey(bucket, image));
      if (!asset || asset.ownerUid !== user.uid) throw new Error('Permission denied: this cover image belongs to another author');
    }
    const canonicalAuthor = existing ? authorId : staff ? referenceId(data.students) || studentId : studentId;
    const author = canonicalAuthor === studentId ? student : canonicalAuthor ? await tx.get(config.collections.students, canonicalAuthor) : null;
    Object.assign(story, {
      students: canonicalAuthor, authorId: canonicalAuthor,
      author: author?.name || existing?.author || account.displayName || account.username || 'SPECS Contributor',
      authorSnapshot: { id: canonicalAuthor, name: author?.name || null },
      image_bucket: image, imageFileId: image,
      // Every content change starts a new review. Caller-supplied approval
      // fields and owner snapshots never determine publication or ownership.
      isAccepted: false, officerApproval: false, adminApproval: false,
      revision: Number(existing?.revision || 0) + 1,
      createdAt: existing?.createdAt || new Date(), updatedAt: new Date(),
    });
    delete story.studentSnapshot;
    tx.set(config.collections.stories, id, story);
    return { success: true, story: { ...story, $id: id } };
  });
}
