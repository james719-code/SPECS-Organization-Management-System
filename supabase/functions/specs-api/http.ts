import type { JsonMap } from './types.ts';

export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...headers },
  });
}

export function assertString(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

export function asPayload(body: JsonMap): JsonMap {
  const payload = body.payload;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) return payload as JsonMap;
  return Object.fromEntries(Object.entries(body).filter(([key]) => !['action', 'payload'].includes(key)));
}

export function errorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (/missing firebase|invalid firebase|id token|jwt|jws|claim|issuer|audience|unauthorized|forbidden|insufficient role|authenticated|permission/i.test(message)) return 401;
  if (/not found/i.test(message)) return 404;
  if (/already.exists/i.test(message)) return 409;
  if (/cannot|invalid|required|unsupported|only /i.test(message)) return 400;
  return 500;
}
