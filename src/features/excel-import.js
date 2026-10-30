const EXCEL_ALIASES={
 code:['관리번호','개체번호','코드','code','number'],lineage:['혈통','혈통명','lineage'],generation:['누대수','누대','세대','generation','gen'],sex:['성별','sex'],headWidth:['두폭','두폭mm','headwidth'],size:['체장','크기','성충크기','size','totallength'],emerged:['우화일','우화날짜','emerged','eclosiondate'],breeder:['브리더','브리더닉네임','breeder'],owner:['보유자','현재보유자','현재소유자','소유자','owner'],father:['부관리번호','부개체','부','수컷관리번호','father','sire'],mother:['모관리번호','모개체','모','암컷관리번호','mother','dam'],source:['입수경로','입수','source'],status:['상태','보유상태','status'],note:['메모','비고','note','memo'],line:['라인명','라인','라인코드','line','linename'],pupaDate:['용화일','용화날짜','pupadate'],prepupaDate:['전용일','전용날짜','prepupadate'],pupaWeight:['용화무게','용화체중','pupaweight'],species:['종','종명','species']
};
const excelNorm=value=>String(value??'').replace(/\([^)]*\)/g,'').replace(/[\s_*·.\-]/g,'').toLowerCase();
const excelCell=value=>String(value??'').trim();
const excelBlank=value=>['','—','-'].includes(excelCell(value));
function excelHeader(value){
 const key=excelNorm(value);for(const [field,aliases]of Object.entries(EXCEL_ALIASES))if(aliases.includes(key))return field;
 const m=key.match(/^(\d+)(?:번)?(?:병|기록)(날짜|교체일|균사|먹이원|먹이|제품명|용량|체중|무게|두폭|먹이종류|종류|푸딩)(?:g|cc|mm)?$/);
 if(m){const number=Number(m[1]);if(number<1||number>60)return '';const field=({날짜:'date',교체일:'date',균사:'feedBrand',먹이원:'feedBrand',먹이:'feedBrand',제품명:'feedBrand',용량:'bottleSize',체중:'weight',무게:'weight',두폭:'headWidth',먹이종류:'feedType',종류:'feedType',푸딩:'pudding'})[m[2]];return 'bottle.'+(number-1)+'.'+field;}
 return '';
}
function excelDate(value,date1904=false){
 if(excelCell(value)==='[비우기]')return null;
 let text=excelCell(value);if(typeof value==='number'||/^\d{5}(?:\.\d+)?$/.test(text)){const serial=Number(value);if(!date1904&&serial===60)throw Error('잘못된 엑셀 날짜입니다.');text=new Date(Date.UTC(1899,11,30)+Math.floor(serial+(date1904?1462:serial<60?1:0))*86400000).toISOString().slice(0,10);}
 const m=text.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})(?:\s.*)?$/);if(m)text=m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
 if(!validLarvaDate(text))throw Error('날짜는 YYYY-MM-DD로 입력하세요.');return text;
}
function excelNumber(value,max=1000000){if(excelCell(value)==='[비우기]')return null;const number=Number(excelCell(value).replace(/,/g,'').replace(/\s*(mm|g|cc)$/i,''));if(!Number.isFinite(number)||number<0||number>max)throw Error('숫자 범위를 확인하세요.');return number;}
function excelSex(value,larva=false){const text=excelCell(value);if(/^(m|수컷|수|♂|수컷\s*♂)$/i.test(text))return'M';if(/^(f|암컷|암|♀|암컷\s*♀)$/i.test(text))return'F';if(larva&&/^(u|미구분|미상|unknown)$/i.test(text))return'U';throw Error('성별은 수컷·암컷'+(larva?'·미구분':'')+'으로 입력하세요.');}
function excelTable(parsed,kind){
 const rows=parsed.rows||[];let defaultLine='',header=-1;
 for(let i=0;i<Math.min(rows.length,10);i++){
  const values=rows[i];if(values.slice(2).every(excelBlank)&&excelHeader(values[0])==='line'&&excelHeader(values[1])!=='code')defaultLine=excelCell(values[1]);
  if(values.some(v=>excelHeader(v)==='code')){header=i;break;}
 }
 if(header<0)throw Error('관리번호 열을 찾을 수 없습니다. 양식의 첫 행을 유지해 주세요.');
 const columns=rows[header].map(excelHeader),seen=new Set();for(const key of columns)if(key){if(seen.has(key))throw Error('같은 항목의 열이 중복되었습니다: '+key);seen.add(key);}
 const data=[];for(let i=header+1;i<rows.length;i++){
  const values=rows[i];if(values.every(excelBlank))continue;
  const exampleCode=kind==='adults'?'[고정 예시] EX-M001':'[고정 예시] 001';
  if(i===header+1&&excelCell(values[columns.indexOf('code')])===exampleCode&&excelCell(values[columns.indexOf('note')])==='KML 고정 예시 · 3행부터 입력')continue;
  const row={row:i+1,values:Object.create(null)};
  for(let j=0;j<values.length;j++)if(!excelBlank(values[j])){if(!columns[j])throw Error((i+1)+'행: 알 수 없는 열 '+excelCell(rows[header][j]||String(j+1)));row.values[columns[j]]=values[j];}
  data.push(row);
 }
 if(!data.length)throw Error('입력된 데이터가 없습니다. 예시가 아닌 '+(kind==='adults'?'성충':'유충')+' 시트에 입력해 주세요.');if(data.length>500)throw Error('한 번에 최대 500개체를 넣을 수 있습니다.');
 return{rows:data,date1904:!!parsed.date1904,defaultLine};
}
function excelPreviewValues(payload,prepared){
 const labels={lineage:'혈통',generation:'누대수',sex:'성별',size:'체장',emerged:'우화일',breeder_id:'브리더',breeder_name:'외부 브리더',father_id:'부',mother_id:'모',source:'입수 경로',status:'상태',note:'메모',memo:'메모',pupaDate:'용화일',prepupaDate:'전용일',pupaWeight:'용화 무게',date:'날짜',feedBrand:'먹이원',feedType:'종류',bottleSize:'용량',weight:'무게',headWidth:'두폭',pudding:'푸딩'};
 const value=(key,v)=>{if(v===null||v==='')return '(비우기)';if(key==='father_id'||key==='mother_id')return prepared.find(x=>x.id===v)?.code||adult(v)?.code||'연결 개체';if(key==='breeder_id')return memberName(v);if(key==='sex')return v==='M'?'수컷':v==='F'?'암컷':'미구분';return String(v).slice(0,160);};
 const out=[];for(const [key,v]of Object.entries(payload))if(labels[key])out.push(labels[key]+': '+value(key,v));
 for(const [key,v]of Object.entries(payload.source_patch||{})){if(key==='pupation'){for(const [field,text]of Object.entries(v))out.push(labels[field]+': '+value(field,text));}else out.push((labels[key]||key)+': '+value(key,v));}
 for(const row of payload.bottle_changes||[])out.push((row.index+1)+'병 '+Object.entries(row.values).map(([key,v])=>(labels[key]||key)+' '+value(key,v)).join(' / '));
 return out;
}
function excelPlan(table,kind,updateExisting=false,selectedLine=''){
 const items=[],errors=[],preview=[],keys=new Set(),prepared=[],date1904=table.date1904;
 const adultMap=new Map(db.adults.map(a=>[a.code.toLowerCase(),a]));
 const clean=(value,max=3000)=>{const text=excelCell(value);if(text==='[비우기]')return '';if(text.length>max)throw Error('텍스트가 너무 깁니다.');return text;};
 for(const row of table.rows){try{
  const f=row.values,code=clean(f.code,80);if(!code||code==='[비우기]')throw Error('관리번호가 필요합니다.');
  if(f.species&&!/왕사슴벌레|hopei|binodulosus|オオクワ/i.test(excelCell(f.species)))throw Error('왕사슴벌레 데이터만 넣을 수 있습니다.');
  if(kind==='adults'){
   const old=adultMap.get(code.toLowerCase());if(old&&!mineAdult(old))throw Error('다른 회원이 보유한 관리번호입니다.');
   if(keys.has(code.toLowerCase()))throw Error('파일에 같은 관리번호가 중복되었습니다.');keys.add(code.toLowerCase());
   const id=old?.id||uid();prepared.push({row,f,old,id,code});
   if(!old)adultMap.set(code.toLowerCase(),{id,code,sex:f.sex?excelSex(f.sex):'',owner:db.currentUser});
  }else{
   const chosen=selectedLine?byId(db.lines,selectedLine):null,lineName=excelCell(f.line||table.defaultLine||chosen?.name),line=chosen||db.lines.find(l=>l.name.toLowerCase()===lineName.toLowerCase());
   if(!line||!mineLine(line))throw Error('먼저 내 라인을 생성하고 정확한 라인명을 입력하세요.');if(lineName&&lineName.toLowerCase()!==line.name.toLowerCase())throw Error('선택한 라인과 파일의 라인명이 다릅니다.');
   const key=line.id+':'+code;if(keys.has(key))throw Error('파일에 같은 라인·관리번호가 중복되었습니다.');keys.add(key);
   const old=db.larvae.find(v=>v.lineId===line.id&&v.number===code);prepared.push({row,f,old,id:old?.id||uid(),code,line});
  }
 }catch(error){errors.push({row:row.row,message:error.message});}}
 for(const entry of prepared){const {row,f,old,id,code,line}=entry;try{
  if(old&&!updateExisting){preview.push({row:row.row,key:line?line.name+' / '+code:code,state:'기존 · 건너뜀',fields:''});continue;}
  const payload={},fields=[];const put=(name,value,before,label)=>{if(!old||JSON.stringify(value)!==JSON.stringify(before)){payload[name]=value;fields.push(label);}};
  if(kind==='adults'){
   put('code',code,old?.code,'관리번호');
   if(f.lineage!==undefined){const value=clean(f.lineage,120);if(!value)throw Error('혈통은 비울 수 없습니다.');put('lineage',lineageLabel(value),old?.lineage,'혈통');}else if(!old)throw Error('혈통이 필요합니다.');
   if(f.sex!==undefined)put('sex',excelSex(f.sex),old?.sex,'성별');else if(!old)throw Error('성별이 필요합니다.');
   if(f.generation!==undefined)put('generation',clean(f.generation,30).toUpperCase(),old?.generation||'','누대수');
   if(f.size!==undefined)put('size',excelNumber(f.size,200),old?.size===''?null:Number(old?.size),'체장');
   if(f.emerged!==undefined)put('emerged',excelDate(f.emerged,date1904),old?.emerged||null,'우화일');
   if(f.note!==undefined)put('note',clean(f.note),old?.note||'','메모');
   if(f.status!==undefined){const value=clean(f.status);if(!['보유','분양','사망'].includes(value))throw Error('보유 상태는 보유·분양·사망입니다.');put('status',value,old?.status,'상태');}
   if(f.source!==undefined){const value=clean(f.source),normal=value==='자가'||value==='자체 우화'?'우화':value;if(!['우화','입양','채집'].includes(normal))throw Error('입수 경로는 우화·입양·채집입니다.');put('source',normal,old?.source,'입수 경로');}
   if(f.owner!==undefined&&!['본인','나','me',memberName(db.currentUser)].includes(excelCell(f.owner)))throw Error('보유자 변경은 성충 보내기를 이용하세요.');
   if(f.breeder!==undefined){const selected=adultBreederValue('',clean(f.breeder,80));put('breeder_id',selected.breeder||null,old?.breeder||null,'브리더');put('breeder_name',selected.breederName,old?.breederName||'','외부 브리더');}
   for(const [field,sex]of [['father','M'],['mother','F']])if(f[field]!==undefined){const value=clean(f[field],80),parent=value?adultMap.get(value.toLowerCase()):null;if(value&&!parent)throw Error('부모 관리번호를 찾을 수 없습니다: '+value);const fileParent=prepared.find(x=>x.id===parent?.id);const gender=fileParent&&(!fileParent.old||updateExisting)&&fileParent.f.sex?excelSex(fileParent.f.sex):parent?.sex;if(parent&&gender!==sex)throw Error('부·모의 성별을 확인하세요.');if(parent?.id===id)throw Error('자신을 부모로 지정할 수 없습니다.');put(field+'_id',parent?.id||null,old?.[field]||null,field==='father'?'부':'모');}
   if(!old){payload.source=payload.source||'우화';payload.status=payload.status||'보유';}
  }else{
   payload.line_id=line.id;put('number',code,old?.number,'관리번호');if(f.sex!==undefined)put('sex',excelSex(f.sex,true),old?.sex,'성별');else if(!old)payload.sex='U';
   if(f.size!==undefined)put('size',excelNumber(f.size,200),old?.size===''?null:Number(old?.size),'체장');if(f.emerged!==undefined)put('emerged',excelDate(f.emerged,date1904),old?.emerged||null,'우화일');
   const sourcePatch={};if(f.headWidth!==undefined){const value=excelNumber(f.headWidth),text=value===null?'':String(value);if(text!==larvaHeadWidth(old))sourcePatch.headWidth=text;}if(f.status!==undefined){let status=clean(f.status);if(status==='폐사')status='사망';if(!['유충','사육중','용화','우화','분양','사망'].includes(status))throw Error('유충 상태를 확인하세요.');if(status!==old?.sourceData?.status)sourcePatch.status=status;}
   if(f.note!==undefined){const value=clean(f.note,2000);if(value!==(old?.sourceData?.memo||''))sourcePatch.memo=value;}
   for(const field of ['prepupaDate','pupaDate','pupaWeight'])if(f[field]!==undefined){const value=field==='pupaWeight'?excelNumber(f[field]):excelDate(f[field],date1904),text=value===null?'':String(value);if(text!==String(old?.sourceData?.pupation?.[field]??''))(sourcePatch.pupation??={})[field]=text;}
   if(Object.keys(sourcePatch).length){payload.source_patch=sourcePatch;fields.push('두폭·상태·메모·용화');}
   const oldBottles=old?larvaBottleRecords(old):[],changes=new Map();
   for(const [field,raw]of Object.entries(f))if(field.startsWith('bottle.')){
    const [,number,name]=field.split('.'),index=Number(number);let value;
    if(name==='date'){value=excelDate(raw,date1904);if(!value)throw Error('병별 날짜는 비울 수 없습니다.');}
    else if(name==='weight'||name==='headWidth'){const n=excelNumber(raw);value=n===null?'':String(n);}
    else if(name==='pudding'){if(!/^(true|false|y|n|예|아니오|1|0)$/i.test(excelCell(raw)))throw Error('푸딩은 예·아니오로 입력하세요.');value=/^(true|y|예|1)$/i.test(excelCell(raw));}
    else value=clean(raw,name==='bottleSize'?40:160);
    if(JSON.stringify(value)!==JSON.stringify(oldBottles[index]?.[name]??'')){if(!changes.has(index))changes.set(index,{});changes.get(index)[name]=value;}
   }
   const bottleChanges=[...changes].sort(([a],[b])=>a-b).map(([index,values])=>({index,values}));let count=oldBottles.length;
   for(const change of bottleChanges){if(change.index>count)throw Error('병 기록은 앞 번호부터 빈칸 없이 입력하세요.');if(!change.values.date&&!oldBottles[change.index]?.date)throw Error((change.index+1)+'병 날짜가 필요합니다.');if(change.index===count)count++;}
   if(bottleChanges.length){payload.bottle_changes=bottleChanges;fields.push('병별 기록 '+bottleChanges.length+'건');}
  }
  const meaningful=Object.keys(payload).filter(key=>key!=='line_id');if(old&&!meaningful.length){preview.push({row:row.row,key:line?line.name+' / '+code:code,state:'변경 없음',fields:''});continue;}
  if(old&&!old.updatedAt)throw Error('최신 버전을 확인할 수 없습니다. 목록을 새로고침하세요.');
  items.push({kind:kind==='adults'?'adults':'larvae',id,version:old?.updatedAt||null,payload});preview.push({row:row.row,key:line?line.name+' / '+code:code,state:old?'수정':'신규',fields:fields.join(' · '),values:excelPreviewValues(payload,prepared)});
 }catch(error){errors.push({row:row.row,message:error.message});}}
 // Check the final adult graph before offering a save button; DB repeats this check atomically.
 if(kind==='adults'&&!errors.length){const graph=new Map(db.adults.map(a=>[a.id,{father:a.father,mother:a.mother}]));for(const item of items){const before=graph.get(item.id)||{};graph.set(item.id,{father:Object.hasOwn(item.payload,'father_id')?item.payload.father_id:before.father,mother:Object.hasOwn(item.payload,'mother_id')?item.payload.mother_id:before.mother});}const active=new Set(),done=new Set();const walk=id=>{if(!id||done.has(id))return false;if(active.has(id))return true;active.add(id);const a=graph.get(id);if(a&&(walk(a.father)||walk(a.mother)))return true;active.delete(id);done.add(id);return false;};for(const item of items)if(walk(item.id)){errors.push({row:0,message:'부모·자손 관계가 순환합니다.'});break;}}
 return{items,errors,preview,newCount:items.filter(x=>!x.version).length,updateCount:items.filter(x=>x.version).length};
}
function excelImportModal(){
 const state=ui.excelImport;if(!state)return'';const adultKind=state.kind==='adults',plan=state.plan,locked=state.reading||state.saving;
 const options=db.lines.filter(mineLine).map(l=>'<option value="'+attr(l.id)+'" '+(state.lineId===l.id?'selected':'')+'>'+esc(l.name)+'</option>').join('');
 const body='<div class="modal-content"><div class="excel-import-tools"><a class="btn btn-light" href="assets/templates/KML_'+(adultKind?'adults':'larvae')+'_template.xlsx?v=headwidth-sort-20261028" download>'+icon('download')+'양식 다운로드</a><label class="excel-file-picker">파일 선택<input type="file" id="excel-import-file" accept=".xlsx,.xls,.csv" '+(locked?'disabled':'')+'></label></div>'+(!adultKind?'<label class="field excel-target"><span>대상 라인</span><select id="excel-import-line" '+(locked||state.parent?'disabled':'')+'><option value="">파일의 라인명으로 구분</option>'+options+'</select></label>':'')+'<label class="excel-update-toggle"><input type="checkbox" id="excel-import-updates" '+(state.updateExisting?'checked':'')+' '+(locked?'disabled':'')+'> 기존 개체도 수정</label><div class="excel-policy">빈칸은 기존 값 유지 · 선택 항목 삭제는 [비우기]</div><p class="excel-file-state" role="status">'+esc(state.reading?'파일을 읽는 중…':state.fileName||'')+'</p>'+(state.error?'<div class="excel-import-error" role="alert">'+esc(state.error)+'</div>':'')+(plan?'<div class="excel-counts"><span>신규 <b>'+plan.newCount+'</b></span><span>수정 <b>'+plan.updateCount+'</b></span><span>오류 <b>'+plan.errors.length+'</b></span></div>'+(plan.errors.length?'<ul class="excel-errors" role="alert">'+plan.errors.slice(0,100).map(e=>'<li>'+(e.row?e.row+'행: ':'')+esc(e.message)+'</li>').join('')+'</ul>':'')+'<div class="datatable-wrap excel-preview"><table class="datatable"><thead><tr><th>행</th><th>개체</th><th>처리</th><th>변경 항목</th></tr></thead><tbody>'+plan.preview.slice(0,500).map(x=>'<tr><td>'+x.row+'</td><td>'+esc(x.key)+'</td><td>'+esc(x.state)+'</td><td>'+esc(x.fields||'—')+(x.values?.length?'<details class="excel-row-values"><summary>변경값 보기</summary><ul>'+x.values.map(value=>'<li>'+esc(value)+'</li>').join('')+'</ul></details>':'')+'</td></tr>').join('')+'</tbody></table></div>':'')+'</div><div class="modal-actions"><button type="button" class="btn btn-light" data-action="close-modal" '+(state.saving?'disabled':'')+'>'+(state.parent?'라인 수정으로':'닫기')+'</button><button type="button" class="btn btn-dark" data-action="save-excel-import" '+(locked||!plan||plan.errors.length||!plan.items.length?'disabled':'')+'>'+(state.saving?'저장 중…':(plan?plan.items.length+'개체 저장':'저장'))+'</button></div>';
 return modalFrame(adultKind?'성충 Excel 가져오기':'라인 유충 Excel 가져오기','',body);
}
function rebuildExcelPreview(){const state=ui.excelImport;if(!state?.table)return;state.error='';try{state.plan=excelPlan(state.table,state.kind,state.updateExisting,state.lineId);}catch(error){state.error=error.message;state.plan=null;}renderModal();}
function openExcelImport(kind,lineId=''){
 let parent=null;
 if(ui.modal?.kind==='line'){
  const form=document.getElementById('line-form');if(form)parent={id:ui.modal.id,values:Object.fromEntries(new FormData(form)),manual:form.querySelector('[name="generation"]')?.dataset.manual,scroll:document.querySelector('#modal-root .modal-content')?.scrollTop||0};
 }
 ui.excelImport={kind:kind==='adults'?'adults':'larvae',user:db.currentUser,lineId,parent,updateExisting:false,reading:false,saving:false,fileName:'',error:'',table:null,plan:null,worker:null,token:0};openModal('excel-import');
}
function closeExcelImport(){
 const state=ui.excelImport;if(!state)return false;if(state.saving)return true;
 state.worker?.terminate();state.token++;ui.excelImport=null;
 if(state.parent){openModal('line',state.parent.id);const form=document.getElementById('line-form');if(form){for(const field of form.querySelectorAll('[name]')){if(field.type==='checkbox')field.checked=state.parent.values[field.name]==='on';else if(Object.hasOwn(state.parent.values,field.name))field.value=state.parent.values[field.name];}const gen=form.querySelector('[name="generation"]');if(gen)gen.dataset.manual=state.parent.manual||'false';const father=form.querySelector('[name="father"]');if(father)father.required=!form.querySelector('[name="isWild"]').checked;const label=form.querySelector('[data-line-father-label]');if(label)label.textContent=father?.required?'부 ♂ *':'부 ♂ (선택)';}const content=document.querySelector('#modal-root .modal-content');if(content)content.scrollTop=state.parent.scroll;return true;}
 return false;
}
async function readExcelFile(file){
 const state=ui.excelImport;if(!state||state.saving||!file)return;
 state.worker?.terminate();const token=++state.token;state.error='';state.plan=null;state.table=null;state.fileName=file.name;
 if(!/\.(xlsx|xls|csv)$/i.test(file.name)){state.error='XLSX·XLS·CSV 파일을 선택하세요.';renderModal();return;}
 if(file.size>5*1024*1024){state.error='파일은 5MB 이하로 나누어 주세요.';renderModal();return;}
 state.reading=true;renderModal();
 try{
  const buffer=await file.arrayBuffer();if(ui.excelImport!==state||state.token!==token||state.user!==db.currentUser)return;
  const worker=new Worker('assets/excel-worker.js?v=fixed-example-20261024');state.worker=worker;
  const parsed=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{worker.terminate();reject(Error('파일 읽기 시간이 초과되었습니다. 데이터를 나누어 주세요.'));},30000);worker.onmessage=e=>{clearTimeout(timeout);e.data.error?reject(Error(e.data.error)):resolve(e.data);};worker.onerror=()=>{clearTimeout(timeout);reject(Error('엑셀 읽기 도구를 불러오지 못했습니다. 새로고침 후 다시 선택하세요.'));};worker.postMessage({buffer,kind:state.kind},[buffer]);});
  worker.terminate();state.worker=null;
  if(ui.excelImport!==state||state.token!==token||state.user!==db.currentUser)return;
  state.table=excelTable(parsed,state.kind);state.reading=false;rebuildExcelPreview();
 }catch(error){if(ui.excelImport===state&&state.token===token){state.worker?.terminate();state.worker=null;state.error=error.message;state.reading=false;renderModal();}}
}
async function saveExcelImport(){
 const state=ui.excelImport;if(!state||state.saving||state.reading||!state.plan?.items.length||state.plan.errors.length)return;
 if(state.user!==db.currentUser)return notify('로그인 계정이 변경됐습니다. 파일을 다시 선택하세요.');
 state.saving=true;state.error='';renderModal();let stored=false;
 try{
  const {data,error}=await supa.rpc('kml_import_excel',{p_items:state.plan.items});if(error)throw error;stored=true;
  if(state.user!==db.currentUser)return;
  let refreshed=true;try{await loadRemote();}catch(error){refreshed=false;}
  state.saving=false;const parent=state.parent;closeModal();if(!parent)render();else{const content=document.getElementById('page-content'),r=route();if(content&&r.page==='line')content.innerHTML=lineDetail(r.id);else if(content&&['lines','archive'].includes(r.page))content.innerHTML=linesPage();}
  notify('Excel 저장 완료 · 신규 '+Number(data?.inserted||0)+'개체 · 수정 '+Number(data?.updated||0)+'개체'+(refreshed?'':' · 목록 새로고침이 필요합니다.'));
 }catch(error){if(ui.excelImport===state){state.error=(stored?'저장은 완료되었습니다. 목록을 새로고침해 주세요.':'저장하지 않았습니다: '+(error.message||String(error)));state.saving=false;renderModal();}}
}
document.addEventListener('change',event=>{
 const state=ui.excelImport;if(!state||state.saving)return;
 if(event.target.id==='excel-import-file')readExcelFile(event.target.files?.[0]);
 if(event.target.id==='excel-import-updates'){state.updateExisting=event.target.checked;rebuildExcelPreview();}
 if(event.target.id==='excel-import-line'){state.lineId=event.target.value;rebuildExcelPreview();}
});
