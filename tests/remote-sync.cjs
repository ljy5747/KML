const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const clone=x=>JSON.parse(JSON.stringify(x));
const names=['kml_profiles','kml_adults','kml_lines','kml_larvae','kml_comments','kml_transfers'];
const versioned=new Set(names.slice(1,4));
const stamp=i=>'2026-11-17T01:00:'+String(i).padStart(2,'0')+'+00:00';
const tables={kml_profiles:[{user_id:'u',nickname:'회원',avatar_url:'photo'.repeat(30000)}],kml_adults:[{id:'a',code:'A',updated_at:stamp(1),size:80,photo_url:'image'.repeat(200000)}],kml_lines:[{id:'l',name:'L',updated_at:stamp(1)}],kml_larvae:Array.from({length:1201},(_,i)=>({id:'v'+String(i).padStart(4,'0'),line_id:'l',number:i+1,size:null,updated_at:stamp(1)})),kml_comments:[],kml_transfers:[]};
let labels=[{user_id:'other',nickname:'다른 회원',avatar_url:'small'}],queries=[],rpcCalls=[],fail='',hold=null;
const supa={from:name=>({select:()=>{
 let ids=null;const query={order:()=>query,in:(_key,list)=>(ids=Array.from(list),query),range:async(from,to)=>{
  queries.push({name,ids,from,to});if(hold){const gate=hold;hold=null;await gate;}
  if(fail===name)return {error:{message:'offline'}};
  const key=name==='kml_profiles'?'user_id':'id';
  return {data:clone(tables[name].filter(x=>!ids||ids.includes(x.id)).sort((a,b)=>a[key].localeCompare(b[key])).slice(from,to+1))};
 }};return query;
}}),rpc:async(name,args)=>{
 rpcCalls.push(name);if(name==='kml_visible_breeder_labels')return {data:clone(labels)};
 assert.equal(name,'kml_sync_manifest');
 const versions={},rows={};for(const table of names){
  const content=versioned.has(table)?tables[table].map(x=>[x.id,x.updated_at]):[tables[table],table==='kml_profiles'?labels:[]];
  versions[table]=crypto.createHash('md5').update(JSON.stringify(content)).digest('hex');
  if(versioned.has(table)&&versions[table]!==args.p_known[table])rows[table]=clone(content);
 }
 return {data:{schema:1,versions,rows}};
}};
const el={style:{setProperty(){},removeProperty(){}},addEventListener(){}};
const sandbox={window:{supabase:{createClient:()=>supa},addEventListener(){}},document:{getElementById:()=>el,addEventListener(){}},setInterval(){},setTimeout(){},clearTimeout(){},location:{hash:'#/dashboard'}};
const source=fs.readFileSync(__dirname+'/../app.js','utf8').replace('  boot();',"globalThis.t={loadRemote,resetRemoteSnapshot,setUser:(id,r='admin')=>{authUser=id?{id}:null;role=r;},get:()=>db};");
vm.runInNewContext(source,sandbox);const t=sandbox.t;
(async()=>{
 t.setUser('u');await t.loadRemote();assert.equal(t.get().larvae.length,1201,'all pages, including beyond 1,000');
 assert.equal(queries.filter(x=>x.name==='kml_larvae').length,3);
 queries=[];await t.loadRemote();assert.ok(!queries.some(x=>versioned.has(x.name)),'first manifest must reuse initial specimen rows');
 queries=[];rpcCalls=[];assert.equal(await t.loadRemote(),false);assert.equal(queries.length,0);assert.deepEqual(rpcCalls,['kml_sync_manifest']);
 tables.kml_adults[0].code='Edited in BeetleLog';tables.kml_adults[0].updated_at=stamp(2);
 tables.kml_larvae.shift();tables.kml_larvae[0].records=[{weight:25}];tables.kml_larvae[0].updated_at=stamp(3);
 tables.kml_larvae.push({id:'new',line_id:'l',number:2000,updated_at:stamp(4),size:null});
 queries=[];await t.loadRemote();assert.equal(t.get().adults[0].code,'Edited in BeetleLog');
 assert.ok(!t.get().larvae.some(x=>x.id==='v0000'));assert.equal(t.get().larvae.find(x=>x.id==='v0001').records[0].weight,25);
 assert.deepEqual(queries.find(x=>x.name==='kml_adults').ids,['a']);assert.deepEqual(queries.find(x=>x.name==='kml_larvae').ids.sort(),['new','v0001']);
 assert.equal(queries.length,2,'only changed/new records downloaded');
 queries=[];tables.kml_adults=[];await t.loadRemote();assert.equal(t.get().adults.length,0);assert.equal(queries.length,0,'deletion needs no full download');
 const before=JSON.stringify(t.get());tables.kml_lines[0].name='Edited';tables.kml_lines[0].updated_at=stamp(5);tables.kml_comments.push({id:'c',body:'new',created_at:stamp(5)});fail='kml_comments';
 await assert.rejects(t.loadRemote(),/offline/);assert.equal(JSON.stringify(t.get()),before,'partial failures cannot replace database');
 fail='';await t.loadRemote();assert.equal(t.get().lines[0].name,'Edited');assert.equal(t.get().comments.length,1,'failed request is retryable');
 t.resetRemoteSnapshot();t.setUser('u','member');await t.loadRemote();await t.loadRemote();
 labels[0].nickname='새 닉네임';rpcCalls=[];await t.loadRemote();assert.equal(t.get().members.find(x=>x.id==='other').nickname,'새 닉네임');assert.ok(rpcCalls.includes('kml_visible_breeder_labels'));
 rpcCalls=[];await t.loadRemote();assert.deepEqual(rpcCalls,['kml_sync_manifest'],'unchanged breeder photos are not downloaded');
 t.resetRemoteSnapshot();let release;hold=new Promise(resolve=>release=resolve);const pending=t.loadRemote();await new Promise(resolve=>setImmediate(resolve));
 const same=t.get();t.setUser(null);t.resetRemoteSnapshot();t.setUser('u','member');release();await pending;assert.equal(t.get(),same,'late responses do not overwrite another session');
 t.setUser('new-user');queries=[];await Promise.all([t.loadRemote(),t.loadRemote()]);assert.equal(queries.filter(x=>x.name==='kml_larvae'&&!x.ids).length,3,'concurrent initial loads are serialized');
 const life=fs.readFileSync(__dirname+'/../src/core/lifecycle.js','utf8');assert.ok(life.includes('},30000)'));assert.ok(life.includes('document.hidden'));
 console.log('PASS: paginated initial load, unchanged metadata-only refresh, row deltas, deletions, atomic retry, breeder photo cache, account isolation and serialized refresh.');
})().catch(error=>{console.error(error);process.exitCode=1;});
