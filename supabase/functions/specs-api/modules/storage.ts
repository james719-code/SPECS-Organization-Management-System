import { createClient } from 'npm:@supabase/supabase-js@2';
import { assertString, corsHeaders } from '../http.ts';
import type { ActionResult, AuthenticatedUser, JsonMap } from '../types.ts';

const ASSET_CACHE_SECONDS = 30 * 24 * 60 * 60;

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
    return { success: true, path, userId: user.uid };
  }

  if (action === 'list') {
    const result = await supabase.storage.from(bucket).list('', { limit: 1000, offset: 0 });
    if (result.error) throw result.error;
    return { files: result.data || [], total: result.data?.length || 0, userId: user.uid };
  }

  throw new Error(`Unsupported storage action: ${action}`);
}

export async function publicAsset(request: Request, url: URL): Promise<Response> {
  const bucket = url.searchParams.get('bucket');
  const fileId = url.searchParams.get('fileId') || url.searchParams.get('path');
  if (!bucket || !fileId) return new Response('bucket and fileId are required', { status: 400 });
  const publicBuckets = (Deno.env.get('STORAGE_PUBLIC_ASSET_BUCKETS') || 'specs-events,specs-picture,specs-highlights,specs-public-files,specs-files,specs-schedule')
    .split(',').map((value) => value.trim()).filter(Boolean);
  if (!publicBuckets.includes(bucket)) return new Response('Asset bucket is not public', { status: 403 });
  const supabase = storageClient();
  const path = await resolvePath(supabase, assertBucket(bucket), fileId);
  const result = await supabase.storage.from(bucket).createSignedUrl(path, 60);
  if (result.error) return new Response(result.error.message, { status: 404 });

  // Proxy the bytes instead of redirecting to the signed URL: every signed URL
  // is unique, so a redirect gave browsers nothing stable to cache and images
  // reloaded on every visit. File ids are unique per upload, so the response
  // for a given URL never changes and can be cached for a month.
  const upstream = await fetch(result.data.signedUrl);
  if (!upstream.ok || !upstream.body) return new Response('Asset not found', { status: 404 });

  const headers = new Headers({
    'Cache-Control': `public, max-age=${ASSET_CACHE_SECONDS}, immutable`,
    'Access-Control-Allow-Origin': corsHeaders['Access-Control-Allow-Origin'],
    'X-Content-Type-Options': 'nosniff',
  });
  for (const name of ['content-type', 'content-length', 'etag', 'last-modified']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: 200, headers });
}
