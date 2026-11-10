import { parseRegionalMefCsv, REGIONAL_MEF_CSV_URL } from '../../src/app/core/mef-regional';

interface RequestContext { request:Request; }
const cacheHeaders={
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'public, max-age=600, s-maxage=43200',
  'X-Content-Type-Options':'nosniff'
};
export async function onRequestGet({request}:RequestContext):Promise<Response> {
  const u=new URL(request.url);
  if(u.pathname!=='/api/regional-rates')return new Response('Not found',{status:404});
  const edge=typeof caches!=='undefined' ? (caches as unknown as {default?:Cache}).default : undefined;
  const key=new Request(u.origin+'/api/regional-rates');
  if(edge){const cached=await edge.match(key);if(cached)return cached;}
  try{
    const upstream=await fetch(REGIONAL_MEF_CSV_URL,{
      headers:{Accept:'text/csv, text/plain;q=0.9, */*;q=0.5'},
      signal:AbortSignal.timeout(15000)
    });
    if(!upstream.ok)throw new Error('MEF HTTP '+upstream.status);
    const raw=await upstream.arrayBuffer();
    if(raw.byteLength<100 || raw.byteLength>3_000_000)throw new Error('Dimensione del CSV inattesa');
    let csv:string;
    try{csv=new TextDecoder('utf-8',{fatal:true}).decode(raw);}
    catch{csv=new TextDecoder('windows-1252').decode(raw);}
    const dataset=parseRegionalMefCsv(csv,new Date().toISOString());
    const response=new Response(JSON.stringify(dataset),{headers:cacheHeaders,status:200});
    if(edge)await edge.put(key,response.clone());
    return response;
  }catch{
    return new Response(JSON.stringify({
      error:'MEF_REGIONALE_NON_DISPONIBILE',
      message:'L’elenco MEF non è raggiungibile o il tracciato è cambiato. Non mostriamo aliquote non verificate.'
    }),{status:503,headers:{...cacheHeaders,'Cache-Control':'no-store'}});
  }
}
