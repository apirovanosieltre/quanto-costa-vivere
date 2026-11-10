import { HOUSEHOLD_SPENDING_2025 } from '../../src/app/core/istat-household';

/**
 * Snapshot ISTAT 2025, curato dalla pubblicazione dell'8 ottobre 2026.
 * Non interroga il servizio SDMX a ogni visita: ISTAT limita le query/IP.
 * Dati pubblici aggregati, senza dati personali.
 */
export async function onRequestGet(): Promise<Response> {
  return new Response(JSON.stringify(HOUSEHOLD_SPENDING_2025), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
