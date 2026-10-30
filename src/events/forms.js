  document.addEventListener('change',e=>{if(e.target.matches?.('#adult-form select[name=breeder]'))updateAdultBreederField(e.target);});
  document.addEventListener('change',e=>{const map={'sex-filter':'sex','year-filter':'year','status-filter':'status','sort-filter':'sort'};if(map[e.target.id]){ui[map[e.target.id]]=e.target.value;updateAdultsTable();}});
  document.addEventListener('submit',async e=>{
    const form=e.target;const formId=form.getAttribute('id');if(!['adult-form','line-form','profile-form','transfer-form','comment-form','larva-form'].includes(formId))return;e.preventDefault();if(formId==='larva-form'){await saveLarvaEditor(form);return;}const f=new FormData(form);const data=Object.fromEntries(f.entries());
    if(formId==='adult-form'){
       if(data.id){const x=adult(data.id);if(!x||(!mineAdult(x)&&!isAdmin()))return notify('본인 소유 개체만 수정할 수 있습니다.');}
      const code=String(data.code||'').trim(),lineage=String(data.lineage||'').trim();if(!code||!lineage)return notify('관리번호와 혈통을 입력하세요.');
      if(db.adults.some(x=>x.code.toLowerCase()===code.toLowerCase()&&x.id!==data.id))return notify('이미 사용 중인 관리번호입니다.');
      if(data.father&&data.father===data.mother)return notify('부모는 다른 개체여야 합니다.');
      const old=data.id?adult(data.id):null;let people;try{people={...adultPeopleValues(data,old),...adultDateValues(data)};}catch(error){return notify(error.message);}
      const next={id:data.id||uid(),code,lineage:/^(WD|wild|와일드)$/i.test(lineage)?'Wild':lineage,generation:String(data.generation||'').trim().toUpperCase(),sex:data.sex,size:data.size,...people,father:data.father,mother:data.mother,source:data.source,status:data.status,note:data.note,photoUrl:ui.adultPhotoReset?'':(ui.adultPhotoPreview||old?.photoUrl||'')};
      // Prevent circular parent references (including indirect loops).
      const reaches=(start,target,seen=new Set())=>{if(!start||seen.has(start))return false;if(start===target)return true;seen.add(start);const a=adult(start);return a?reaches(a.father,target,seen)||reaches(a.mother,target,seen):false;};
      if(reaches(next.father,next.id)||reaches(next.mother,next.id))return notify('부모·자손 관계가 순환합니다. 다른 개체를 선택하세요.');
      try{const stored=await persist('kml_adults',next.id,adultRecord(next),Boolean(data.id));next.createdAt=stored.created_at||old?.createdAt||'';next.updatedAt=stored.updated_at;}catch(err){return notify('성충 저장 실패: '+(err.message||err));}
      if(!data.id)db.adults.push(next);else{const ix=db.adults.findIndex(x=>x.id===data.id);if(ix<0)return notify('기존 개체를 찾을 수 없습니다.');db.adults[ix]=next;}
      save();closeModal();go('adult/'+next.id);render();notify(data.id?'성충 정보를 수정했습니다.':'성충을 등록했습니다.');
    }
    if(formId==='line-form'){
      const name=String(data.name||'').trim();const wild=data.isWild==='on';if(!name||!data.mother||(!wild&&!data.father))return notify(wild?'라인명과 모 성충을 선택하세요.':'라인명과 부모 개체를 선택하세요.');if(db.lines.some(x=>x.name.toLowerCase()===name.toLowerCase()&&x.id!==data.id))return notify('이미 같은 라인명이 있습니다.');if(data.father===data.mother)return notify('부모 개체를 서로 다르게 선택하세요.');const old=data.id?byId(db.lines,data.id):null;if(data.id&&(!old||(!mineLine(old)&&!isAdmin())))return notify('본인이 만든 라인만 수정할 수 있습니다.');if(data.id&&data.version&&data.version!==old.updatedAt)return notify('라인이 다른 앱에서 변경됐습니다. 최신 내용을 확인한 뒤 다시 수정하세요.');let createdBy;try{createdBy=lineBreederValue(data,old);}catch(error){return notify(error.message);}const l={...(old||{}),id:data.id||uid(),name,father:data.father||'',mother:data.mother,year:data.year,generation:String(data.generation||'').trim().toUpperCase(),isWild:wild,method:old?.method||'',note:data.note,createdBy};try{const stored=await persist('kml_lines',l.id,lineRecord(l),Boolean(data.id));l.createdAt=stored.created_at||old?.createdAt||'';l.updatedAt=stored.updated_at;}catch(err){return notify('라인 저장 실패: '+(err.message||err));}if(data.id){const index=db.lines.findIndex(x=>x.id===l.id);if(index>=0)db.lines[index]=l;}else db.lines.push(l);save();closeModal();go('line/'+l.id);render();notify(data.id?'라인을 수정했습니다.':'라인을 생성했습니다.');
    }
    if(formId==='transfer-form'){await submitTransfer(form);return;}
    if(formId==='profile-form'){
      const me=current();const nickname=String(data.nickname||'').trim();if(!nickname)return notify('닉네임을 입력하세요.');const intro=String(data.intro||'');let avatar_url=me.avatar_url||'';
      try{if(ui.photoReset)avatar_url='';else if(ui.photoPreview)avatar_url=ui.photoPreview;else if(data.photo?.size)avatar_url=await photoToJpeg(data.photo);}catch(err){return notify('사진 처리 실패: '+(err.message||err));}
      const {error:pe}=await supa.from('kml_profiles').update({nickname,intro,avatar_url}).eq('user_id',db.currentUser);
      if(pe)return notify('프로필 저장 실패: '+pe.message);
      me.nickname=nickname;me.initial=nickname[0];me.intro=intro;me.avatar_url=avatar_url;ui.photoPreview=null;ui.photoReset=false;save();render();notify('프로필을 저장했습니다.');
    }
    if(formId==='comment-form'){
      const body=String(data.body||'').trim();if(!body)return notify('댓글 내용을 입력하세요.');const comment={id:uid(),adultId:form.dataset.adultId,memberId:db.currentUser,body,date:dateToday()};const {error:ce}=await supa.from('kml_comments').insert({id:comment.id,adult_id:comment.adultId,member_id:comment.memberId,body:comment.body});if(ce)return notify('댓글 저장 실패: '+ce.message);db.comments.push(comment);save();render();notify('댓글을 저장했습니다.');
    }
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ui.modal)closeModal();const box=e.target.closest('[data-nav][role="button"]');if(box&&(e.key==='Enter'||e.key===' ')){e.preventDefault();go(box.dataset.nav);}});
  window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);});
  // Cross-app updates become visible without page reload. Do not interrupt edits.
  