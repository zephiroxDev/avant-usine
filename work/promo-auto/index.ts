import {BASE, BufferAPI, processPromos} from './worker.mjs';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
async function rpc(action: string, payload = {}) {
  const response = await fetch(url + '/rest/v1/rpc/au_promo_worker', {
    method: 'POST', headers: {apikey: serviceKey, Authorization: 'Bearer ' + serviceKey,
      'Content-Type': 'application/json'}, body: JSON.stringify({p_action: action, p_payload: payload}),
    signal: AbortSignal.timeout(10000)});
  if (!response.ok) throw Error('database_' + response.status);
  return response.json();
}
async function sameSecret(a: string, b: string) {
  const digest = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  const [left, right] = await Promise.all([digest(a), digest(b)]);
  let difference = 0; for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}
Deno.serve(async request => {
  if (request.method !== 'POST') return new Response('Method not allowed', {status: 405});
  const supplied = request.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
  if (!supplied) return new Response('Unauthorized', {status: 401});
  let lease: string | null = null;
  try {
    // Custom cron authentication; credentials are accessible only with service_role.
    const credentials = await rpc('credentials');
    if (!await sameSecret(supplied, credentials.cronToken)) return new Response('Unauthorized', {status: 401});
    const lock = await rpc('acquire');
    if (!lock) return Response.json({busy: true});
    lease = lock.lease;
    const state = lock.state;
    const response = await fetch(BASE + 'promo-manifest.json?automatic=1', {cache: 'no-store', signal: AbortSignal.timeout(10000)});
    if (!response.ok) throw Error('catalogue_unavailable');
    const manifest = await response.json();
    if (!Array.isArray(manifest.images) || manifest.images.length > 300) throw Error('catalogue_invalid');
    const result = await processPromos({state, manifest, api: new BufferAPI(credentials.bufferKey),
      persist: (next: unknown) => rpc('save', {lease, state: next}),
      mediaReady: async (asset: string) => {
        try {
          const media = await fetch(asset, {method: 'HEAD', signal: AbortSignal.timeout(10000)});
          return media.ok && (media.headers.get('Content-Type') || '').includes('video/mp4');
        } catch { return false; }
      }});
    await rpc('release', {lease, error: result.errors.join('; ')});
    lease = null;
    return Response.json(result, {status: result.errors.length ? 502 : 200});
  } catch {
    if (lease) { try { await rpc('release', {lease, error: 'worker_failed_check_buffer'}); } catch { /* Lease expires safely. */ } }
    return Response.json({error: 'automation_failed_no_blind_retry'}, {status: 502});
  }
});
