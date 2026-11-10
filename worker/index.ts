import { onRequestGet as getInflation } from '../functions/api/inflation';
import { onRequestGet as getHouseholdSpending } from '../functions/api/household-spending';

/**
 * Entry point per Cloudflare Workers con Static Assets.
 * Le rotte Angular sono servite dal fallback SPA configurato in wrangler.jsonc.
 * /api/inflation usa la stessa implementazione della Pages Function.
 */
export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/inflation') {
      if (request.method !== 'GET') {
        return new Response('Method Not Allowed', {
          status: 405,
          headers: { Allow: 'GET' }
        });
      }
      return getInflation({ request });
    }
    if (pathname === '/api/household-spending') {
      if (request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET' } });
      }
      return getHouseholdSpending();
    }
    return new Response(JSON.stringify({ error: 'API_NOT_FOUND' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
};
