import { INFLATION_SOURCE_URL, parseLatestItalianInflation } from '../../src/app/core/eurostat';

/** Cloudflare Pages Function. Il backend non riceve dati fiscali o di budget dell'utente. */
interface RequestContext { request: Request; }
const TTL_SECONDS = 6 * 60 * 60;
const responseHeaders = {
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':`public, max-age=600, s-maxage=${TTL_SECONDS}`,
  'X-Content-Type-Options':'nosniff'
};

export async function onRequestGet({ request }: RequestContext): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== '/api/inflation') return new Response('Not found',{status:404});
  const edgeCache = typeof caches !== 'undefined' ? (caches as unknown as { default?: Cache }).default : undefined;
  const cacheKey = new Request(url.origin + '/api/inflation', { method: 'GET' });
  if (edgeCache) {
    const hit = await edgeCache.match(cacheKey);
    if (hit) return hit;
  }
  try {
    const result = await fetch(INFLATION_SOURCE_URL, { headers:{ Accept:'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!result.ok) throw new Error(`Sorgente Eurostat HTTP ${result.status}`);
    const json: unknown = await result.json();
    const normalized = parseLatestItalianInflation(json,new Date().toISOString());
    const response = new Response(JSON.stringify(normalized), { status:200, headers:responseHeaders });
    if (edgeCache) await edgeCache.put(cacheKey, response.clone());
    return response;
  } catch {
    return new Response(JSON.stringify({ error:'DATI_NON_DISPONIBILI', message:'Eurostat non è raggiungibile. Non vengono mostrati dati sostitutivi.' }),
      { status:503, headers:{ ...responseHeaders,'Cache-Control':'no-store' } });
  }
}
