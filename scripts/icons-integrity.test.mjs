import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';

const root=process.cwd();
const imageMap=new Map([
  ['icon-192.png',192],
  ['icon-512.png',512],
  ['apple-touch-icon.png',180]
]);
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
function validatePng(filename,expectedSize){
  const data=readFileSync(join(root,'public',filename));
  assert.ok(data.length>50,filename+' must not be empty');
  assert.ok(data.subarray(0,8).equals(signature),'invalid PNG signature: '+filename);
  let offset=8, width=0,height=0,kind='',palette=false,finished=false;
  const idat=[];
  while(offset<data.length){
    assert.ok(offset+12<=data.length,'truncated chunk: '+filename);
    const length=data.readUInt32BE(offset);
    const type=data.toString('ascii',offset+4,offset+8);
    assert.ok(offset+12+length<=data.length,'invalid chunk length: '+filename);
    const bytes=data.subarray(offset+8,offset+8+length);
    if(type==='IHDR'){
      width=bytes.readUInt32BE(0);
      height=bytes.readUInt32BE(4);
      assert.equal(bytes[8],8,'only 8-bit exported icons');
      kind=bytes[9]===3?'indexed':'other';
    }
    if(type==='PLTE')palette=true;
    if(type==='IDAT')idat.push(bytes);
    offset+=12+length;
    if(type==='IEND'){finished=true;break;}
  }
  assert.ok(finished,'missing IEND');
  assert.equal(width,expectedSize,filename+' width');
  assert.equal(height,expectedSize,filename+' height');
  assert.equal(kind,'indexed','icon should use a compact PNG palette');
  assert.ok(palette,'missing palette');
  assert.ok(idat.length,'missing IDAT');
  const raw=inflateSync(Buffer.concat(idat));
  assert.equal(raw.length,expectedSize*(expectedSize+1),'incomplete decoded image: '+filename);
  for(let y=0;y<expectedSize;y++)
    assert.equal(raw[y*(expectedSize+1)],0,'unexpected PNG row filter: '+filename);
}
test('all home-screen icons are valid, correctly sized PNG files',()=>{
  for(const [file,size] of imageMap)validatePng(file,size);
});
test('manifest and HTML reference the existing exported icons',()=>{
  const manifest=JSON.parse(readFileSync(join(root,'public/site.webmanifest'),'utf8'));
  const paths=new Map(manifest.icons.map(i=>[i.src,i.sizes]));
  assert.equal(paths.get('/icon-192.png'),'192x192');
  assert.equal(paths.get('/icon-512.png'),'512x512');
  const html=readFileSync(join(root,'src/index.html'),'utf8');
  for(const token of ['/favicon.svg','/icon-192.png','/apple-touch-icon.png','/site.webmanifest'])
    assert.ok(html.includes(token),'missing HTML icon reference: '+token);
});
