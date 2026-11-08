import { createClient } from 'npm:@supabase/supabase-js@2';
import { assertString, corsHeaders } from '../http.ts';
import type { ActionResult, AuthenticatedUser, JsonMap } from '../types.ts';
import { FirestoreRestClient } from '../firebase/firestore.ts';
import { assetKey, linkedStudent, staffRole } from './access.ts';

const ASSET_URL_SECONDS = 3600;
const ASSET_REDIRECT_SECONDS = 300;
const ASSET_EXPIRY_MARGIN_SECONDS = 60;
const MAX_ASSET_URLS = 500;
// Public buckets have permanent URLs, so the redirect itself can be cached for a day. File IDs are
// unique and never overwritten, which makes the target stable.
const PUBLIC_ASSET_REDIRECT_SECONDS = 24 * 60 * 60;
const BUCKET_VISIBILITY_SECONDS = 10 * 60;
// Warm isolates reuse the same Storage URL so requests share a CDN cache key.
// This is an optimization only: cold starts can safely issue a new signed URL.
const assetUrls = new Map<string, { url: string; bucket: string; path: string; expiresAt: number; redirectSeconds: number; fixed: boolean }>();
const bucketVisibility = new Map<string, { isPublic: boolean; checkedAt: number }>();

// A bucket marked public in Supabase is served from stable /object/public/ URLs, which the Storage CDN
// and browsers can cache for as long as the object's cacheControl allows. Private buckets keep signed URLs.
async function isPublicBucket(supabase: ReturnType<typeof storageClient>, bucket: string): Promise<boolean> {
  const known = bucketVisibility.get(bucket);
  if (known && Date.now() - known.checkedAt < BUCKET_VISIBILITY_SECONDS * 1000) return known.isPublic;
  const result = await supabase.storage.getBucket(bucket);
  const isPublic = !result.error && result.data?.public === true;
  bucketVisibility.set(bucket, { isPublic, checkedAt: Date.now() });
  return isPublic;
}

function storageClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase Storage secrets are not configured');
  return createClient(url, key);
}

function assertBucket(bucket: string): string {
  const allowed = (Deno.env.get('STORAGE_ALLOWED_BUCKETS') || '').split(',').map((value) => value.trim()).filter(Boolean);
  if (allowed.length && !allowed.includes(bucket)) throw new Error('Storage bucket is not allowed');
  return bucket;
}

function assertPath(path: string): string {
  const normalized = path.trim().replace(/^\/+|\/+$/g, '');
  if (!normalized || normalized.includes('..')) throw new Error('Invalid storage path');
  return normalized;
}

async function resolvePath(supabase: ReturnType<typeof storageClient>, bucket: string, pathOrFileId: string): Promise<string> {
  const path = assertPath(pathOrFileId);
  if (path.includes('/')) return path;
  const result = await supabase.storage.from(bucket).list(path, { limit: 1, offset: 0 });
  if (result.error) throw result.error;
  const file = result.data?.find((entry) => entry.name && entry.name !== '.emptyFolderPlaceholder');
  if (!file) throw new Error(`Storage file not found: ${path}`);
  return `${path}/${file.name}`;
}

const publicBuckets = () => (Deno.env.get('STORAGE_PUBLIC_ASSET_BUCKETS') || 'specs-events,specs-picture,specs-highlights,specs-public-files,specs-files,specs-schedule').split(',').map((value) => value.trim()).filter(Boolean);

