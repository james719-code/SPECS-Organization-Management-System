import { firebaseAccessToken } from './serviceAccount.ts';

Deno.test('coalesces 300 token requests and recovers after a failed refresh', async () => {
  const keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const exported = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keys.privateKey));
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...exported)).match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----`;
  const originalAccount = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
  const originalProject = Deno.env.get('FIREBASE_PROJECT_ID');
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  let calls = 0;
  let fail = false;
  try {
    Deno.env.set('FIREBASE_PROJECT_ID', 'demo-specs-auth');
    Deno.env.set('FIREBASE_SERVICE_ACCOUNT_JSON', JSON.stringify({ project_id: 'demo-specs-auth', client_email: 'fixture@demo-specs-auth.iam.gserviceaccount.com', private_key: pem }));
    globalThis.fetch = async (input) => {
      if (String(input) !== 'https://oauth2.googleapis.com/token') throw new Error('Unexpected network request');
      calls++;
      await Promise.resolve();
      return new Response(JSON.stringify(fail ? { error: 'fixture-refresh-failure' } : { access_token: `fixture-token-${calls}`, expires_in: 3600 }), { status: fail ? 503 : 200 });
    };
    const cold = await Promise.all(Array.from({ length: 300 }, () => firebaseAccessToken()));
    if (Number(calls) !== 1 || cold.some((token) => token !== 'fixture-token-1')) throw new Error('Cold requests were not coalesced');
    const future = originalNow() + 4_000_000;
    Date.now = () => future;
    fail = true;
    const failed = await Promise.allSettled(Array.from({ length: 300 }, () => firebaseAccessToken()));
    if (Number(calls) !== 2 || failed.some((result) => result.status !== 'rejected')) throw new Error('Failed refresh was not shared');
    fail = false;
    const retried = await Promise.all(Array.from({ length: 300 }, () => firebaseAccessToken()));
    if (Number(calls) !== 3 || retried.some((token) => token !== 'fixture-token-3')) throw new Error('A failed refresh prevented recovery');
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
    if (originalAccount === undefined) Deno.env.delete('FIREBASE_SERVICE_ACCOUNT_JSON'); else Deno.env.set('FIREBASE_SERVICE_ACCOUNT_JSON', originalAccount);
    if (originalProject === undefined) Deno.env.delete('FIREBASE_PROJECT_ID'); else Deno.env.set('FIREBASE_PROJECT_ID', originalProject);
  }
});
