const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const tables={kml_profiles:[{user_id:'u',nickname:'회원'}],kml_larvae:[],kml_comments:[],kml_transfers:[]};
const stamp=i=>'2026-10-'+String(i).padStart(2,'0')+'T01:00:00Z';
tables.kml_adults=Array.from({length:7},(_,i)=>({id:'a'+(i+1),code:'ADULT-'+(i+1),lineage:'꼴통A',sex:'M',size:80,owner_id:'u',breeder_id:'u',created_at:stamp(i+1),updated_at:stamp(20-i),emerged:'2027-01-'+String(20-i)}));
tables.kml_lines=Array.from({length:7},(_,i)=>({id:'l'+(i+1),name:'LINE-'+(i+1),created_by:'u',created_at:stamp(i+1),updated_at:stamp(20-i),year:2030-i}));
const element={style:{setProperty(){},removeProperty(){}},addEventListener(){}};
const supa={from:name=>({select:async()=>({data:tables[name]||[]})})};
const sandbox={window:{supabase:{createClient:()=>supa},addEventListener(){}},document:{getElementById:()=>element,addEventListener(){}},setInterval(){},setTimeout(){},clearTimeout(){},location:{hash:'#/dashboard'}};
const source=fs.readFileSync(__dirname+'/../app.js','utf8').replace('  boot();',"globalThis.t={dashboard,recentlyRegistered,load:async()=>{authUser={id:'u'};role='admin';await loadRemote();return db;}};");
vm.runInNewContext(source,sandbox);const t=sandbox.t;
(async()=>{
 const db=await t.load();assert.equal(db.adults[0].createdAt,tables.kml_adults[0].created_at);assert.equal(db.lines[0].createdAt,tables.kml_lines[0].created_at);
 const before=JSON.stringify(db),html=t.dashboard();assert.equal(JSON.stringify(db),before,'Home sorting must not mutate shared data');
 for(const prefix of ['ADULT-','LINE-']){const positions=[7,6,5,4,3].map(i=>html.indexOf(prefix+i));assert.ok(positions.every(i=>i>=0));assert.deepEqual([...positions].sort((a,b)=>a-b),positions);assert.ok(!html.includes(prefix+'1')&&!html.includes(prefix+'2'));}
 assert.ok(html.includes('최근 등록된 성충')&&html.includes('최근 등록된 라인'));
 const hero=html.slice(0,html.indexOf('</section>'));assert.ok(hero.includes('data-nav="registry"'));assert.ok(hero.includes('data-nav="archive">전체 라인'));
 const mixed=[{id:'missing',updatedAt:stamp(30)},{id:'earlier',createdAt:'2026-10-01T10:00:00+09:00'},{id:'later',createdAt:'2026-10-01T02:00:00Z'}];assert.deepEqual(Array.from(t.recentlyRegistered(mixed),x=>x.id),['later','earlier','missing']);
 db.adults=[];db.lines=[];assert.ok(t.dashboard().includes('최근 등록된 라인'));
 console.log('PASS: server creation times mapped, latest five adults/lines, edits/emergence/year ignored, shared arrays unchanged, timezone ordering and both hero links.');
})().catch(error=>{console.error(error);process.exitCode=1;});
