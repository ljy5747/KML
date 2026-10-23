function adultModal(id){const a=adult(id),t=a||{code:'',lineage:'',generation:'',sex:'M',size:'',emerged:'',breeder:db.currentUser,owner:db.currentUser,father:'',mother:'',source:'우화',status:'보유',note:''};const body=`<form id="adult-form"><input type="hidden" name="id" value="${attr(a?.id||'')}"/><div class="modal-content"><div class="form-grid"><div class="field full adult-photo-field"><label for="adult-photo-input">성충 사진 (선택)</label>
      <div class="adult-photo-row"><img id="adult-photo-preview" src="${attr(ui.adultPhotoPreview||((ui.adultPhotoReset)?defaultAdultPhoto(t.sex):specimenPhotoUrl(t)))}" alt="성충 사진 미리보기"/>
        <div class="adult-photo-controls"><input id="adult-photo-input" type="file" accept="image/jpeg,image/png,image/webp"/>
          <button type="button" class="btn btn-light btn-sm" data-action="adult-photo-remove">내 사진 제거</button>
          <small class="field-hint">사진이 없으면 성별에 맞는 왕사슴벌레 기본 이미지가 표시됩니다. 직접 올린 사진이 항상 우선합니다.</small>
        </div></div></div><div class="field"><label>관리번호 *</label><input name="code" required maxlength="60" value="${attr(t.code)}" placeholder="예: YG24-001"/></div><div class="field"><label>혈통 *</label><input name="lineage" required maxlength="80" value="${attr(t.lineage)}" placeholder="예: YG24, Wild"/></div><div class="field"><label>누대수</label><input name="generation" maxlength="30" list="adult-generation-options" value="${attr(t.generation||'')}" placeholder="예: WD, WF1, F2, CBF1"/><datalist id="adult-generation-options">${['WD','WF1','WF2','WF3','F1','F2','F3','F4','CBF1','CBF2','CBF3'].map(v=>`<option value="${v}"></option>`).join('')}</datalist></div><div class="field"><label>성별 *</label><select name="sex"><option value="M" ${t.sex==='M'?'selected':''}>♂ 수컷</option><option value="F" ${t.sex==='F'?'selected':''}>♀ 암컷</option></select></div><div class="field"><label>체장 (mm)</label><input name="size" type="number" min="0" max="200" step="0.1" value="${attr(t.size)}" placeholder="84.2"/></div><div class="field"><label>우화일</label>${datePicker({name:"emerged",value:t.emerged,label:"우화일"})}</div><div class="field"><label>보유 상태</label><select name="status">${['보유','분양','사망'].map(v=>`<option value="${attr(v)}" ${t.status===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>브리더</label><select name="breeder">${opt(db.members,t.breeder,'외부 / 미등록')}</select></div><div class="field"><label>현재 소유자</label>${isAdmin()?`<select name="owner" required ${a?'disabled':''}>${opt(db.members,t.owner,'선택')}</select>${a?`<input type="hidden" name="owner" value="${attr(t.owner)}"/>`:''}`:`<input disabled value="${attr(memberName(t.owner||db.currentUser))}"/><input type="hidden" name="owner" value="${attr(t.owner||db.currentUser)}"/><small class="field-hint">신규 성충은 자동으로 내 목록에 등록됩니다.</small>`}</div><div class="field"><label>부 ♂ (계통도 자동 연결)</label><select name="father">${opt(db.adults.filter(x=>x.sex==='M'&&x.id!==id),t.father,'미등록 / 모름')}</select></div><div class="field"><label>모 ♀ (계통도 자동 연결)</label><select name="mother">${opt(db.adults.filter(x=>x.sex==='F'&&x.id!==id),t.mother,'미등록 / 모름')}</select></div><div class="field"><label>입수 경로</label><select name="source">${['우화','입양','채집'].map(v=>`<option ${t.source===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field full"><label>개체 메모</label><textarea name="note" maxlength="1000">${esc(t.note||'')}</textarea></div></div><div class="note">관리번호는 개체를 연결하는 고유 식별값입니다. 이미 다른 개체에 사용된 번호는 중복 등록할 수 없습니다. 부·모는 등록된 개체 중에서 선택합니다.</div></div><div class="modal-actions">${a?`<button type="button" class="btn btn-red delete-record" data-action="delete-adult" data-id="${attr(a.id)}">삭제</button>`:''}<button type="button" class="btn btn-light" data-action="close-modal">취소</button><button type="submit" class="btn btn-dark">${a?'변경사항 저장':'성충 등록'}</button></div></form>`;return modalFrame(a?'성충 정보 수정':'새 성충 등록','왕사슴벌레 개체 정보를 입력합니다.',body);}
  function suggestLineGeneration(father,mother,isWild=false){
    if(!mother)return '';
    if(isWild)return 'WF1';
    if(!father)return '';
    const gf=String(father.generation||'').trim().toUpperCase(),gm=String(mother.generation||'').trim().toUpperCase();
    if(!gf||!gm)return '';
    const lineage=x=>String(x.lineage||'').trim().toLowerCase();
    const same=lineage(father)!==''&&!['미상','—','-'].includes(lineage(father))&&lineage(father)===lineage(mother);
    if(gf==='WD'&&gm==='WD')return same?'WF1':'CBF1';
    if(gf==='WD'||gm==='WD')return 'CBF1';
    const f=gf.match(/^(CBF|WF|F)(\d+)$/),m=gm.match(/^(CBF|WF|F)(\d+)$/);
    if(!f||!m)return '';
    return same?(f[1]===m[1]?f[1]:'F')+(Math.min(Number(f[2]),Number(m[2]))+1):'CBF1';
  }
  function updateLineGeneration(force=false){
    const form=document.getElementById('line-form');if(!form)return;
    const father=form.elements.namedItem('father'),mother=form.elements.namedItem('mother');
    const wild=form.elements.namedItem('isWild').checked,field=form.elements.namedItem('generation');
    father.required=!wild;
    const label=form.querySelector('[data-line-father-label]');if(label)label.textContent=wild?'부 ♂ (선택)':'부 ♂ *';
    const suggested=suggestLineGeneration(adult(father.value),adult(mother.value),wild);
    if(force||field.dataset.manual!=='true'){field.value=suggested;field.dataset.manual='false';}
    const hint=form.querySelector('[data-line-generation-hint]');
    if(hint)hint.textContent=suggested?'자동 계산값: '+suggested+' · 직접 수정할 수 있습니다.':'부모의 혈통·누대수를 확인하거나 직접 입력하세요.';
  }
  function lineModal(id){
    const l=byId(db.lines,id),wild=!!l?.isWild;
    const suggested=suggestLineGeneration(adult(l?.father),adult(l?.mother),wild);
    const body=`<form id="line-form"><input type="hidden" name="id" value="${attr(l?.id||'')}"/><div class="modal-content"><div class="form-grid">
      <div class="field"><label>라인명 *</label><input name="name" required maxlength="80" value="${attr(l?.name||'')}" placeholder="예: YG26-A"/></div>
      <div class="field"><label>시즌 (연도)</label>${yearPicker({name:"year",value:l?.year,label:"시즌 연도"})}</div>
      <div class="field full wild-line-field"><label class="wild-line-toggle"><input type="checkbox" name="isWild" ${wild?'checked':''}/><span>Wild</span></label><small class="field-hint">Wild를 체크하면 수컷 정보 없이 암컷만으로 라인을 만들 수 있습니다.</small></div>
      <div class="field"><label data-line-father-label>${wild?'부 ♂ (선택)':'부 ♂ *'}</label><select name="father" ${wild?'':'required'}>${opt(db.adults.filter(x=>x.sex==='M'),l?.father||'',wild?'미등록 / 모름':'수컷 개체 선택')}</select></div>
      <div class="field"><label>모 ♀ *</label><select name="mother" required>${opt(db.adults.filter(x=>x.sex==='F'),l?.mother||'','암컷 개체 선택')}</select></div>
      <div class="field full"><label>누대수</label><div class="line-generation-controls"><input name="generation" maxlength="30" value="${attr(l?.generation||suggested)}" data-manual="${l?.generation?'true':'false'}" placeholder="예: WF1, F3, CBF1"/><button type="button" class="btn btn-light btn-sm" data-action="line-generation-auto">자동 계산</button></div><small class="field-hint" data-line-generation-hint>${suggested?'자동 계산값: '+esc(suggested)+' · 직접 수정할 수 있습니다.':'부모의 혈통·누대수를 확인하거나 직접 입력하세요.'}</small></div>
      <div class="field full"><label>메모</label><textarea name="note" maxlength="700" placeholder="산란 세팅, 교배 이력 등">${esc(l?.note||'')}</textarea></div>
      </div><div class="note">일반 라인은 부·모 성충이 필요하고, Wild 라인은 모 성충만 있어도 됩니다. 누대수는 자동 계산하거나 직접 입력할 수 있습니다.</div></div>
      <div class="modal-actions">${l?`<button type="button" class="btn btn-red delete-record" data-action="delete-line" data-id="${attr(l.id)}">삭제</button>`:''}<button type="button" class="btn btn-light" data-action="close-modal">취소</button><button class="btn btn-dark" type="submit">${l?'변경사항 저장':'라인 생성'}</button></div></form>`;
    return modalFrame(l?'라인 정보 수정':'새 라인 생성','등록된 성충으로 일반·Wild 라인을 관리합니다.',body);
  }
  function transferModal(id){const a=adult(id);if(!a)return '';const body=`<form id="transfer-form"><input type="hidden" name="id" value="${attr(id)}"/><div class="modal-content"><div class="form-grid"><div class="field full"><label>선택 개체</label><input disabled value="${attr(a.code)}"/></div><div class="field"><label>현재 소유자</label><input disabled value="${attr(memberName(a.owner))}"/></div><div class="field"><label>새 소유자 *</label><select name="to" required>${opt(db.members.filter(x=>x.id!==a.owner),'','회원 선택')}</select></div><div class="field"><label>이동일 *</label>${datePicker({name:"date",value:dateToday(),label:"이동일",required:true})}</div><div class="field full"><label>이동 메모</label><textarea name="note" placeholder="분양, 사육 이관 등"></textarea></div></div><div class="note">브리더와 개체 관리번호는 그대로 유지하고, 소유자 및 이동 기록만 업데이트합니다.</div></div><div class="modal-actions"><button type="button" class="btn btn-light" data-action="close-modal">취소</button><button class="btn btn-dark" type="submit">소유자 변경 저장</button></div></form>`;return modalFrame('소유자 변경','브리더 간 개체 양도·이동 이력을 기록합니다.',body);}
  // Keep the page behind a dialog stationary, especially in mobile Safari.
  