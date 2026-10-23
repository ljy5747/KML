function route(){const p=(location.hash||'#/').replace(/^#\/?/,'').split('/').filter(Boolean);return {page:p[0]||'dashboard',id:p[1]||''};}
  const isStandaloneApp=()=>window.navigator?.standalone===true||window.matchMedia?.('(display-mode: standalone)')?.matches===true;
  function showStandaloneHome(renderPage=true){
    // Do not discard an edit or a native photo-picker round trip.
    if(!isStandaloneApp()||ui.modal||preserveSpecimenDetail())return;
    const changed=location.hash!=='#/dashboard'||ui.menu;
    ui.menu=false;
    history.replaceState(history.state,'',location.pathname+location.search+'#/dashboard');
    if(renderPage&&allowed&&changed)render();
    window.scrollTo({top:0,left:0,behavior:'instant'});
  }
  const go=(target)=>{ui.menu=false;const hash='#/'+target;if(location.hash===hash){render();window.scrollTo(0,0);}else location.hash=hash;};
  const activeNav=(page,key)=>page===key;
  const navBtn=(key,label,ico,page)=>`<button class="nav-item ${activeNav(page,key)?'active':''}" data-nav="${key}">${icon(ico)}<span>${label}</span>${activeNav(page,key)?icon('chevron'):''}</button>`;
  function shell(page){
    const c=current();
    return `<div class="app-shell"><div class="sidebar-overlay ${ui.menu?'open':''}" data-action="close-menu"></div><aside class="sidebar ${ui.menu?'open':''}"><button type="button" class="brand brand-home" data-nav="dashboard" aria-label="KML 홈으로 이동"><span class="brand-mark brand-mark--official"><img src="${OFFICIAL_LOGO}" class="brand-official-logo" alt="" /></span><span class="brand-name">KML<small>국균연구소 · BREEDERS CLUB</small></span></button><div class="nav-label">HOME</div>${navBtn('dashboard','국균연구소 DB','home',page)}<div class="nav-label">MY PAGE</div>${navBtn('adults','성충 관리','bug',page)}${navBtn('lines','라인 관리','layers',page)}${navBtn('profile','프로필','user',page)}<div class="sidebar-bottom"><div class="sidebar-foot">${avatar(c)}<div class="sidebar-user"><strong>${esc(c.nickname)}</strong><span>KML 승인 회원 · ${esc(c.role)}</span></div></div><div class="build-tag">KML · BREEDER HUB</div></div></aside><div class="main-wrap"><header class="topbar"><div class="breadcrumb"><button class="icon-btn mobile-menu" data-action="toggle-menu" aria-label="메뉴 열기">${icon('menu')}</button><button type="button" class="kml-home" data-nav="dashboard" aria-label="KML 홈으로 이동">KML</button>${icon('chevron')}<b>${esc({dashboard:'국균연구소 DB',adults:'성충 관리',adult:'개체 상세',larva:'유충 상세',lines:'라인 관리',line:'라인 상세',members:'브리더 목록',mypage:'마이페이지',registry:'전체 성충',archive:'전체 라인',profile:'내 프로필',data:'데이터 관리'}[page]||'페이지')}</b></div><div class="top-actions"><span class="demo-ribbon">승인된 브리더 전용</span><button class="icon-btn" data-action="sign-out" title="로그아웃">${icon('logout')}</button><button class="top-profile" data-nav="profile" aria-label="내 프로필 열기">${avatar(c)}<span>${esc(c.nickname)}</span></button></div></header><main class="page" id="page-content"></main></div></div><div id="modal-root"></div>`;
  }
  const pageHead=(eyebrow,title,desc,actions='')=>`<div class="page-title"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><div class="subline">${desc}</div></div><div class="actions">${actions}</div></div>`;
  const button=(name,action,cls='btn-dark',ico='plus')=>`<button type="button" class="btn ${cls}" data-action="${action}">${icon(ico)} ${name}</button>`;
  