import { createClient } from 'npm:@supabase/supabase-js@2';
import { assertString, corsHeaders } from '../http.ts';
import type { ActionResult, AuthenticatedUser, JsonMap } from '../types.ts';

const ASSET_URL_SECONDS = 3600;
const ASSET_REDIRECT_SECONDS = 300;
const ASSET_EXPIRY_MARGIN_SECONDS = 60;
const MAX_ASSET_URLS = 500;
// Warm isolates reuse the same Storage URL so requests share a CDN cache key.
// This is an optimization only: cold starts can safely issue a new signed URL.
const assetUrls = new Map<string, { url: string; bucket: string; path: string; expiresAt: number }>();

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

export async function storageAction(user: AuthenticatedUser, body: JsonMap): Promise<ActionResult> {
  const supabase = storageClient();
  const bucket = assertBucket(assertString(body.bucket, 'bucket'));
  const requestedPath = assertString(body.path || body.fileId, 'path');
  const action = String(body.action || 'download');

  if (action === 'download') {
    const path = await resolvePath(supabase, bucket, requestedPath);
    const expiresIn = Math.min(Math.max(Number(body.expiresIn ?? 300), 60), 3600);
    const result = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (result.error) throw result.error;
    return { url: result.data.signedUrl, path, expiresIn, userId: user.uid };
  }

  if (action === 'upload') {
    const path = assertPath(requestedPath);
    const result = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (result.error) throw result.error;
    return { path, token: result.data.token, userId: user.uid };
  }

  if (action === 'delete') {
    const path = await resolvePath(supabase, bucket, requestedPath);
    const result = await supabase.storage.from(bucket).remove([path]);
    if (result.error) throw result.error;
    for (const [key, cached] of assetUrls) {
      if (cached.bucket === bucket && cached.path === path) {
        assetUrls.delete(key);
      }
    }
    return { success: true, path, userId: user.uid };
  }

  if (action === 'list') {
    const result = await supabase.storage.from(bucket).list('', { limit: 1000, offset: 0 });
    if (result.error) throw result.error;
    return { files: result.data || [], total: result.data?.length || 0, userId: user.uid };
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
  if (!cached || cached.expiresAt - Date.now() <= ASSET_EXPIRY_MARGIN_SECONDS * 1000) {
    assetUrls.delete(key);
    const supabase = storageClient();
    const path = await resolvePath(supabase, bucket, fileId);
    // Start the lifetime before signing so network latency cannot extend it.
    const expiresAt = Date.now() + ASSET_URL_SECONDS * 1000;
    const result = await supabase.storage.from(bucket).createSignedUrl(path, ASSET_URL_SECONDS);
    if (result.error) return new Response('Asset not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
    cached = { url: result.data.signedUrl, bucket, path, expiresAt };
    if (assetUrls.size >= MAX_ASSET_URLS) assetUrls.delete(assetUrls.keys().next().value!);
    assetUrls.set(key, cached);
  }

  // Keep file bytes on Storage's CDN instead of sending them through Functions
  // too. Cache the redirect for less than the remaining signed URL lifetime.
  const maxAge = Math.max(0, Math.min(ASSET_REDIRECT_SECONDS,
    Math.floor((cached.expiresAt - Date.now()) / 1000) - ASSET_EXPIRY_MARGIN_SECONDS));
  return new Response(null, { status: 307, headers: {
    Location: cached.url,
    'Cache-Control': `public, max-age=${maxAge}, must-revalidate`,
    'Access-Control-Allow-Origin': corsHeaders['Access-Control-Allow-Origin'],
    'X-Content-Type-Options': 'nosniff',
  } });
}
