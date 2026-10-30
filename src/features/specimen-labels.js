// Reuses Labeling/index.html's canvas renderer and the unmodified template.png.
// Label drafts are scoped to the signed-in member and specimen; they never write records.
const LABEL_TEMPLATE_PATH='assets/label-template.png';
const LABEL_FONT='"Noto Serif KR", serif';
const labelDrafts=new Map();
const detailLabelState={key:'',kind:'',id:'',view:'label',editorOpen:false,saving:false,frame:0,returnUntil:0};
let labelImagePromise=null,labelFontPromise=null;
const labelText=value=>value===null||value===undefined?'':String(value);
const labelSex=value=>/^(M|m|male|♂|수컷)$/.test(labelText(value))?'m':/^(F|f|female|♀|암컷)$/.test(labelText(value))?'f':'';
const labelIsPudding=record=>record?.pudding===true||record?.pudding==='true'||/푸딩/.test(labelText(record?.bottleSize));
function larvaBottleRecords(v){
  const source=Array.isArray(v?.sourceData?.bottleRecords)?v.sourceData.bottleRecords:[];
  const rows=Array.isArray(v?.records)?v.records:[];
  return rows.length?rows.map((row,i)=>({...source[i],date:labelText(row?.[0]),feedBrand:labelText(row?.[1]),feedType:labelText(source[i]?.feedType),bottleSize:labelText(row?.[2]),weight:labelText(row?.[3])})):source.map(r=>({...r}));
}
function larvaHeadWidth(v){
  if(Object.hasOwn(v?.sourceData||{},'headWidth'))return labelText(v.sourceData.headWidth);
  const measured=larvaBottleRecords(v).filter(r=>labelText(r.headWidth).trim()!=='').sort((a,b)=>labelText(a.date).localeCompare(labelText(b.date)));
  return labelText(measured.at(-1)?.headWidth);
}
function labelRecordContext(kind,id){
  if(kind==='larva'){
    const v=byId(db.larvae,id);if(!v)return null;
    const line=byId(db.lines,v.lineId);if(!line)return null;
    return {kind,record:v,line,father:adult(line.father),mother:adult(line.mother),breeder:line.createdBy};
  }
  const a=adult(id);if(!a)return null;
  const candidates=a.father&&a.mother?db.lines.filter(l=>l.father===a.father&&l.mother===a.mother&&(!a.generation||!l.generation||l.generation===a.generation)):[];
  return {kind:'adult',record:a,line:candidates.length===1?candidates[0]:null,father:adult(a.father),mother:adult(a.mother),breeder:a.breeder};
}
function initialLabelValues(kind,id){
  const c=labelRecordContext(kind,id);if(!c)return null;
  const r=c.record;
  const lineage=p=>p?[p.lineage,p.code].filter(Boolean).join(' '):'';
  const d={sex:labelSex(r.sex),no:labelText(kind==='larva'?r.number:r.code),line:labelText(c.line?.name||(kind==='adult'?r.lineage:'')),gen:labelText(kind==='larva'?c.line?.generation:r.generation),mSize:labelText(c.father?.size),mLine:lineage(c.father),fSize:labelText(c.mother?.size),fLine:lineage(c.mother),pudDate:'',pudFeed:'',head:'',pupaDate:'',pupaW:'',adultDate:labelText(r.emerged),adult:labelText(r.size),breeder:kind==='adult'?(member(c.breeder)?.nickname||r.breederName||''):(member(c.breeder)?.nickname||'')};
  for(let i=0;i<5;i++)for(const key of ['fd','ff','fv','fw'])d[key+i]='';
  if(kind==='larva'){
    const records=larvaBottleRecords(r).slice().sort((a,b)=>labelText(a.date).localeCompare(labelText(b.date)));
    const pudding=records.find(labelIsPudding),bottles=records.filter(row=>!labelIsPudding(row));
    const feed=row=>labelText(row?.feedBrand||row?.feedType).trim();
    const volume=value=>{const s=labelText(value).trim();return !s?'':/^\d+(?:\.\d+)?$/.test(s)?s+'CC':s.replace(/cc$/i,'CC');};
    d.pudDate=labelText(pudding?.date);d.pudFeed=feed(pudding);
    d.head=larvaHeadWidth(r);
    d.pupaDate=labelText(r.sourceData?.pupation?.pupaDate);d.pupaW=labelText(r.sourceData?.pupation?.pupaWeight);
    d.adultDate=d.adultDate||labelText(r.sourceData?.eclosion?.date);d.adult=d.adult||labelText(r.sourceData?.eclosion?.totalLength);
    for(let i=0;i<5;i++){const row=bottles[i];if(!row)continue;d['fd'+i]=labelText(row.date);d['ff'+i]=feed(row);d['fv'+i]=volume(row.bottleSize);d['fw'+i]=labelText(row.weight);}
  }
  return d;
}
function labelDraftKey(kind,id){return [db.currentUser||'',kind,id].join(':');}
function prepareDetailLabel(kind,id){
  const key=labelDraftKey(kind,id);
  if(detailLabelState.key!==key){Object.assign(detailLabelState,{key,kind,id,view:'label',editorOpen:false});}
  let draft=labelDrafts.get(key);
  if(!draft||(!draft.edited&&!draft.pending)){draft={values:initialLabelValues(kind,id),edited:false};labelDrafts.set(key,draft);}
  if(labelDrafts.size>50){const oldest=labelDrafts.keys().next().value;if(oldest!==key)labelDrafts.delete(oldest);}
  return draft;
}
function leaveSpecimenDetail(){Object.assign(detailLabelState,{key:'',kind:'',id:'',view:'label',editorOpen:false,returnUntil:0});}
function clearDetailLabels(){labelDrafts.clear();leaveSpecimenDetail();}
function preserveSpecimenDetail(){return !!detailLabelState.key&&(detailLabelState.saving||detailLabelState.editorOpen||Date.now()<detailLabelState.returnUntil);}
const LABEL_FIELD_GROUPS=[
  ['기본 정보',[['no','No.'],['sex','성별','sex'],['line','라인명'],['gen','누대수']]],
  ['종충',[['mSize','♂ 크기 (mm)'],['mLine','♂ 혈통'],['fSize','♀ 크기 (mm)'],['fLine','♀ 혈통']]],
  ['Breeding Data',[['pudDate','푸딩 날짜','date'],['pudFeed','푸딩 먹이원'],['head','두폭 (mm)']]]
];
function labelInput(field,values){
  const [name,title,type='text']=field,value=labelText(values?.[name]);
  const options=[['','미구분'],['m','♂ 수컷'],['f','♀ 암컷']];
  const list=name==='gen'?' list="label-generation-list"':name==='pudFeed'||/^ff\d$/.test(name)?' list="label-feed-list"':/^fv\d$/.test(name)?' list="label-volume-list"':'';
  const numeric=['mSize','fSize','head','pupaW','adult'].includes(name)||/^fw\d$/.test(name);
  return '<label class="label-field"><span>'+title+'</span>'+(type==='sex'?'<select data-label-field="sex">'+options.map(([v,t])=>'<option value="'+v+'" '+(v===value?'selected':'')+'>'+t+'</option>').join('')+'</select>':'<input type="'+type+'" data-label-field="'+name+'" value="'+attr(value)+'" '+(numeric?'inputmode="decimal" ':'')+'maxlength="160" autocomplete="off"'+list+'>')+'</label>';
}
function specimenLabelEditor(values){
  let html=LABEL_FIELD_GROUPS.map(([title,fields])=>'<h3>'+title+'</h3><div class="label-field-grid">'+fields.map(f=>labelInput(f,values)).join('')+'</div>').join('');
  for(let i=0;i<5;i++)html+='<div class="label-feed-heading"><strong>'+['1st','2nd','3rd','4th','5th'][i]+'</strong><button type="button" class="btn btn-light btn-sm" data-action="clear-label-feed" data-feed="'+i+'">비우기</button></div><div class="label-field-grid">'+[[`fd${i}`,'날짜','date'],[`ff${i}`,'먹이원'],[`fv${i}`,'용량'],[`fw${i}`,'체중 (g)']].map(f=>labelInput(f,values)).join('')+'</div>';
  html+='<h3>용화 · 우화</h3><div class="label-field-grid">'+[['pupaDate','용화 날짜','date'],['pupaW','용화 체중 (g)'],['adultDate','우화 날짜','date'],['adult','우화 크기 (mm)'],['breeder','브리더']].map(f=>labelInput(f,values)).join('')+'</div>';
  return html+'<p class="label-date-warning" data-label-date-warning role="alert" hidden>날짜 순서를 확인하세요. 푸딩 → 교체 → 용화 → 우화 순서보다 이른 날짜가 있습니다.</p><div class="label-editor-actions"><button type="button" class="btn btn-dark" data-action="complete-label-edit">수정 완료</button></div><datalist id="label-generation-list">'+['WD','WF1','WF2','WF3','F1','F2','F3','F4','CB','CBF1','CBF2','CBF3'].map(x=>'<option value="'+x+'">').join('')+'</datalist><datalist id="label-feed-list"><option value="S8K"><option value="균사"><option value="발효톱밥"></datalist><datalist id="label-volume-list">'+['500CC','800CC','1100CC','1500CC','2300CC','3000CC'].map(x=>'<option value="'+x+'">').join('')+'</datalist>';
}
function specimenTools(kind,id,pedigreeHTML){
  const draft=prepareDetailLabel(kind,id),stacked=kind==='adult',tree=!stacked&&detailLabelState.view==='tree';
  if(stacked)detailLabelState.view='label';
  const v=kind==='larva'?byId(db.larvae,id):null,extra=v?larvaBottleRecords(v).filter(r=>!labelIsPudding(r)).length:0;
  const labelPreview='<canvas class="specimen-label-canvas" data-specimen-label-canvas width="1444" height="1032" aria-label="국균연구소 사육 라벨 미리보기">국균연구소 사육 라벨</canvas><p class="label-load-state" data-label-load-state aria-live="polite">라벨을 불러오는 중…</p>';
  const treePreview='<div class="pedigree-legend"><span><b class="p-legend-m" aria-hidden="true">♂</b> 수컷</span><span><b class="p-legend-f" aria-hidden="true">♀</b> 암컷</span></div>'+pedigreeHTML;
  const headerActions='<div class="label-header-actions" data-label-header-actions '+(tree?'hidden':'')+'><button type="button" class="btn btn-light" data-action="toggle-label-editor" aria-controls="specimen-label-editor" aria-expanded="'+detailLabelState.editorOpen+'">'+icon('edit')+'라벨 수정</button><button type="button" class="btn btn-dark" data-action="save-specimen-label" '+(detailLabelState.saving||draft.pending?'disabled':'')+'>'+icon('download')+'이미지 저장</button></div>';
  const controls='<div data-label-tools '+(tree?'hidden':'')+'><span class="label-edit-status" data-label-draft-state role="status">'+(draft.pending?'수정 중':draft.edited?'수정 완료':'')+'</span>'+(extra>5?'<p class="label-record-limit">라벨에는 1~5병까지 표시합니다. 전체 '+extra+'병 기록은 아래 사육 기록에서 확인할 수 있습니다.</p>':'')+'<div id="specimen-label-editor" class="specimen-label-editor" role="region" aria-label="라벨 수정" '+(!detailLabelState.editorOpen?'hidden':'')+'><div class="specimen-label-fields">'+specimenLabelEditor(draft.pending||draft.values)+'</div></div></div>';
  const frame='<section class="panel specimen-tools'+(stacked?' specimen-tools--stacked':'')+'" data-specimen-tools data-detail-key="'+attr(detailLabelState.key)+'">';
  if(stacked)return frame+'<div class="specimen-tools-head specimen-label-head"><h2 data-detail-panel-title>LABEL</h2>'+headerActions+'</div><div class="specimen-stage"><div id="specimen-label-view" role="region" aria-label="라벨">'+labelPreview+'</div></div>'+controls+'<section class="adult-pedigree-section" aria-labelledby="adult-pedigree-heading"><div class="specimen-tools-head"><h2 id="adult-pedigree-heading">계통도</h2></div><div class="specimen-stage adult-pedigree-stage"><div id="specimen-tree-view" role="region" aria-label="성충 계통도">'+treePreview+'</div></div></section></section>';
  return frame+'<div class="specimen-tools-head specimen-label-head"><h2 data-detail-panel-title>'+(tree?'계통도':'LABEL')+'</h2>'+headerActions+'<div class="specimen-view-tabs" role="tablist" aria-label="상세 보기 전환"><button type="button" id="specimen-label-tab" role="tab" aria-controls="specimen-label-view" aria-selected="'+!tree+'" data-action="detail-specimen-view" data-view="label">'+icon('file')+'라벨</button><button type="button" id="specimen-tree-tab" role="tab" aria-controls="specimen-tree-view" aria-selected="'+tree+'" data-action="detail-specimen-view" data-view="tree">'+icon('family')+'계통도</button></div></div><div class="specimen-stage"><div id="specimen-label-view" role="tabpanel" aria-labelledby="specimen-label-tab" '+(tree?'hidden':'')+'>'+labelPreview+'</div><div id="specimen-tree-view" role="tabpanel" aria-labelledby="specimen-tree-tab" '+(!tree?'hidden':'')+'>'+treePreview+'</div></div>'+controls+'</section>';
}
function ensureLabelImage(){
  if(!labelImagePromise)labelImagePromise=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{labelImagePromise=null;reject(Error('라벨지 이미지를 불러오지 못했습니다. 새로고침해 주세요.'));};image.src=LABEL_TEMPLATE_PATH;});
  return labelImagePromise;
}
function ensureLabelFont(){
  if(!labelFontPromise)labelFontPromise=new Promise(resolve=>{let link=document.getElementById('kml-label-font');if(link){resolve();return;}link=document.createElement('link');link.id='kml-label-font';link.rel='stylesheet';link.href='https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@700&display=swap';link.onload=()=>resolve();link.onerror=()=>resolve();document.head.appendChild(link);});
  return labelFontPromise;
}
async function ensureLabelGlyphs(values){
  await ensureLabelFont();
  if(document.fonts?.load)try{const text=Object.values(values).join('')+'0123456789.mmgCCV ';await Promise.all([document.fonts.load('700 34px '+LABEL_FONT,text),document.fonts.load('700 46px '+LABEL_FONT,text)]);}catch{}
}
function drawLabelCanvas(cv,d,template){
  const ctx=cv.getContext('2d');if(!ctx)throw Error('이 기기에서 라벨 그리기를 사용할 수 없습니다.');
  const tpl=template,SERIF=LABEL_FONT,state={sex:d.sex};
  // ---------- 포맷 ----------
  const yymmdd = v => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
    return m ? `${m[1].slice(2)}.${m[2]}.${m[3]}` : '';
  };
  const withUnit = (v, u) => (v = (v||'').trim()) ? `${v} ${u}` : '';
  const join = arr => arr.filter(Boolean).join('   ');

  // ---------- 캔버스 그리기 ----------
  function fitFont(text, maxW, size, weight){
    let s = size;
    ctx.font = `${weight} ${s}px ${SERIF}`;
    while(ctx.measureText(text).width > maxW && s > 14){
      s -= 1; ctx.font = `${weight} ${s}px ${SERIF}`;
    }
    return s;
  }
  // 셀 가운데 정렬 (x0~x1, y0~y1)
  function cell(text, x0, y0, x1, y1, size=34, weight=700){
    if(!text) return;
    fitFont(text, (x1 - x0) - 24, size, weight);
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, (x0 + x1) / 2, (y0 + y1) / 2 + 2);
  }

  function draw(d){
    ctx.clearRect(0, 0, cv.width, cv.height);
    if(tpl.complete && tpl.naturalWidth) ctx.drawImage(tpl, 0, 0, cv.width, cv.height);


    // No.
    if(d.no) cell(d.no.trim(), 1246, 82, 1406, 134, 40, 700);

    // 성별 체크
    // 체크 표시: 글자 실제 외곽 기준으로 칸 정중앙에 배치
    const checkAt = (cx, cy) => {
      ctx.font = `700 34px ${SERIF}`;
      ctx.fillStyle = '#000'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      const m = ctx.measureText('V');
      const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
      ctx.fillText('V', cx - w / 2 + m.actualBoundingBoxLeft, cy - h / 2 + m.actualBoundingBoxAscent);
    };
    if(state.sex === 'm') checkAt(1222.5, 193.5);
    if(state.sex === 'f') checkAt(1371.5, 193.5);

    // 종충
    cell(d.line, 269, 283, 758, 331);
    cell(d.gen, 897, 283, 1412, 331);
    cell(withUnit(d.mSize, 'mm'), 269, 334, 477, 388);
    cell(d.mLine, 480, 334, 1412, 388);
    cell(withUnit(d.fSize, 'mm'), 269, 391, 477, 449);
    cell(d.fLine, 480, 391, 1412, 449);

    // Breeding Data
    cell(join([yymmdd(d.pudDate), d.pudFeed.trim()]), 188, 518, 758, 563);
    cell(withUnit(d.head, 'mm'), 1007, 518, 1412, 563);
    const rows = [[566,609],[612,656],[659,705],[708,754],[756,803]];
    // 1st~5th: 왼쪽 정렬 + 항목별 열 맞춤 (날짜 / 먹이 / 용량 / 체중)
    const feedCols = rows.map((_, i) => [yymmdd(d[`fd${i}`]), d[`ff${i}`].trim(), d[`fv${i}`].trim(), withUnit(d[`fw${i}`], 'g')]);
    const PAD = 56, GAP = 44, X0 = 188, X1 = 1412;
    let fs = 34, colW;
    const measureCols = () => {
      ctx.font = `700 ${fs}px ${SERIF}`;
      colW = [0,1,2,3].map(c => Math.max(0, ...feedCols.map(r => r[c] ? ctx.measureText(r[c]).width : 0)));
      const used = colW.filter(w => w > 0);
      return used.reduce((a, b) => a + b, 0) + GAP * Math.max(0, used.length - 1);
    };
    while(measureCols() > (X1 - X0) - PAD * 2 && fs > 16) fs--;
    ctx.fillStyle = '#000'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    rows.forEach(([y0,y1], i) => {
      let x = X0 + PAD;
      feedCols[i].forEach((t, c) => {
        if(!colW[c]) return;
        if(t) ctx.fillText(t, x, (y0 + y1) / 2 + 2);
        x += colW[c] + GAP;
      });
    });
    cell(join([yymmdd(d.pupaDate), withUnit(d.pupaW, 'g')]), 188, 806, 758, 854);
    cell(join([yymmdd(d.adultDate), withUnit(d.adult, 'mm')]), 1007, 806, 1412, 854);

    // Breeder
    if(d.breeder) cell(d.breeder.trim(), 250, 880, 1192, 936, 40, 700);
  }


  draw(d);
}
function labelDatesInvalid(values){
  const dates=[values.pudDate,...Array.from({length:5},(_,i)=>values['fd'+i]),values.pupaDate,values.adultDate].filter(Boolean);
  return dates.some((date,i)=>i>0&&date<dates[i-1]);
}
function paintMountedLabel(){
  const canvas=document.querySelector('[data-specimen-label-canvas]'),key=detailLabelState.key,draft=labelDrafts.get(key);
  if(!canvas||!draft?.values)return;
  const host=canvas.closest('[data-specimen-tools]');if(host?.dataset.detailKey!==key)return;
  const warning=host.querySelector('[data-label-date-warning]');if(warning)warning.hidden=!labelDatesInvalid(draft.pending||draft.values);
  const version=(canvas.labelVersion||0)+1;canvas.labelVersion=version;
  const current=()=>canvas.isConnected&&canvas.labelVersion===version&&detailLabelState.key===key;
  const paint=image=>{if(!current())return;try{drawLabelCanvas(canvas,labelDrafts.get(key).values,image);const message=host.querySelector('[data-label-load-state]');if(message)message.hidden=true;}catch(error){const message=host.querySelector('[data-label-load-state]');if(message){message.hidden=false;message.textContent=error.message;}}};
  ensureLabelImage().then(image=>{paint(image);return ensureLabelGlyphs(labelDrafts.get(key)?.values||draft.values).then(()=>paint(image));}).catch(error=>{if(current()){const message=host.querySelector('[data-label-load-state]');if(message){message.hidden=false;message.textContent=error.message;}}});
}
function queueLabelPaint(){
  if(detailLabelState.frame)return;
  detailLabelState.frame=requestAnimationFrame(()=>{detailLabelState.frame=0;paintMountedLabel();});
}
function mountSpecimenTools(){
  const host=document.querySelector('[data-specimen-tools]');if(!host)return;
  paintMountedLabel();
}
function switchSpecimenView(view){
  if(detailLabelState.kind==='adult'||!['label','tree'].includes(view))return;
  const host=document.querySelector('[data-specimen-tools]');if(!host||host.dataset.detailKey!==detailLabelState.key)return;
  detailLabelState.view=view;const tree=view==='tree';
  host.querySelector('#specimen-label-view').hidden=tree;host.querySelector('#specimen-tree-view').hidden=!tree;host.querySelector('[data-label-tools]').hidden=tree;
  host.querySelector('[data-detail-panel-title]').textContent=tree?'계통도':'LABEL';
  const actions=host.querySelector('[data-label-header-actions]');if(actions)actions.hidden=tree;
  host.querySelectorAll('[data-action="detail-specimen-view"]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.view===view)));
  if(!tree)queueLabelPaint();
}
function toggleLabelEditor(){
  const host=document.querySelector('[data-specimen-tools]');if(!host||host.dataset.detailKey!==detailLabelState.key)return;
  const editor=host.querySelector('.specimen-label-editor');if(!editor)return;
  detailLabelState.editorOpen=editor.hidden;editor.hidden=!detailLabelState.editorOpen;
  host.querySelector('[data-action="toggle-label-editor"]')?.setAttribute('aria-expanded',String(detailLabelState.editorOpen));
}
function markLabelPending(){
  const host=document.querySelector('[data-specimen-tools]'),draft=labelDrafts.get(detailLabelState.key);if(!host||!draft||host.dataset.detailKey!==detailLabelState.key)return;
  const status=host.querySelector('[data-label-draft-state]');if(status)status.textContent='수정 중';
  const warning=host.querySelector('[data-label-date-warning]');if(warning)warning.hidden=!labelDatesInvalid(draft.pending||draft.values);
  const saveButton=host.querySelector('[data-action="save-specimen-label"]');if(saveButton)saveButton.disabled=true;
}
function updateLabelInput(event){
  const input=event.target.closest?.('[data-label-field]');if(!input)return;
  const host=input.closest('[data-specimen-tools]'),draft=labelDrafts.get(detailLabelState.key),field=input.dataset.labelField,values=draft?.pending||draft?.values;
  if(!values||host?.dataset.detailKey!==detailLabelState.key||!Object.hasOwn(values,field)||values[field]===input.value)return;
  draft.pending={...values,[field]:input.value};markLabelPending();
}
function clearLabelFeed(index){
  const i=Number(index),draft=labelDrafts.get(detailLabelState.key);if(!Number.isInteger(i)||i<0||i>4||!draft?.values)return;
  const next={...(draft.pending||draft.values)};for(const key of ['fd','ff','fv','fw'])next[key+i]='';draft.pending=next;
  const host=document.querySelector('[data-specimen-tools]');host?.querySelectorAll('[data-label-field]').forEach(input=>{input.value=labelText(next[input.dataset.labelField]);});markLabelPending();
}
function completeSpecimenLabelEdit(){
  const host=document.querySelector('[data-specimen-tools]'),draft=labelDrafts.get(detailLabelState.key);if(!host||!draft?.values||host.dataset.detailKey!==detailLabelState.key)return false;
  const next={...(draft.pending||draft.values)};
  host.querySelectorAll('[data-label-field]').forEach(input=>{const field=input.dataset.labelField;if(Object.hasOwn(next,field))next[field]=input.value;});
  draft.edited=draft.edited||Object.keys(next).some(field=>next[field]!==draft.values[field]);draft.values=next;delete draft.pending;
  const status=host.querySelector('[data-label-draft-state]');if(status)status.textContent=draft.edited?'수정 완료':'';
  const saveButton=host.querySelector('[data-action="save-specimen-label"]');if(saveButton)saveButton.disabled=detailLabelState.saving;
  detailLabelState.editorOpen=false;const editor=host.querySelector('.specimen-label-editor');if(editor)editor.hidden=true;
  host.querySelector('[data-action="toggle-label-editor"]')?.setAttribute('aria-expanded','false');
  queueLabelPaint();return true;
}
async function saveSpecimenLabel(button){
  const draft=labelDrafts.get(detailLabelState.key);if(detailLabelState.saving||!draft?.values)return;
  if(draft.pending){notify('수정 완료를 누른 뒤 이미지를 저장하세요.');return;}
  const values={...draft.values};let nativeExport=false;detailLabelState.saving=true;if(button)button.disabled=true;
  try{
    const [image]=await Promise.all([ensureLabelImage(),ensureLabelGlyphs(values)]);
    const canvas=document.createElement('canvas');canvas.width=1444;canvas.height=1032;drawLabelCanvas(canvas,values,image);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('라벨 이미지를 만들지 못했습니다. 다시 시도해 주세요.');
    const name=['KML',values.line,values.no?'No'+values.no:''].filter(Boolean).join('_').replace(/[\\/:*?"<>|\s]+/g,'_')+'.png';
    const file=new File([blob],name,{type:'image/png'}),mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    nativeExport=mobile;if(mobile)detailLabelState.returnUntil=Date.now()+2000;
    if(mobile&&navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:name});return;}catch(error){if(error.name==='AbortError')return;}}
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
  }catch(error){notify('라벨 저장 실패: '+(error.message||String(error)));}
  finally{detailLabelState.saving=false;if(nativeExport)detailLabelState.returnUntil=Date.now()+2000;document.querySelectorAll('[data-action="save-specimen-label"]').forEach(control=>{control.disabled=!!labelDrafts.get(detailLabelState.key)?.pending;});}
}
document.addEventListener('input',updateLabelInput);
document.addEventListener('change',updateLabelInput);
document.addEventListener('keydown',event=>{
  const button=event.target.closest?.('[data-action="detail-specimen-view"]');if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();const view=event.key==='Home'?'label':event.key==='End'?'tree':detailLabelState.view==='label'?'tree':'label';switchSpecimenView(view);document.querySelector('[data-action="detail-specimen-view"][data-view="'+view+'"]').focus();
});
