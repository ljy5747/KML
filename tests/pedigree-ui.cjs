const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../app.js','utf8').replace('  boot();','  globalThis.test={pedigree,pedCell,linePairPedigree,setDb:x=>db=x};');
const el={style:{setProperty(){},removeProperty(){}},addEventListener(){}};
const sandbox={window:{addEventListener(){}},document:{getElementById:()=>el,addEventListener(){}},location:{hash:'#/adults'},setInterval(){},setTimeout(){},clearTimeout(){}};
vm.runInNewContext(source,sandbox);const t=sandbox.test;
const adults=[
 {id:'child',father:'father',mother:'mother',sex:'M'},
 {id:'father',father:'ff',mother:'fm',sex:'M'},
 {id:'mother',father:'mf',mother:'mm',sex:'F'},
 {id:'ff',father:'great-grandparent',sex:'M'},
 {id:'fm',sex:'F'},{id:'mf',sex:'M'},{id:'mm',sex:'F'},
 {id:'great-grandparent',sex:'M'}
].map(x=>({...x,code:x.id==='great-grandparent'?'NOT-DISPLAYED-GREAT':x.id.toUpperCase(),lineage:'기존 YG',generation:'F2',size:'80.0',breeder:'breeder',status:x.id==='fm'?'사망':'보유'}));
const db={members:[{id:'breeder',nickname:'브리더 <A>',avatar_url:'https://example.com/breeder.jpg'}],adults};t.setDb(db);
let html=t.pedigree(adults[0]);
assert.equal((html.match(/class="p-body"/g)||[]).length,3);
assert.equal((html.match(/class="p-cell /g)||[]).length,7);
assert.equal((html.match(/src="https:\/\/example.com\/breeder.jpg"/g)||[]).length,7);
assert.ok(html.includes('브리더 &lt;A&gt;')&&!html.includes('브리더 <A>'));
assert.ok(html.includes('기존 YG · F2'),'Stored bloodlines must remain unchanged.');
assert.ok(!html.includes('NOT-DISPLAYED-GREAT'));
assert.ok(!html.includes('class="p-head"')&&!html.includes('현재 개체')&&!html.includes('<b>혈통</b>'));
assert.ok(html.includes('data-nav="adult/fm"')&&html.includes('dead-record'));
assert.equal((html.match(/<div/g)||[]).length,5,'Only the scroll, grid and columns use divs; button content stays phrasing content.');
db.members[0].avatar_url='';html=t.pedigree(adults[0]);assert.ok(!html.includes('<img'));assert.ok(html.includes('class="mini-avatar"'));
db.adults=db.adults.filter(x=>x.id!=='mf');html=t.pedigree(adults[0]);assert.equal((html.match(/class="p-cell /g)||[]).length,7);assert.ok(html.includes('missing m'));
assert.ok(t.pedCell('child','M').includes('꼴통A')===false);
console.log('PASS: three pedigree generations, seven slots, correct breeder photos and initials, escaped names, missing ancestors, death state, navigation and preserved bloodlines.');

const pairAdults=[
 {id:'RM',sex:'M',father:'MP',mother:'MQ'},{id:'RF',sex:'F',father:'FP',mother:'FQ'},
 {id:'MP',sex:'M',father:'MPP',mother:'MPQ'},{id:'MQ',sex:'F',father:'MQP',mother:'MQQ'},
 {id:'FP',sex:'M',father:'FPP',mother:'FPQ'},{id:'FQ',sex:'F',father:'FQP',mother:'FQQ'},
 ...['MPP','MPQ','MQP','MQQ','FPP','FPQ','FQP','FQQ'].map((id,i)=>({id,sex:i%2?'F':'M',father:'OUTSIDE'})),
 {id:'OUTSIDE',sex:'M'}
].map(x=>({...x,code:'CODE-'+x.id,lineage:'꼴통A',generation:'F3',size:0,breeder:'b'}));
t.setDb({adults:pairAdults,members:[{id:'b',nickname:'이름 <A>',initial:'이'}]});
html=t.linePairPedigree({father:'RM',mother:'RF'});
assert.equal((html.match(/<td/g)||[]).length,14);assert.equal((html.match(/rowspan="4"/g)||[]).length,2);assert.equal((html.match(/rowspan="2"/g)||[]).length,4);
assert.equal((html.match(/class="line-pedigree-photo"/g)||[]).length,2);
const branches=html.split('<tr class="line-pedigree-branch-female">');const maleBranch=branches[0],femaleBranch=branches.slice(1).join('');
for(const id of ['RM','MP','MQ','MPP','MPQ','MQP','MQQ']){assert.ok(maleBranch.includes('CODE-'+id+'<'));assert.ok(!femaleBranch.includes('CODE-'+id+'<'));}
for(const id of ['RF','FP','FQ','FPP','FPQ','FQP','FQQ']){assert.ok(femaleBranch.includes('CODE-'+id+'<'));assert.ok(!maleBranch.includes('CODE-'+id+'<'));}
assert.ok(!html.includes('CODE-OUTSIDE'));assert.ok(html.includes('이름 &lt;A&gt;'));assert.ok(html.includes('data-nav="breeder/b"'));assert.ok(html.includes('꼴통A · F3'));assert.ok(html.includes('0 mm'));
html=t.linePairPedigree({mother:'RF',isWild:true});assert.equal((html.match(/<td/g)||[]).length,14);assert.ok(html.includes('Wild'));assert.ok(!html.includes('adult/undefined'));assert.ok(html.includes('king-stag-default.jpg')&&html.includes('king-stag-female-default.jpg'));
console.log('PASS: breeding pair table keeps male/female ancestor branches separate, limits depth, includes lineage/breeder links/photos and handles Wild/missing ancestors.');