export async function storageAction(user: AuthenticatedUser, body: JsonMap, store?: FirestoreRestClient): Promise<ActionResult> {
  const database = () => store ??= new FirestoreRestClient();
  const supabase = storageClient();
  const bucket = assertBucket(assertString(body.bucket, 'bucket'));
  const action = String(body.action || 'download');
  const staff = staffRole(user.role);
  if (!staff && user.role !== 'student') throw new Error('Permission denied for storage');
  if (action === 'list' && !staff) throw new Error('Permission denied: only officers and administrators can list storage');
  if (action === 'list') {
    const result = await supabase.storage.from(bucket).list('', { limit: 1000, offset: 0 });
    if (result.error) throw result.error;
    return { files: result.data || [], total: result.data?.length || 0, userId: user.uid };
  }
  const requestedPath = assertPath(assertString(body.path || body.fileId, 'path'));
  const fileId = requestedPath.split('/')[0];
  if (!/^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$/.test(fileId)) throw new Error('Invalid file ID');
  const key = await assetKey(bucket, fileId);
  let asset: JsonMap | null = null;
  if (!staff && (action === 'delete' || (action === 'download' && !publicBuckets().includes(bucket)))) {
    try { asset = await database().get('storage_assets', key); } catch (error) {
      if (!String(error).includes('Firestore 404:')) throw error;
    }
    if (!asset || asset.ownerUid !== user.uid || (requestedPath.includes('/') && requestedPath !== asset.path)) {
      throw new Error('Permission denied: this file does not belong to your account');
    }
  }

  if (action === 'download') {
    const path = asset ? String(asset.path) : await resolvePath(supabase, bucket, requestedPath);
    const expiresIn = Math.min(Math.max(Number(body.expiresIn ?? 300), 60), 3600);
    const result = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (result.error) throw result.error;
    return { url: result.data.signedUrl, path, expiresIn, userId: user.uid };
  }

  if (action === 'upload') {
    const path = assertPath(requestedPath);
    if (path.split('/').length !== 2) throw new Error('Invalid upload path');
    if (!staff) {
      if (bucket !== (Deno.env.get('BUCKET_ID_HIGHLIGHT_IMAGES') || 'specs-highlights')) throw new Error('Permission denied: students may upload their story covers only');
      const account = await database().get(Deno.env.get('COLLECTION_ID_ACCOUNTS') || 'accounts', user.uid);
      const studentId = linkedStudent(account);
      const student = studentId ? await database().get(Deno.env.get('COLLECTION_ID_STUDENTS') || 'students', studentId) : null;
      if (student?.is_volunteer !== true) throw new Error('Permission denied: only approved volunteers can upload story covers');
    }
    // Do not let a new caller claim the folder of an unattributed legacy file.
    const folder = await supabase.storage.from(bucket).list(fileId, { limit: 1, offset: 0 });
    if (folder.error) throw folder.error;
    if (folder.data?.length) throw new Error('File ID already exists; upload with a new file ID');
    await database().runTransaction(async (tx) => {
      if (await tx.get('storage_assets', key)) throw new Error('File ID is already reserved; upload with a new file ID');
      tx.set('storage_assets', key, { bucket, fileId, path, ownerUid: user.uid, createdAt: new Date() });
    });
    const result = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (result.error) throw result.error;
    return { path, token: result.data.token, userId: user.uid };
  }

  if (action === 'delete') {
    const path = asset ? String(asset.path) : await resolvePath(supabase, bucket, requestedPath);
    const result = await supabase.storage.from(bucket).remove([path]);
    if (result.error) throw result.error;
    for (const [key, cached] of assetUrls) {
      if (cached.bucket === bucket && cached.path === path) {
        assetUrls.delete(key);
      }
    }
    return { success: true, path, userId: user.uid };
  }

  throw new Error(`Unsupported storage action: ${action}`);
}

export async function publicAsset(_request: Request, url: URL): Promise<Response> {
  const bucket = url.searchParams.get('bucket');
  const fileId = url.searchParams.get('fileId') || url.searchParams.get('path');
  if (!bucket || !fileId) return new Response('bucket and fileId are required', { status: 400 });
  const publicBuckets = (Deno.env.get('STORAGE_PUBLIC_ASSET_BUCKETS') || 'specs-events,specs-picture,specs-highlights,specs-public-files,specs-files,specs-schedule')
    .split(',').map((value) => value.trim()).filter(Boolean);
  if (!publicBuckets.includes(bucket)) return new Response('Asset bucket is not public', { status: 403 });
  assertBucket(bucket);
  const key = JSON.stringify([bucket, assertPath(fileId)]);
  let cached = assetUrls.get(key);
  if (!cached || cached.expiresAt - Date.now() <= (cached.fixed ? 0 : ASSET_EXPIRY_MARGIN_SECONDS * 1000)) {
    assetUrls.delete(key);
    const supabase = storageClient();
    const path = await resolvePath(supabase, bucket, fileId);
    if (await isPublicBucket(supabase, bucket)) {
      cached = {
        url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl, bucket, path,
        expiresAt: Date.now() + PUBLIC_ASSET_REDIRECT_SECONDS * 1000, redirectSeconds: PUBLIC_ASSET_REDIRECT_SECONDS, fixed: true,
      };
    } else {
      // Start the lifetime before signing so network latency cannot extend it.
      const expiresAt = Date.now() + ASSET_URL_SECONDS * 1000;
      const result = await supabase.storage.from(bucket).createSignedUrl(path, ASSET_URL_SECONDS);
      if (result.error) return new Response('Asset not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
      cached = { url: result.data.signedUrl, bucket, path, expiresAt, redirectSeconds: ASSET_REDIRECT_SECONDS, fixed: false };
    }
    if (assetUrls.size >= MAX_ASSET_URLS) assetUrls.delete(assetUrls.keys().next().value!);
    assetUrls.set(key, cached);
  }

  // Keep file bytes on Storage's CDN instead of sending them through Functions
  // too. Cache the redirect for less than the remaining signed URL lifetime.
  const maxAge = Math.max(0, Math.min(cached.redirectSeconds,
    Math.floor((cached.expiresAt - Date.now()) / 1000) - (cached.fixed ? 0 : ASSET_EXPIRY_MARGIN_SECONDS)));
  return new Response(null, { status: 307, headers: {
    Location: cached.url,
    'Cache-Control': `public, max-age=${maxAge}, must-revalidate`,
    'Access-Control-Allow-Origin': corsHeaders['Access-Control-Allow-Origin'],
    'X-Content-Type-Options': 'nosniff',
  } });
}
