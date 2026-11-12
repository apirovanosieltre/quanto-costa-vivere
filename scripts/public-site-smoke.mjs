// Public-only HTTP smoke check. No credentials, no site modifications.
// Intentionally informational: deployment/Cloudflare can be managed outside this repo.
import {lookup} from 'node:dns/promises';
const base='https://costovita.cicioweb.app';
const records=[];
function report(name,status,details){const data={name,status,...details};records.push(data);console.log((status==='OK'?'PASS':status==='FAIL'?'FAIL':'INFO')+' '+name+' '+JSON.stringify(details));}
const signal=()=>AbortSignal.timeout(12000);
try{
  const a=await lookup(new URL(base).hostname,{all:true});
  report('dns','OK',{addresses:a.map(x=>x.address)});
}catch(error){
  report('dns','FAIL',{error:String(error)});
}
async function probe(path,kind){
  const url=base+path;
  try{
    const start=Date.now();
    const response=await fetch(url,{signal:signal(),redirect:'follow',headers:{'user-agent':'QuantoCostaViverePublicSmoke/1.0'}});
    const buffer=Buffer.from(await response.arrayBuffer());
    const str=(kind==='png'?'':buffer.toString('utf8'));
    const detail={status:response.status,url:response.url,type:response.headers.get('content-type'),bytes:buffer.length,elapsedMs:Date.now()-start};
    let valid=response.status===200;
    if(kind==='html')valid&&=str.includes('<app-root')&&str.includes('QuantoCostaVivere');
    if(kind==='robots')valid&&=str.includes('Sitemap:')&&!/^Disallow:\s*\/$/mi.test(str);
    if(kind==='sitemap'){
      const urls=[...str.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
      detail.urls=urls.length;
      valid&&=urls.length>=10&&urls.every(u=>u.startsWith(base));
    }
    if(kind==='svg')valid&&=str.includes('<svg');
    if(kind==='manifest'){
      const j=JSON.parse(str); detail.name=j.name; detail.icons=j.icons?.map(i=>i.src);
      valid&&=j.name==='QuantoCostaVivere'&&j.icons?.length>=2;
    }
    if(kind==='png'){
      const sig=Buffer.from([137,80,78,71,13,10,26,10]);
      detail.width=buffer.length>23?buffer.readUInt32BE(16):null;
      detail.height=buffer.length>23?buffer.readUInt32BE(20):null;
      const required=path.includes('512')?512:path.includes('192')?192:180;
      valid&&=buffer.length>24&&buffer.subarray(0,8).equals(sig)&&detail.width===required&&detail.height===required;
    }
    if(kind==='json'){
      valid&&=(detail.type??'').includes('json');
      if(valid){const j=JSON.parse(str);detail.keys=Object.keys(j).slice(0,10);}
    }
    report(path,valid?'OK':'FAIL',detail);
  }catch(error){report(path,'FAIL',{error:String(error)});}
}
for(const [path,kind] of [
 ['/', 'html'],
 ['/confronta-citta','html'],
 ['/sitemap.xml','sitemap'],
 ['/robots.txt','robots'],
 ['/site.webmanifest','manifest'],
 ['/favicon.svg','svg'],
 ['/icon-192.png','png'],
 ['/icon-512.png','png'],
 ['/apple-touch-icon.png','png'],
 ['/api/household-spending','json']
])await probe(path,kind);
const ok=records.filter(x=>x.status==='OK').length,fail=records.filter(x=>x.status==='FAIL').length;
console.log('RESULT '+JSON.stringify({checked:records.length,ok,fail}));
if(fail)console.log('NOTE GitHub CI build success is NOT proof that Cloudflare live endpoints work.');
// Audit is always informational, so a temporary DNS outage does not block unrelated merges.
