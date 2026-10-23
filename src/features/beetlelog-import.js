function importEligibility(item,kind){
  const state=ui.bImport;
  const id=String(item?.id||'').trim(),code=String(item?.code||'').trim();
  if(!id||!code)return '원본 ID/관리번호 없음';
  if(kind==='adults'){
    const exists=db.adults.find(x=>x.beetlelogOwner===db.currentUser&&x.beetlelogId===id);
    if(exists)return '가져오기 완료';
    if(db.adults.some(x=>x.code.toLowerCase()===code.toLowerCase()))return '관리번호 중복';
    const sex=String(item.sex||'');
    if(!['M','F'].includes(sex)&&!/수컷|암컷|♂|♀/.test(sex))return '성별 확인 필요';
  }else{
    const exists=db.lines.find(x=>x.beetlelogOwner===db.currentUser&&x.beetlelogId===id);
    if(exists)return mineLine(exists)?'':'다른 소유자의 라인';
    if(db.lines.some(x=>x.name.toLowerCase()===code.toLowerCase()))return '라인명 중복';
    if((!item.fatherId&&!item.isWild)||!item.motherId)return '부모 개체 미지정';
    if(item.fatherId===item.motherId)return '부모 개체 오류';
  }
  return '';
}
  function beetleImportRows(){
  const state=ui.bImport;
  if(!state)return '';
  const isAdult=state.tab==='adults',kind=state.tab;
  const selected=isAdult?state.selectedAdults:state.selectedLines;
  const parentsById=new Map(state.adults.map(x=>[String(x.id),x]));
  const search=String(state.search||'').toLowerCase().trim();
  const items=(isAdult?state.adults:state.lines).filter(x=>[x.code,x.species,x.line,x.origin,x.memo].some(t=>String(t||'').toLowerCase().includes(search)));
  if(!items.length)return '<div class="beetle-import-empty">표시할 기록이 없습니다.</div>';
  return items.map(x=>{
    const id=String(x.id||''),error=importEligibility(x,kind),taken=!!error;
    const details=isAdult
      ? `${esc(x.sex||'성별 미기재')} · ${esc(x.totalLength||'크기 미기재')}${x.totalLength?' mm':''} · 혈통 ${esc(lineageLabel(x.line,x.species,x.gen))}`
      : `♂ ${esc(parentsById.get(String(x.fatherId||''))?.code||'미등록')} × ♀ ${esc(parentsById.get(String(x.motherId||''))?.code||'미등록')} · ${esc(x.year||'연도 미등록')} · 유충 ${(state.individuals||[]).filter(v=>String(v.lineId)===id).length}마리`;
    return `<label class="beetle-import-item ${taken?'is-disabled':''}">
      <input type="checkbox" data-action="beetle-toggle" data-kind="${kind}" data-id="${attr(id)}" ${selected.has(id)?'checked':''} ${taken?'disabled':''} />
      <span class="beetle-import-item-info"><strong>${esc(x.code||'관리번호 없음')}</strong>${!isAdult&&db.lines.some(l=>l.beetlelogOwner===db.currentUser&&l.beetlelogId===id)?'<small>등록된 라인 · 누락 유충 추가 가능</small>':''}<span>${details}</span></span>
      ${taken?`<small class="beetle-import-status">${esc(error)}</small>`:''}
    </label>`;
  }).join('');
}
  function beetleImportModal(){
  const state=ui.bImport;
  if(!state)return '';
  const picked=state.selectedAdults.size+state.selectedLines.size;
  const content=state.loading?'<div class="beetle-import-empty">BeetleLog 계정의 성충·라인 데이터를 불러오는 중…</div>':
    state.error?`<div class="notice">${esc(state.error)}</div>`:
    `<div class="beetle-import-tabs">
      <button class="btn ${state.tab==='adults'?'btn-dark':'btn-light'}" type="button" data-action="beetle-tab" data-tab="adults">성충 ${state.adults.length}건</button>
      <button class="btn ${state.tab==='lines'?'btn-dark':'btn-light'}" type="button" data-action="beetle-tab" data-tab="lines">라인 ${state.lines.length}건</button>
     </div>
     <div class="beetle-import-tools"><label class="searchbox">${icon('search')}<input id="beetle-import-search" value="${attr(state.search)}" placeholder="관리번호 · 혈통 검색" autocomplete="off" /></label>
      <button class="btn btn-light btn-sm" type="button" data-action="beetle-all">모두 선택</button><button class="btn btn-light btn-sm" type="button" data-action="beetle-none">선택 해제</button>
     </div>
     <div class="beetle-import-scroll" id="beetle-import-list">${beetleImportRows()}</div>
     <p class="section-caption">라인을 선택하면 부모 성충과 해당 라인의 유충·병별 기록을 함께 가져옵니다. 이미 가져온 라인도 다시 선택하면 누락된 유충만 추가됩니다.</p>
     ${state.result?`<div class="notice"><strong>가져오기 결과</strong> 성충 ${Number(state.result.imported_adults||0)}건 · 라인 ${Number(state.result.imported_lines||0)}건 · 유충 ${Number(state.result.imported_larvae||0)}마리 등록 / 유충 ${Number(state.result.skipped_larvae||0)}마리 건너뜀 / 성충 ${Number(state.result.skipped_adults||0)}건 · 라인 ${Number(state.result.skipped_lines||0)}건 건너뜀${Array.isArray(state.result.issues)&&state.result.issues.length?`<p>${state.result.issues.slice(0,12).map(x=>esc(x)).join(' / ')}</p>`:''}</div>`:''}`;
  const foot=`<div class="modal-actions"><span class="beetle-import-selection">선택: 성충 ${state.selectedAdults.size} · 라인 ${state.selectedLines.size}</span><button class="btn btn-light" type="button" data-action="close-modal">닫기</button><button class="btn btn-dark" type="button" data-action="beetle-save" ${state.loading||state.saving||!!state.error||!picked?'disabled':''}>${state.saving?'가져오는 중…':'선택한 기록 가져오기'}</button></div>`;
  return modalFrame('BeetleLog에서 가져오기','같은 Google 계정의 기록 중 KML에 추가할 항목만 선택하세요.',`<div class="modal-content beetle-import-content">${content}</div>`,foot).replace('<div class="modal"','<div class="modal beetle-import-dialog"');
}
  async function openBeetleImport(kind){
  ui.bImport={tab:kind==='lines'?'lines':'adults',adults:[],lines:[],individuals:[],selectedAdults:new Set(),selectedLines:new Set(),search:'',result:null,saving:false,loading:true,error:''};
  openModal('beetle-import');
  try{
    const email=String(authUser?.email||'').toLowerCase();
    if(!email)throw Error('Google 로그인이 필요합니다.');
    const {data,error}=await supa.from('beetlelog_data').select('data,updated_at').eq('user_key','user:'+email).maybeSingle();
    if(error)throw error;
    if(!data||!data.data)throw Error('이 Google 계정에 저장된 BeetleLog 데이터가 없습니다.');
    ui.bImport.adults=Array.isArray(data.data.parents)?data.data.parents:[];
    ui.bImport.lines=Array.isArray(data.data.lines)?data.data.lines:[];
    ui.bImport.individuals=Array.isArray(data.data.individuals)?data.data.individuals:[];
  }catch(e){if(ui.bImport)ui.bImport.error='연결 실패: '+(e.message||String(e));}
  finally{if(ui.bImport){ui.bImport.loading=false;if(ui.modal?.kind==='beetle-import')renderModal();}}
}
  async function saveBeetleImport(){
  const state=ui.bImport;
  if(!state||state.loading||state.saving)return;
  const validAdults=state.adults.filter(x=>state.selectedAdults.has(String(x.id))&&!importEligibility(x,'adults')).map(x=>String(x.id));
  const validLines=state.lines.filter(x=>state.selectedLines.has(String(x.id))&&!importEligibility(x,'lines')).map(x=>String(x.id));
  if(!validAdults.length&&!validLines.length){notify('선택 가능한 기록이 없습니다.');return;}
  state.saving=true;renderModal();
  try{
    const {data,error}=await supa.rpc('kml_import_beetlelog',{p_adult_ids:validAdults,p_line_ids:validLines});
    if(error)throw error;
    await loadRemote();
    state.result=data||{};
    state.selectedAdults.clear();state.selectedLines.clear();
    render();notify(`성충 ${Number(data?.imported_adults||0)}건 · 라인 ${Number(data?.imported_lines||0)}건 · 유충 ${Number(data?.imported_larvae||0)}마리를 가져왔습니다.`);
  }catch(e){notify('가져오기 실패: '+(e.message||String(e)));}
  finally{state.saving=false;if(ui.modal?.kind==='beetle-import')renderModal();}
}

  