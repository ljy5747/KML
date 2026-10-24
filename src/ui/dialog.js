let modalScrollY=null;
  let bodyBeforeModal=null;
  // Keep dialog position fixed. Visual viewport scrolling must never move the dialog.
  let modalViewport=null,modalViewportFrame=0;
  const modalViewportTargetHeight=()=>{
    const visual=window.visualViewport;
    const width=window.innerWidth;
    const height=Math.round(visual?.height||window.innerHeight);
    if(!modalViewport||Math.abs(modalViewport.width-width)>40){
      modalViewport={width,baseHeight:height,height:0};
    }
    // Freeze browser-toolbar changes. Only a keyboard-sized reduction changes dialog height.
    return height<modalViewport.baseHeight-120?height:modalViewport.baseHeight;
  };
  function syncModalViewport(){
    const overlay=document.querySelector('#modal-root .modal-backdrop');
    if(!overlay||window.visualViewport?.scale>1.05)return;
    const height=modalViewportTargetHeight();
    if(Math.abs(modalViewport.height-height)<3)return;
    modalViewport.height=height;
    overlay.style.setProperty('--kml-dialog-viewport-height',height+'px');
  }
  function scheduleModalViewport(){
    if(!ui.modal||modalViewportFrame)return;
    modalViewportFrame=requestAnimationFrame(()=>{modalViewportFrame=0;syncModalViewport();});
  }
  window.visualViewport?.addEventListener('resize',scheduleModalViewport);
  window.addEventListener('resize',scheduleModalViewport);
  let lastModalKey='';
  function renderModal(){
    const root=document.getElementById('modal-root');
    if(!root)return;
    if(ui.modal&&modalScrollY===null){
      modalScrollY=window.scrollY||window.pageYOffset||0;
      modalViewport=null;
      document.documentElement.classList.add('kml-modal-open');
      bodyBeforeModal={position:document.body.style.position,top:document.body.style.top,
        width:document.body.style.width,left:document.body.style.left,right:document.body.style.right,
        overflow:document.body.style.overflow};
      Object.assign(document.body.style,{position:'fixed',top:-modalScrollY+'px',
        width:'100%',left:'0',right:'0',overflow:'hidden'});
    }
    const modalKey=ui.modal?ui.modal.kind+':'+(ui.modal.id||''):'';
    const scrollTop=modalKey===lastModalKey?(root.querySelector('.modal-content')?.scrollTop||0):0;
    root.innerHTML=ui.modal?.kind==='larva'?larvaModal(ui.modal.id):ui.modal?.kind==='adult'?adultModal(ui.modal.id):ui.modal?.kind==='line'?lineModal(ui.modal.id):ui.modal?.kind==='transfer'?transferModal(ui.modal.id):ui.modal?.kind==='beetle-import'?beetleImportModal():'';
    lastModalKey=modalKey;
    if(ui.modal){
      const content=root.querySelector('.modal-content');
      if(content)content.scrollTop=scrollTop;
      // The new overlay needs the current height even if the viewport did not resize.
      if(modalViewport)modalViewport.height=0;
      syncModalViewport();
    }else if(modalScrollY!==null){
      const top=modalScrollY,original=bodyBeforeModal||{};
      Object.assign(document.body.style,original);
      bodyBeforeModal=null;
      modalScrollY=null;
      if(modalViewportFrame)cancelAnimationFrame(modalViewportFrame);
      modalViewportFrame=0;modalViewport=null;
      window.scrollTo(0,top);
      document.documentElement.classList.remove('kml-modal-open');
    }
  }
  function render(){if(!allowed){gate();return;}const r=route();if(r.page==='members'&&!isAdmin()){go('dashboard');return;}if(!['adult','larva'].includes(r.page))leaveSpecimenDetail();app.innerHTML=shell(r.page);document.getElementById('page-content').innerHTML= r.page==='notifications'?notificationsPage():r.page==='dashboard'?dashboard():r.page==='mypage'?myPage():r.page==='adults'||r.page==='registry'?adultsPage():r.page==='breeder'?breederPage(r.id):r.page==='adult'?adultDetail(r.id):r.page==='larva'?larvaDetail(r.id):r.page==='lines'||r.page==='archive'?linesPage():r.page==='line'?lineDetail(r.id):r.page==='members'&&isAdmin()?membersPage():r.page==='profile'?profilePage():r.page==='data'?dataPage():dashboard();renderModal();mountSpecimenTools();mountSocial();document.title=`KML | ${({notifications:'알림',breeder:'브리더 기록',dashboard:'국균연구소 DB',adults:'성충 관리',adult:'개체 상세',larva:'유충 상세',lines:'라인 관리',line:'라인 상세',members:'브리더 목록',mypage:'마이페이지',registry:'전체 성충',archive:'전체 라인',profile:'내 프로필',data:'데이터 관리'})[r.page]||'국균연구소'}`;}
  function openModal(kind,id=''){ui.modal={kind,id};ui.adultPhotoPreview=null;ui.adultPhotoReset=false;renderModal();}
  function closeModal(){ui.modal=null;ui.adultPhotoPreview=null;ui.adultPhotoReset=false;renderModal();}
  