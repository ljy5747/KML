  document.addEventListener('input',e=>{
    if(e.target.matches('#line-form [name="generation"]')){
      e.target.dataset.manual=e.target.value.trim()?'true':'false';return;
    }
    if(e.target.id==='beetle-import-search'&&ui.bImport){
      ui.bImport.search=e.target.value;
      const el=document.getElementById('beetle-import-list');if(el)el.innerHTML=beetleImportRows();
    }
    if(e.target.id==='adult-search'){ui.search=e.target.value;updateAdultsTable();}if(e.target.id==='line-search'){ui.lineSearch=e.target.value;document.getElementById('line-cards').innerHTML=db.lines.filter(x=>route().page==='archive'||mineLine(x)).filter(x=>[x.name,x.method,x.year].some(s=>String(s||'').toLowerCase().includes(ui.lineSearch.toLowerCase()))).map(lineCard).join('')||'<div class="panel section-pad">검색 결과가 없습니다.</div>';}});
  const photoToJpeg=(file,dimension=256,maxLength=120000)=>new Promise((resolve,reject)=>{
    if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))return reject(Error('JPG, PNG, WEBP 이미지만 등록할 수 있습니다.'));
    if(file.size>12*1024*1024)return reject(Error('이미지는 12MB 이하만 등록할 수 있습니다.'));
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=()=>{
      try{
        const canvas=document.createElement('canvas');canvas.width=dimension;canvas.height=dimension;
        const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,dimension,dimension);
        const side=Math.min(img.naturalWidth,img.naturalHeight);
        ctx.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,dimension,dimension);
        const data=canvas.toDataURL('image/jpeg',0.76);
        URL.revokeObjectURL(url);
        if(data.length>maxLength)reject(Error('압축된 사진이 너무 큽니다. 다른 사진을 사용하세요.'));
        else resolve(data);
      }catch(e){URL.revokeObjectURL(url);reject(e);}
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('사진을 읽을 수 없습니다.'));};
    img.src=url;
  });
  document.addEventListener('click',e=>{
    const reset=e.target.closest('[data-action="reset-profile-photo"]');
    if(reset){const file=document.getElementById('profile-photo');if(file)file.value='';ui.photoReset=true;const photo=document.querySelector('.profile-photo-row .avatar-large');if(photo)photo.textContent=current()?.nickname?.[0]||'?';notify('사진 초기화가 선택됐습니다. 저장을 눌러 적용하세요.');}
  });
  document.addEventListener('change',async e=>{
    if(e.target.matches('[data-year-select]')){
      updateYearButtons(e.target);const picker=e.target.closest('[data-date-picker]');if(picker)syncDatePicker(picker);return;
    }
    if(e.target.matches('[data-date-month],[data-date-day]')){syncDatePicker(e.target.closest('[data-date-picker]'));return;}
    if(e.target.matches('#line-form [name="father"],#line-form [name="mother"],#line-form [name="isWild"]')){
      updateLineGeneration();return;
    }
    if(e.target.matches('#adult-form [name="sex"]')){
      if(!ui.adultPhotoPreview){
        const existing=adult(ui.modal?.id);
        const preview=document.getElementById('adult-photo-preview');
        if(preview)preview.src=specimenPhotoUrl({...existing,sex:e.target.value,photoUrl:ui.adultPhotoReset?'':existing?.photoUrl});
      }
      return;
    }
    if(e.target.id==='adult-photo-input'&&e.target.files?.[0]){
      try{
        const photo=await photoToJpeg(e.target.files[0],512,270000);
        if(ui.modal?.kind!=='adult')return;
        ui.adultPhotoPreview=photo;ui.adultPhotoReset=false;
        const preview=document.getElementById('adult-photo-preview');if(preview)preview.src=photo;
      }catch(error){notify('사진 처리 실패: '+(error.message||String(error)));e.target.value='';}
      return;
    }
    if(e.target.id!=='profile-photo'||!e.target.files?.[0])return;
    try{
      const url=await photoToJpeg(e.target.files[0]);ui.photoPreview=url;ui.photoReset=false;
      const photo=document.querySelector('.profile-photo-row .avatar-large');
      if(photo)photo.innerHTML='<img src="'+url+'" alt="선택한 프로필 사진 미리보기" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
    }catch(err){e.target.value='';notify(err.message||String(err));}
  });
