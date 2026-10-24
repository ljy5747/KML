document.addEventListener('click',async event=>{
    const nav=event.target.closest('[data-nav]');if(nav){if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();go(nav.dataset.nav);return;}
    const a=event.target.closest('[data-action]');if(!a)return;
    const act=a.dataset.action;
    if(act==='edit-larva'){const v=byId(db.larvae,a.dataset.id);if(v&&canEditLarvaLine(byId(db.lines,v.lineId)))openModal('larva',v.id);else notify('본인 라인의 유충만 수정할 수 있습니다.');return;}
    if(act==='add-larva-record'){addLarvaEditorRow();return;}
    if(act==='remove-larva-record'){if(confirm('이 병 기록을 제거할까요? 저장하면 반영됩니다.'))a.closest('[data-larva-record]').remove();return;}
    if(act==='detail-specimen-view'){switchSpecimenView(a.dataset.view);return;}
    if(act==='save-specimen-label'){await saveSpecimenLabel(a);return;}
    if(act==='clear-label-feed'){clearLabelFeed(a.dataset.feed);return;}
    if(act==='refill-specimen-label'){refillSpecimenLabel();return;}
    if(act==='reset-label-inputs'){resetLabelInputs();return;}
    if(act==='year-step'){stepYear(a);return;}
    if(act==='toggle-menu'){ui.menu=!ui.menu;render();}
    if(act==='close-menu'){ui.menu=false;render();}
    if(act==='new-adult')openModal('adult');
    if(act==='adult-photo-remove'){
      ui.adultPhotoPreview=null;ui.adultPhotoReset=true;
      const thumb=document.getElementById('adult-photo-preview');if(thumb)thumb.src=defaultAdultPhoto(document.querySelector('#adult-form [name="sex"]')?.value);
      const input=document.getElementById('adult-photo-input');if(input)input.value='';
      notify('사진을 제거할 예정입니다. 저장하면 기본 이미지가 표시됩니다.');
    }
    if(act==='beetle-import')await openBeetleImport(a.dataset.type);
    if(act==='beetle-tab'&&ui.bImport){ui.bImport.tab=a.dataset.tab;ui.bImport.search='';renderModal();}
    if(act==='beetle-toggle'&&ui.bImport){
      const sel=a.dataset.kind==='lines'?ui.bImport.selectedLines:ui.bImport.selectedAdults;
      if(sel.has(a.dataset.id))sel.delete(a.dataset.id);else sel.add(a.dataset.id);
      renderModal();
    }
    if(act==='beetle-all'&&ui.bImport){
      const k=ui.bImport,kind=k.tab,sel=kind==='lines'?k.selectedLines:k.selectedAdults;
      const search=k.search.toLowerCase().trim();
      for(const x of kind==='lines'?k.lines:k.adults){
        if(!importEligibility(x,kind)&&[x.code,x.species,x.line,x.origin,x.memo].some(v=>String(v||'').toLowerCase().includes(search)))sel.add(String(x.id));
      }
      renderModal();
    }
    if(act==='beetle-none'&&ui.bImport){
      (ui.bImport.tab==='lines'?ui.bImport.selectedLines:ui.bImport.selectedAdults).clear();renderModal();
    }
    if(act==='beetle-save')await saveBeetleImport();
    if(act==='edit-adult'){const x=adult(a.dataset.id||route().id);if(x&&(mineAdult(x)||isAdmin()))openModal('adult',x.id);else notify('본인 소유 개체만 수정할 수 있습니다.');}
    if(act==='delete-adult'||act==='delete-line'){
      if(a.disabled)return;
      const kind=act==='delete-adult'?'adult':'line';
      const item=kind==='adult'?adult(a.dataset.id):byId(db.lines,a.dataset.id);
      if(!item||!(isAdmin()||(kind==='adult'?mineAdult(item):mineLine(item))))return notify('본인 기록만 삭제할 수 있습니다.');
      const count=kind==='line'?db.larvae.filter(v=>v.lineId===item.id).length:0;
      const message=kind==='line'?`라인 "${item.name}"과 소속 유충 ${count}마리의 사육 기록을 삭제할까요?\n이 작업은 되돌릴 수 없습니다. BeetleLog 원본은 유지됩니다.`:`성충 "${item.code}"을 삭제할까요?\n연결된 계통·라인·댓글·이동 기록이 있으면 삭제할 수 없습니다. BeetleLog 원본은 유지됩니다.`;
      if(!confirm(message))return;
      a.disabled=true;
      try{
        const {error}=await supa.rpc('kml_delete_record',{p_kind:kind,p_id:item.id,p_updated_at:item.updatedAt});
        if(error)throw error;
        await loadRemote();closeModal();go(kind==='line'?'lines':'adults');
        notify(kind==='line'?'라인과 소속 유충 기록을 삭제했습니다.':'성충을 삭제했습니다.');
      }catch(error){a.disabled=false;notify('삭제 실패: '+(error.message||String(error)));}
      return;
    }
    if(act==='line-generation-auto'){updateLineGeneration(true);return;}
    if(act==='new-line')openModal('line');
    if(act==='edit-line'){const l=byId(db.lines,a.dataset.id||route().id);if(l&&(mineLine(l)||isAdmin()))openModal('line',l.id);else notify('본인이 만든 라인만 수정할 수 있습니다.');}
    if(act==='transfer'){const x=adult(a.dataset.id);if(x&&(mineAdult(x)||isAdmin()))openModal('transfer',x.id);else notify('본인 소유 개체만 이동할 수 있습니다.');}
    if(act==='close-modal')closeModal();
    if(act==='modal-backdrop'&&event.target===a)closeModal();
    if(act==='delete-comment'){if(confirm('이 댓글을 삭제할까요?')){const {error:de}=await supa.from('kml_comments').delete().eq('id',a.dataset.id);if(de)return notify('댓글 삭제 실패: '+de.message);db.comments=db.comments.filter(c=>c.id!==a.dataset.id);render();notify('댓글을 삭제했습니다.');}}
    if(act==='check-beetle'){
      const result=document.getElementById('beetle-connect-result');
      if(result)result.textContent='BeetleLog 서버 기록 확인 중…';
      try {
        const email=String(authUser?.email||'').toLowerCase();
        if(!email)throw Error('Google 로그인이 필요합니다.');
        const {data:row,error}=await supa.from('beetlelog_data').select('data,updated_at').eq('user_key','user:'+email).maybeSingle();
        if(error)throw error;
        if(!row){if(result)result.textContent='연결 성공 · 이 Google 계정에 저장된 BeetleLog 기록은 아직 없습니다.';}
        else{
          const p=Array.isArray(row.data?.parents)?row.data.parents:[];
          const l=Array.isArray(row.data?.lines)?row.data.lines:[];
          const king=x=>/왕사슴벌레|dorcus[ ._-]*hopei|binodulosus|オオクワ/i.test(String(x?.species||''));
          const np=p.filter(king).length,nl=l.filter(king).length;
          if(result)result.textContent='계정 연결 성공 · BeetleLog 성충 '+p.length+'건 / 라인 '+l.length+'건 확인 · KML 대상 왕사슴벌레 성충 '+np+'건 / 라인 '+nl+'건 · 원본 보존';
        }
      }catch(err){if(result)result.textContent='연결 확인 실패: '+(err.message||String(err));}
    }
    if(act==='excel-not-ready')notify('엑셀 업로드는 다음 개발 단계에서 연결합니다. 현재는 미구현 기능입니다.');
    if(act==='download-line')downloadCSV(a.dataset.id);
    if(act==='google-login'){if(!supa)return;const redirectTo=location.origin+location.pathname;const {error:e}=await supa.auth.signInWithOAuth({provider:'google',options:{redirectTo}});if(e)notify('Google 로그인 오류: '+e.message);}
    if(act==='sign-out'){clearDetailLabels();await supa?.auth.signOut();allowed=false;authUser=null;db={members:[],adults:[],lines:[],larvae:[],comments:[],transfers:[],currentUser:null};gate();}
  });