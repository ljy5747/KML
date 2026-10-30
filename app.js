/* Generated from src/. Run node scripts/build.mjs; edit source files, not this bundle. */
(() => {
  'use strict';
  const PROJECT_URL = 'https://qybgsztoegkzqsdipili.supabase.co';
  // Publishable key is intentionally public. All KML records are secured with Supabase RLS.
  const PUBLISHABLE_KEY = 'sb_publishable_IwNmQESmOgj-DHR0sxOIlw_4EKsa4wu';
  const OFFICIAL_LOGO = 'assets/kml-official-logo.svg';
  const DEFAULT_ADULT_PHOTO = 'assets/king-stag-default.jpg';
  const DEFAULT_FEMALE_PHOTO = 'assets/king-stag-female-default.jpg';
  const defaultAdultPhoto = sex => /^(F|female)$/i.test(String(sex||'').trim()) || /암컷|♀/.test(String(sex||'')) ? DEFAULT_FEMALE_PHOTO : DEFAULT_ADULT_PHOTO;
  const specimenPhotoUrl = a => (/^(https:\/\/|data:image\/(jpeg|png|webp);base64,)/i.test(String(a?.photoUrl||'')) ? a.photoUrl : defaultAdultPhoto(a?.sex));
  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  const supa = window.supabase?.createClient(PROJECT_URL, PUBLISHABLE_KEY,
    {auth:{flowType:'pkce',autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
  let db={members:[],adults:[],lines:[],larvae:[],comments:[],transfers:[],currentUser:null};
  let authReady=false, allowed=false, loginError='', authUser=null, role='member';
  const ui = {search:'', sex:'all', status:'all', year:'all', sort:'code', lineSearch:'', modal:null, menu:false, adultPhotoPreview:null, adultPhotoReset:false};
  const esc=(v)=>String(v ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const attr=esc;
  const byId=(arr,id)=>arr.find(x=>x.id===id);
  const member=(id)=>byId(db.members,id);
  const memberName=(id)=>member(id)?.nickname || '외부 / 미등록';
  const adult=(id)=>byId(db.adults,id);
  const isAdmin=()=>role==='admin';
  const mineAdult=(x)=>x.owner===db.currentUser;
  const mineLine=(x)=>x.createdBy===db.currentUser;
  const dateToday=()=>new Date().toISOString().slice(0,10);
  const save=()=>{}; // Live mutations are persisted explicitly before updating the UI.
  const notify=(message)=>{toastEl.textContent=message;toastEl.className='toast show';clearTimeout(notify.timer);notify.timer=setTimeout(()=>toastEl.className='toast',3200);};
  const uid=()=>crypto.randomUUID();
  const svg=(paths)=>`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const I={
    help:'<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3m.1 4h.01"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    home:'<path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9"/><path d="M9 21v-7h6v7"/>',
    bug:'<path d="M12 9v13M8 9h8M7 14H3m18 0h-4M7 18l-3 2m13-2 3 2M8 7 6 4m10 3 2-3"/><rect x="7" y="8" width="10" height="14" rx="5"/><circle cx="12" cy="6" r="3"/>',
    layers:'<path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    chevron:'<path d="m9 18 6-6-6-6"/>',
    arrow:'<path d="M5 12h14m-7-7 7 7-7 7"/>',
    back:'<path d="m14 6-6 6 6 6"/>',
    edit:'<path d="M12 20h9M16 4l4 4L9 19l-5 1 1-5L16 4Z"/>',
    message:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5Z"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
    family:'<circle cx="12" cy="4" r="2"/><path d="M12 6v5m0 0H5v5m7-5h7v5"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
    close:'<path d="M18 6 6 18M6 6l12 12"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
    sort:'<path d="M8 4v16m-4-4 4 4 4-4M16 20V4m-4 4 4-4 4 4"/>',
    chart:'<path d="M3 3v18h18M7 15l4-4 3 2 5-7"/>',
    logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    check:'<path d="m5 12 5 5L20 7"/>',
    alert:'<path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18.4a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
    upload:'<path d="M12 16V3m-4 4 4-4 4 4M4 17v4h16v-4"/>'
  };
  const icon=(name)=>svg(I[name]||I.more);
  const beetleArt=()=>`<svg viewBox="0 0 280 290" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="none" stroke="#cfb17e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M114 62C86 40 83 14 101 9c16 6 26 16 39 26 13-10 23-20 39-26 18 5 15 31-13 53"/><path d="M114 52C100 67 97 82 97 99m69-47c14 15 17 30 17 47"/><ellipse cx="140" cy="104" rx="33" ry="41"/><ellipse cx="140" cy="190" rx="49" ry="82"/><path d="M140 110v162M97 140 65 114l-21 1M95 175l-44-5-21 17M95 210l-45 17-14 27m147-114 32-26 21 1m-51 60 44-5 21 17m-65 23 45 17 14 27"/></g><g fill="#c7a66d"><circle cx="126" cy="91" r="3"/><circle cx="154" cy="91" r="3"/></g></svg>`;
  const current=()=>member(db.currentUser)||{id:db.currentUser,nickname:authUser?.email?.split('@')[0]||'브리더',initial:'K',intro:'',role:role==='admin'?'관리자':'브리더'};
  const avatar=(m,large=false)=>`<div class="${large?'avatar-large':'mini-avatar'}" style="background:${attr(m?.color||'#98866c')}" aria-hidden="true">${m?.avatar_url&&/^(https:\/\/|data:image\/jpeg;base64,)/.test(m.avatar_url)?`<img src="${attr(m.avatar_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit" referrerpolicy="no-referrer">`:esc(m?.initial||m?.nickname?.[0]||'?')}</div>`;
  const sex=(s)=>`<span class="gender ${s==='M'?'m':s==='F'?'f':''}">${s==='M'?'♂':s==='F'?'♀':'—'}</span>`;
  const isDead=x=>String(x||'').trim()==='사망';
  const deathName=(name,state)=>isDead(state)?`<span class="dead-text">${esc(name)}</span> <span class="death-mark">사망</span>`:esc(name);
  const status=(x,larval=false)=>`<span class="tag ${x==='보유'?'green':x==='분양'?'gold':''}">${isDead(x)&&larval?'<span class="death-mark" role="img" aria-label="사망">★</span>':esc(x)}</span>`;
  const fmtSize=(n)=>n===null||n===undefined||n===''?'—':`${esc(n)} mm`;
  const persist=async(table,id,payload,updating=false)=>{
    const old=updating?(table==='kml_adults'?adult(id):table==='kml_lines'?byId(db.lines,id):table==='kml_larvae'?byId(db.larvae,id):null):null;
    if(updating&&!old?.updatedAt)throw Error('수정 기준 정보를 찾을 수 없습니다. 최신 목록을 불러와 다시 시도하세요.');
    const query=updating ? supa.from(table).update(payload).eq('id',id).eq('updated_at',old.updatedAt)
      : supa.from(table).insert({id,...payload});
    const {data,error}=await query.select().maybeSingle();
    if(error)throw error;
    if(!data)throw Error('다른 앱에서 먼저 수정했습니다. 창을 닫고 최신 내용을 확인한 뒤 다시 수정하세요.');
    return data;
  };
  const lineageLabel=(value,species='',generation='')=>{
    const text=String(value||'').trim();
    if(/^(WD|wild|와일드)$/i.test(String(generation||'').trim())||/와일드|wild/i.test(species)||/^(WD|wild|와일드)$/i.test(text))return 'Wild';
    return !text||text===species||/^왕사슴벌레(?:[（(].*[）)])?$/.test(text)?'미상':text;
  };
  const sourceLabel=value=>['우화','입양','채집'].includes(value)?value:value==='자체 우화'?'우화':'입양';
  const adultState=value=>value==='이동'?'분양':value==='종료'?'사망':(value||'보유');
  const adultRecord=a=>({code:a.code,lineage:a.lineage,generation:a.generation||'',sex:a.sex,size:a.size===''?null:Number(a.size),
    emerged:a.emerged||null,breeder_id:a.breeder||null,owner_id:a.owner||null,
    father_id:a.father||null,mother_id:a.mother||null,source:a.source,status:a.status,note:a.note||'',photo_url:a.photoUrl||''});
  const lineRecord=l=>({name:l.name,father_id:l.father||null,mother_id:l.mother,generation:l.generation||'',is_wild:!!l.isWild,year:l.year?Number(l.year):null,method:l.method||'',note:l.note||''});
  async function loadRemote(){
    const names=['kml_profiles','kml_adults','kml_lines','kml_larvae','kml_comments','kml_transfers'];
    const rs=await Promise.all(names.map(n=>supa.from(n).select('*')));
    rs.forEach((r,i)=>{if(r.error)throw new Error(names[i]+': '+r.error.message)});
    const [p,a,l,v,c,t]=rs.map(r=>r.data||[]);
    let profiles=p;
    if(!isAdmin()){
      const {data:labels,error:labelError}=await supa.rpc('kml_visible_breeder_labels');
      if(labelError)throw labelError;
      const found=new Set(p.map(x=>x.user_id));
      profiles=[...p,...(labels||[]).filter(x=>!found.has(x.user_id)).map(x=>({user_id:x.user_id,nickname:x.nickname,avatar_url:x.avatar_url,intro:''}))];
    }
    db={currentUser:authUser.id,
      members:profiles.map(x=>({id:x.user_id,nickname:x.nickname,intro:x.intro||'',avatar_url:x.avatar_url||'',
        role:x.user_id===authUser.id&&role==='admin'?'관리자':'브리더',initial:(x.nickname||'K')[0],color:'#a68758'})),
      adults:a.map(x=>({id:x.id,code:x.code,lineage:lineageLabel(x.lineage,x.species,x.generation),generation:x.generation||'',sex:x.sex,size:x.size===null?'':String(x.size),emerged:x.emerged||'',
        breeder:x.breeder_id||'',owner:x.owner_id||'',father:x.father_id||'',mother:x.mother_id||'',status:adultState(x.status),
        source:sourceLabel(x.source),note:x.note||'',photoUrl:x.photo_url||'',species:x.species||'',beetlelogId:x.beetlelog_id||'',beetlelogOwner:x.beetlelog_owner_id||'',createdAt:x.created_at||'',updatedAt:x.updated_at||''})),
      lines:l.map(x=>({id:x.id,name:x.name,father:x.father_id,mother:x.mother_id,year:x.year||'',generation:x.generation||'',isWild:!!x.is_wild,method:x.method||'',note:x.note||'',createdBy:x.created_by||'',species:x.species||'',beetlelogId:x.beetlelog_id||'',beetlelogOwner:x.beetlelog_owner_id||'',createdAt:x.created_at||'',updatedAt:x.updated_at||''})),
      larvae:v.map(x=>({id:x.id,lineId:x.line_id,number:x.number,sex:x.sex||'U',records:x.records||[],emerged:x.emerged||'',size:x.size===null?'':String(x.size),sourceData:x.source_data||{},updatedAt:x.updated_at||'',beetlelogId:x.beetlelog_id||'',beetlelogOwner:x.beetlelog_owner_id||''})),
      comments:c.map(x=>({id:x.id,adultId:x.adult_id,memberId:x.member_id,body:x.body,date:(x.created_at||'').slice(0,10)})),
      transfers:t.map(x=>({id:x.id,adultId:x.adult_id,from:x.from_user,to:x.to_user,date:x.transfer_date,note:x.note||''}))
    };
  }
  function gate(){
    const isWaiting=!authReady;
    app.innerHTML=`<div class="access-wrap"><section class="access-card"><div class="access-mark access-mark--official"><img src="${OFFICIAL_LOGO}" class="login-official-logo" alt="국균연구소 공식 원형 마크" /></div>
      <p class="access-kicker">국균연구소 · BREEDERS ONLY</p><h1>${isWaiting?'접속 확인 중':authUser?(allowed?'데이터 연결 실패':'승인된 계정만 접근할 수 있습니다'):'국균연구소'}</h1>
      <p>${esc(isWaiting?'로그인 상태를 확인하고 있습니다.':loginError|| (authUser&&!allowed?'Google 로그인이 완료되었지만 연구소 승인 목록에 없는 계정입니다. 관리자에게 등록을 요청하세요.':'왕사슴벌레 개체·혈통·사육 라인 통합관리 시스템'))}</p>
      ${authUser?`<small>${esc(authUser.email||'')}</small><div style="margin-top:23px"><button class="btn btn-light" data-action="sign-out">Google 로그아웃</button></div>`:
      `<button class="btn btn-gold" data-action="google-login" ${isWaiting||!supa?'disabled':''}>Google 계정으로 로그인</button>`}
      <div class="access-note">계정 승인과 데이터 접근은 Supabase 서버 권한 정책으로 보호됩니다.<br>실제 사육정보는 승인 전에는 조회할 수 없습니다.</div>
    </section></div>`;
  }
  async function boot(){
    if(!supa){loginError='인증 라이브러리를 불러오지 못했습니다. 네트워크 연결을 확인하세요.';authReady=true;gate();return;}
    gate();
    try{
      const {data,error}=await supa.auth.getUser();
      if(error && error.name!=='AuthSessionMissingError')throw error;
      authUser=data?.user||null;
      if(authUser){
        const email=String(authUser.email||'').toLowerCase();
        const {data:match,error:err}=await supa.from('kml_allowed_emails').select('role,active').eq('email',email).eq('active',true).maybeSingle();
        if(err)throw err;
        if(match){
          role=match.role;
          const {data:existing,error:pe}=await supa.from('kml_profiles').select('user_id').eq('user_id',authUser.id).maybeSingle();
          if(pe)throw pe;
          if(!existing){
            const nickname=String(authUser.user_metadata?.full_name||authUser.user_metadata?.name||email.split('@')[0]||'브리더').slice(0,30);
            const avatar_url=/^https:\/\//.test(String(authUser.user_metadata?.avatar_url||''))?authUser.user_metadata.avatar_url:'';
            const {error:ie}=await supa.from('kml_profiles').insert({user_id:authUser.id,nickname,avatar_url});
            if(ie)throw ie;
          }
          await loadRemote();allowed=true;
        }
      }
    }catch(e){loginError='인증 또는 데이터 조회 오류: '+(e.message||e);allowed=false;}
    authReady=true;
    if(allowed){showStandaloneHome(false);render();}else gate();
  }
  function route(){const p=(location.hash||'#/').replace(/^#\/?/,'').split('/').filter(Boolean);return {page:p[0]||'dashboard',id:p[1]||'',tab:p[2]||''};}
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
  const go=(target)=>{ui.menu=false;closeInbox();const hash='#/'+target;if(location.hash===hash){render();window.scrollTo(0,0);}else location.hash=hash;};
  const activeNav=(page,key)=>page===key;
  const navBtn=(key,label,ico,page)=>`<button class="nav-item ${activeNav(page,key)?'active':''}" data-nav="${key}">${icon(ico)}<span>${label}</span>${activeNav(page,key)?icon('chevron'):''}</button>`;
  function shell(page){
    const c=current();
    return `<div class="app-shell"><div class="sidebar-overlay ${ui.menu?'open':''}" data-action="close-menu"></div><aside class="sidebar ${ui.menu?'open':''}"><button type="button" class="brand brand-home" data-nav="dashboard" aria-label="KML 홈으로 이동"><span class="brand-mark brand-mark--official"><img src="${OFFICIAL_LOGO}" class="brand-official-logo" alt="" /></span><span class="brand-name">KML<small>국균연구소 · BREEDERS CLUB</small></span></button><div class="nav-label">HOME</div>${navBtn('dashboard','국균연구소 DB','home',page)}<div class="nav-label">MY PAGE</div>${navBtn('adults','성충 관리','bug',page)}${navBtn('lines','라인 관리','layers',page)}${navBtn('profile','프로필','user',page)}<div class="sidebar-bottom"><div class="sidebar-foot">${breederLink(c.id,'sidebar-avatar',avatar(c))}<div class="sidebar-user"><strong>${breederLink(c.id,'breeder-name',esc(c.nickname))}</strong><span>KML 승인 회원 · ${esc(c.role)}</span></div></div><div class="build-tag">KML · BREEDER HUB</div>${navBtn('help','도움말','help',page).replace('class="nav-item ','class="nav-item sidebar-help ')}</div></aside><div class="main-wrap"><header class="topbar"><div class="breadcrumb"><button class="icon-btn mobile-menu" data-action="toggle-menu" aria-label="메뉴 열기">${icon('menu')}</button><button type="button" class="kml-home" data-nav="dashboard" aria-label="KML 홈으로 이동">KML</button>${icon('chevron')}<b>${esc({help:'도움말',notifications:'알림',breeder:'브리더 기록',dashboard:'국균연구소 DB',adults:'성충 관리',adult:'개체 상세',larva:'유충 상세',lines:'라인 관리',line:'라인 상세',members:'브리더 목록',mypage:'마이페이지',registry:'전체 성충',archive:'전체 라인',profile:'내 프로필',data:'데이터 관리'}[page]||'페이지')}</b></div><div class="top-actions"><span class="demo-ribbon">승인된 브리더 전용</span><button class="icon-btn" data-action="sign-out" title="로그아웃">${icon('logout')}</button>${notificationBell()}<button class="top-profile" data-nav="breeder/${attr(c.id)}" aria-label="내 성충과 라인 보기">${avatar(c)}<span>${esc(c.nickname)}</span></button></div></header><main class="page" id="page-content"></main></div></div><div id="modal-root"></div><div id="notification-root"></div>`;
  }
  const pageHead=(eyebrow,title,desc,actions='')=>`<div class="page-title"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1></div><div class="actions">${actions}</div></div>`;
  const button=(name,action,cls='btn-dark',ico='plus')=>`<button type="button" class="btn ${cls}" data-action="${action}">${icon(ico)} ${name}</button>`;
  // Member links expose only the nickname/photo and already-visible KML records.
function breederLink(id,className='breeder-link',content=''){
  const m=member(id);if(!m)return '<span class="'+className+'">'+esc(memberName(id))+'</span>';
  const image=avatar(m).replace('<div ','<span ').replace('</div>','</span>').replace('<img ','<img loading="lazy" decoding="async" ');
  return '<a class="breeder-link '+className+'" href="#/breeder/'+attr(id)+'" data-nav="breeder/'+attr(id)+'" aria-label="'+attr(m.nickname)+' 성충과 라인 보기">'+(content||image+'<span class="breeder-link-name">'+esc(m.nickname)+'</span>')+'</a>';
}
function breederPage(id){
  const m=member(id);if(!m)return pageHead('BREEDER','브리더를 찾을 수 없습니다.','등록된 기록의 브리더를 선택해 주세요.');
  const owned=db.adults.filter(a=>a.owner===id),bred=db.adults.filter(a=>a.breeder===id),lines=db.lines.filter(l=>l.createdBy===id),showBred=route().tab==='bred';
  return pageHead('BREEDER RECORDS',esc(m.nickname),'브리더의 성충과 라인을 확인합니다.')+'<section class="profile-top">'+breederLink(id,'breeder-profile')+'<div class="breeder-counts"><span>보유 성충 <b>'+owned.length+'</b></span><span>등록 라인 <b>'+lines.length+'</b></span></div></section><section class="panel"><div class="panel-head"><div class="panel-title">성충 목록</div><div class="actions"><button class="btn '+(!showBred?'btn-dark':'btn-light')+' btn-sm" data-nav="breeder/'+attr(id)+'" aria-pressed="'+!showBred+'">보유 성충 '+owned.length+'</button><button class="btn '+(showBred?'btn-dark':'btn-light')+' btn-sm" data-nav="breeder/'+attr(id)+'/bred" aria-pressed="'+showBred+'">브리딩 성충 '+bred.length+'</button></div></div>'+((showBred?bred:owned).length?adultsTable(showBred?bred:owned,true):'<div class="empty">등록된 성충이 없습니다.</div>')+'</section><section class="breeder-lines"><div class="panel-head"><div class="panel-title">라인 목록 <span class="tag">'+lines.length+'</span></div></div><div class="line-cards">'+(lines.length?lines.map(lineCard).join(''):'<div class="panel section-pad">등록된 라인이 없습니다.</div>')+'</div></section>';
}
  function tableMember(id){return breederLink(id,'table-member');}
  function adultRows(items){
    if(!items.length) return `<tr><td colspan="10" class="empty-table">조건에 맞는 개체가 없습니다. 필터를 변경하거나 새 개체를 등록하세요.</td></tr>`;
    return items.map(x=>`<tr class="${isDead(x.status)?'dead-record':''}"><td><button type="button" class="plain-link id-link" data-nav="adult/${attr(x.id)}">${esc(x.code)}</button></td><td>${sex(x.sex)}</td><td><strong>${fmtSize(x.size)}</strong></td><td>${esc(x.lineage||'—')}</td><td>${esc(x.generation||'—')}</td><td>${tableMember(x.breeder)}</td><td>${tableMember(x.owner)}</td><td>${esc(x.emerged||'—')}</td><td class="state-cell">${status(x.status)}</td><td class="control-cell">${mineAdult(x)||isAdmin()?`<button class="icon-btn" data-action="edit-adult" data-id="${attr(x.id)}" aria-label="수정">${icon('edit')}</button>`:'<small class="read-only">조회 전용</small>'}</td></tr>`).join('');
  }
  function filteredAdults(){let a=db.adults.filter(x=>route().page==='registry'||mineAdult(x)).filter(x=>[x.code,x.lineage,memberName(x.owner),memberName(x.breeder)].some(s=>String(s).toLowerCase().includes(ui.search.toLowerCase())));if(ui.sex!=='all')a=a.filter(x=>x.sex===ui.sex);if(ui.status!=='all')a=a.filter(x=>x.status===ui.status);if(ui.year!=='all')a=a.filter(x=>String(x.emerged||'').startsWith(ui.year));a.sort((a,b)=> ui.sort==='size-desc'?Number(b.size||0)-Number(a.size||0):ui.sort==='size-asc'?Number(a.size||0)-Number(b.size||0):ui.sort==='date-desc'?String(b.emerged).localeCompare(String(a.emerged)):a.code.localeCompare(b.code,'ko'));return a;}
  function adultsTable(items,compact=false){return `<div class="datatable-wrap"><table class="datatable ${compact?'':'table-large'}"><thead><tr><th>관리번호</th><th>성별</th><th>체장</th><th>혈통</th><th>누대수</th><th>브리더</th><th>현재 소유자</th><th>우화일</th><th>상태</th>${compact?'':'<th>수정</th>'}</tr></thead><tbody>${compact?items.map(x=>`<tr class="${isDead(x.status)?'dead-record':''}"><td><button class="plain-link id-link" data-nav="adult/${attr(x.id)}">${esc(x.code)}</button></td><td>${sex(x.sex)}</td><td>${fmtSize(x.size)}</td><td>${esc(x.lineage)}</td><td>${esc(x.generation||'—')}</td><td>${tableMember(x.breeder)}</td><td>${tableMember(x.owner)}</td><td>${esc(x.emerged||'—')}</td><td class="state-cell">${status(x.status)}</td></tr>`).join(''):adultRows(items)}</tbody></table></div>`;}
  const HELP_TOPICS=[
 ['시작 · 화면 이동','<p>국균연구소 DB 홈에서 전체 성충과 라인으로 이동할 수 있습니다. 최근 등록된 성충·라인은 서버 최초 등록 시간 기준으로 최신 5개씩 표시하며 수정 시간·우화일·시즌 연도는 정렬에 사용하지 않습니다. 성충 관리·라인 관리는 내 기록을 표시합니다. 브리더 사진이나 이름을 누르면 그 사람의 보유 성충·브리딩 성충·라인 목록이 열립니다.</p><p>상단 KML과 왼쪽 메뉴의 KML 로고는 홈으로 이동합니다. 아이폰 홈 화면에 추가한 앱을 다시 열 때도 홈에서 시작하며, 편집 중인 창은 유지됩니다.</p>'],
 ['성충 등록 · 계통도','<p>성충 관리에서 관리번호, 혈통, 누대수, 성별, 체장, 우화일, 브리더·보유자, 부모, 입수 경로와 상태를 등록합니다. 관리번호는 중복할 수 없습니다. 신규 성충은 내 보유 목록에 등록됩니다.</p><p>사진이 없으면 성별에 맞는 기본 이미지가 표시됩니다. 사망한 성충은 기록에 줄을 긋고 사망으로 표시합니다. 계통도는 조부모까지 표시하며, 성별 기호 색상과 브리더 사진으로 구분합니다.</p><p>연도 입력은 당해 연도 앞뒤 5년을 선택할 수 있고 ▲·▼로 한 해씩 바꿀 수 있습니다. 기존 기록이 범위 밖이면 해당 연도를 보존합니다.</p>'],
 ['라인 · 유충 기록','<p>일반 라인은 부·모 성충이 필요합니다. Wild를 체크하면 암컷만으로 라인을 만들 수 있습니다. 누대수는 부모의 혈통·누대수를 기준으로 자동 계산하거나 직접 입력할 수 있습니다.</p><p>라인 유충 리스트는 병별 날짜, 먹이원, 용량과 무게를 가로로 표시합니다. 번호를 누르면 유충 상세로 이동하며, 기록 수정에서 병 추가·제거와 용화·우화 정보를 편집합니다. 무게 0과 빈 값은 구분됩니다.</p><p>유충의 사망은 ★와 줄긋기로 표시합니다. 수정은 본인 라인 또는 관리자만 할 수 있습니다. 삭제는 라인·성충의 수정 창에서 진행하며, 라인을 삭제하면 소속 유충 기록도 삭제되므로 확인이 필요합니다.</p>'],
 ['BeetleLog 가져오기 · 동기화','<p>같은 Google 계정으로 저장한 왕사슴벌레 성충·라인을 선택하여 가져올 수 있습니다. 라인을 선택하면 부모 성충과 유충·병별 기록도 함께 가져옵니다. 이미 가져온 라인은 누락된 유충만 추가합니다.</p><p>연결된 성충·라인·유충 기록은 KML과 BeetleLog에서 수정하면 서로 반영됩니다. 라벨 전용 수정은 사육 기록을 변경하지 않습니다. 다른 앱에서 같은 항목을 동시에 수정하면 저장을 중단하고 최신 내용을 확인하도록 안내합니다.</p><p>활성 화면은 약 8초마다 최신 기록을 확인합니다. 편집 중에는 입력을 보호하며, 네트워크가 없으면 서버 반영이 완료되지 않습니다. 새 기능 배포 후에는 앱을 새로고침해 주세요.</p>'],
 ['Excel 가져오기 · 내보내기','<p>내 라인 관리와 성충 관리 상단의 <strong>Excel 가져오기</strong>에서 파일을 넣습니다. 기존 라인의 수정 창에서도 유충 파일을 넣을 수 있습니다. 각 창의 양식 다운로드로 성충·유충 전용 XLSX를 받을 수 있습니다.</p><p>양식의 성충 또는 유충 시트 3행부터 입력하세요. 2행 고정 예시는 수정·삭제가 막혀 있으며 업로드에서 자동 제외됩니다. 예시·안내 시트는 가져오지 않습니다. 유충은 라인을 먼저 만들고 라인명을 입력하거나 대상 라인을 선택합니다. XLSX·XLS·UTF-8 CSV를 지원하며 한 번에 최대 500개체·5MB입니다.</p><p>같은 관리번호는 기본적으로 건너뜁니다. 수정하려면 기존 개체도 수정을 체크하고 미리보기를 확인하세요. 빈칸은 기존 값 유지, [비우기]는 선택 항목 삭제입니다. 번호·보유자 변경은 개체 수정·성충 보내기를 이용합니다. 수식은 값으로 붙여넣어 주세요.</p><p>오류가 있으면 저장하지 않으며, 저장 중 충돌이 나도 파일 일부만 반영하지 않습니다. 기존 사진과 입력하지 않은 병·추가 정보는 유지됩니다. 신규 기록은 KML에 등록되고 기존 BeetleLog 연결 기록의 수정은 원본에도 반영됩니다.</p><p>라인 수정의 Excel 내보내기는 업로드 양식에 저장된 유충 기록을 채워 내려받습니다. 제목·고정 예시를 유지하고 3행부터 데이터가 들어갑니다. 현재 입력 중인 라인 수정 내용은 포함하지 않습니다. 내려받은 XLSX를 수정한 뒤 Excel 가져오기에서 기존 개체도 수정을 체크해 다시 넣습니다. 예전에 받은 CSV도 업로드할 수 있습니다.</p>'],
 ['라벨 · 이미지 저장','<p>성충 상세에서는 라벨 아래에 계통도가 함께 보입니다. 유충 상세는 라벨·계통도 버튼으로 같은 영역을 전환합니다. 사육 기록에서 확인되는 값만 라벨에 채우며, 원본 라벨 형식에 맞춰 일반 병은 1~5병까지 표시합니다. 전체 사육 기록은 상세 표에서 확인할 수 있습니다.</p><p>라벨 내용 수정은 라벨 전용이며 개체의 원본 기록을 변경하지 않습니다. 수정 초안은 현재 접속 중에 유지되고 새로고침·로그아웃하면 사라집니다. LABEL 상단의 라벨 수정으로 편집창을 열고, 내용을 바꾼 뒤 수정 완료를 누르면 라벨에 적용되고 편집창이 닫힙니다. 수정 완료 전에는 이미지 저장을 사용할 수 없습니다.</p><p>이미지 저장은 원본 크기 1444×1032 PNG를 만듭니다. 지원하는 모바일에서는 공유 메뉴를 사용합니다. 화면의 미리보기 크기는 저장 이미지 해상도에 영향을 주지 않습니다.</p>'],
 ['성충 보내기 · 알림 · 좋아요','<p>성충 상세에서 성충 보내기를 누르고 받을 KML 승인 회원을 선택합니다. 상대가 KML에 로그인해 프로필을 만들어야 회원 목록에 표시됩니다.</p><p>수락 전에는 발신자가 계속 보유합니다. 상대가 알림에서 수락하면 보유 목록이 이동하고 관리번호·브리더·계통은 유지됩니다. 받는 회원은 거절, 보낸 회원은 수락 전 취소할 수 있습니다. 같은 성충에 대기 요청을 중복해서 만들 수 없습니다.</p><p>상단 종에서 받은 알림을 확인하고 읽음 처리합니다. 읽은 알림도 이력에 남으며, 전체 알림에서 이전 기록과 보낸 성충을 볼 수 있습니다. 댓글은 성충 보유자·브리더에게, 좋아요는 댓글 작성자에게 알립니다. 본인 행동과 반복 재좋아요 알림은 제외합니다.</p>'],
 ['프로필 · 계정','<p>프로필에서 닉네임·사진·소개를 바꿀 수 있습니다. 닉네임을 바꿔도 성충의 브리더·보유자 연결은 유지됩니다. JPG·PNG·WEBP 사진을 사용할 수 있으며, 프로필 사진은 256px 정사각형으로 저장됩니다.</p><p>프로필 사진을 바꾼 후 저장을 눌러 적용합니다. Google 로그인과 KML 승인이 모두 필요하며, 다른 사람의 기록은 정해진 권한 범위에서만 수정할 수 있습니다.</p>']
];
function helpPage(){return pageHead('HELP','도움말','')+'<section class="help-topics">'+HELP_TOPICS.map(([title,content],i)=>'<details class="panel help-topic" '+(i===0?'open':'')+'><summary>'+esc(title)+'</summary><div class="help-topic-content">'+content+'</div></details>').join('')+'</section>';}
function myPage(){
    const me=current(), aa=db.adults.filter(mineAdult), ll=db.lines.filter(mineLine);
    return `${pageHead('MY PAGE','마이페이지','내 프로필 · 내 성충 · 내 라인을 한곳에서 관리합니다.')}
    <section class="profile-top mypage-profile">${breederLink(me.id,'mypage-breeder',avatar(me,true))}<div><div class="eyebrow">BREEDER PROFILE</div><h2>${breederLink(me.id,'breeder-name',esc(me.nickname))}</h2><p>${esc(me.intro||'왕사슴벌레 브리더')}</p></div><button class="btn btn-light" data-nav="profile">프로필 수정 ${icon('chevron')}</button></section>
    <div class="mypage-grid">
    <button class="mypage-card" data-nav="adults"><span class="mypage-card-icon">${icon('bug')}</span><span class="mypage-card-label">내 성충 관리</span><strong>${aa.length}<small> 개체</small></strong><span class="mypage-arrow">${icon('arrow')}</span></button>
    <button class="mypage-card" data-nav="lines"><span class="mypage-card-icon">${icon('layers')}</span><span class="mypage-card-label">내 라인 관리</span><strong>${ll.length}<small> 라인</small></strong><span class="mypage-arrow">${icon('arrow')}</span></button>
    <button class="mypage-card" data-nav="profile"><span class="mypage-card-icon">${icon('user')}</span><span class="mypage-card-label">프로필</span><strong class="mypage-card-profile">${esc(me.nickname)}</strong><span class="mypage-arrow">${icon('arrow')}</span></button>
    </div><section class="panel section-pad mypage-community"><div><div class="detail-subhead">${icon('home')} 국균연구소 전체 기록</div></div><button class="btn btn-light" data-nav="dashboard">대시보드 보기 ${icon('arrow')}</button></section>`;
  }
  function recentlyRegistered(records,limit=5){return [...records].sort((a,b)=>(Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0)).slice(0,limit);}
  function dashboard(){return `<section class="home-banners" aria-label="국균연구소 DB"><article class="home-banner home-banner--adults"><div class="home-banner-copy"><div class="hero-kicker">국균연구소 DB</div><h2>성충</h2><div class="home-banner-actions"><button class="btn btn-gold" data-nav="registry">전체 성충 ${icon('arrow')}</button><button class="btn btn-outline" data-nav="adults">${icon('user')} 나의 성충</button></div></div><div class="home-banner-visual" aria-hidden="true"><img src="assets/kml-hero-stag.webp" class="home-banner-photo home-banner-photo--adult" alt="" fetchpriority="high" /></div><span class="home-banner-mark">ADULT DATABASE</span></article><article class="home-banner home-banner--lines"><div class="home-banner-copy"><div class="hero-kicker">국균연구소 DB</div><h2>라인</h2><div class="home-banner-actions"><button class="btn btn-gold" data-nav="archive">전체 라인 ${icon('arrow')}</button><button class="btn btn-outline" data-nav="lines">${icon('user')} 나의 라인</button></div></div><div class="home-banner-visual" aria-hidden="true"><img src="assets/kml-hero-pair.webp" class="home-banner-photo home-banner-photo--pair" alt="" fetchpriority="high" /></div><span class="home-banner-mark">BREEDING LINES</span></article></section>
  <div class="stat-grid home-stats">${[['등록된 성충 수',db.adults.length,'bug'],['등록된 라인 수',db.lines.length,'layers']].map(([a,b,i])=>`<div class="stat"><small>${a}</small><strong>${b}</strong><i>${icon(i)}</i></div>`).join('')}</div>
  <div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><div class="panel-title">최근 등록된 성충</div></div><button class="link-arrow" data-nav="registry">전체 보기 ${icon('arrow')}</button></div>${adultsTable(recentlyRegistered(db.adults),true)}</section><section class="panel"><div class="panel-head"><div><div class="panel-title">최근 등록된 라인</div></div><button class="link-arrow" data-nav="archive">전체 라인 ${icon('arrow')}</button><button class="btn btn-outline" data-nav="lines">${icon('user')} 나의 라인</button></div><div class="right-panel">${recentlyRegistered(db.lines).map(l=>`<div class="line-item" data-nav="line/${attr(l.id)}" role="button" tabindex="0"><div><strong>${esc(l.name)}</strong><small>${esc(adult(l.father)?.code||'부 미등록')} ♂ × ${esc(adult(l.mother)?.code||'모 미등록')} ♀</small></div><div class="count">${db.larvae.filter(v=>v.lineId===l.id).length}<small>유충</small></div></div>`).join('')}</div></section></div>`;}
  
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
  const d={sex:labelSex(r.sex),no:labelText(kind==='larva'?r.number:r.code),line:labelText(c.line?.name||(kind==='adult'?r.lineage:'')),gen:labelText(kind==='larva'?c.line?.generation:r.generation),mSize:labelText(c.father?.size),mLine:lineage(c.father),fSize:labelText(c.mother?.size),fLine:lineage(c.mother),pudDate:'',pudFeed:'',head:'',pupaDate:'',pupaW:'',adultDate:labelText(r.emerged),adult:labelText(r.size),breeder:member(c.breeder)?.nickname||''};
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
function adultsPage(){const years=[...new Set(db.adults.map(x=>String(x.emerged||'').slice(0,4)).filter(Boolean))].sort().reverse();const mine=route().page!=='registry';return `${pageHead('SPECIMEN REGISTRY',mine?'내 성충 관리':'전체 성충 목록',mine?'내가 보유한 성충을 등록·검색·정렬합니다.':'다른 브리더의 성충과 혈통을 함께 조회합니다.',mine?button('성충 등록','new-adult','btn-dark','plus')+button('Excel 가져오기','excel-import','btn-light','upload').replace('data-action="excel-import"','data-action="excel-import" data-kind="adults"')+button('BeetleLog 가져오기','beetle-import','btn-light','download').replace('data-action="beetle-import"','data-action="beetle-import" data-type="adults"'):'')}<div class="data-tools"><label class="searchbox">${icon('search')}<input id="adult-search" value="${attr(ui.search)}" placeholder="관리번호 · 혈통 · 브리더 검색" autocomplete="off" /></label><select id="sex-filter" class="filter-select" aria-label="성별">${[['all','전체 성별'],['M','수컷 ♂'],['F','암컷 ♀']].map(([v,t])=>`<option value="${v}" ${ui.sex===v?'selected':''}>${t}</option>`).join('')}</select><select id="year-filter" class="filter-select" aria-label="우화 연도"><option value="all">전체 연도</option>${years.map(y=>`<option ${ui.year===y?'selected':''}>${y}</option>`).join('')}</select><select id="status-filter" class="filter-select" aria-label="상태">${[['all','전체 상태'],['보유','보유'],['분양','분양'],['사망','사망']].map(([v,t])=>`<option value="${v}" ${ui.status===v?'selected':''}>${t}</option>`).join('')}</select><select id="sort-filter" class="filter-select" aria-label="정렬">${[['code','관리번호순'],['size-desc','체장 큰순'],['size-asc','체장 작은순'],['date-desc','최근 우화순']].map(([v,t])=>`<option value="${v}" ${ui.sort===v?'selected':''}>${t}</option>`).join('')}</select></div><section class="panel"><div class="result-meta"><strong id="adult-count">검색 결과 ${filteredAdults().length}개체</strong></div><div id="adult-table">${adultsTable(filteredAdults())}</div></section>`;}
  function updateAdultsTable(){const c=document.getElementById('adult-count'),t=document.getElementById('adult-table');if(c)c.textContent=`검색 결과 ${filteredAdults().length}개체`;if(t)t.innerHTML=adultsTable(filteredAdults());}
    function pedigreeBreeder(id){return breederLink(id,'p-breeder');}
  function pedCell(id,sexExpected){
    const x=adult(id),gender=x?.sex||sexExpected,sexClass=gender==='M'?'m':gender==='F'?'f':'',symbol=gender==='M'?'♂':gender==='F'?'♀':'—';
    if(!x)return '<div class="p-cell missing '+sexClass+'"><span class="p-sex" role="img" aria-label="'+(gender==='M'?'수컷':'암컷')+'">'+symbol+'</span><span class="p-size">미등록</span></div>';
    const lineage=[x.lineage||'—',x.generation].filter(Boolean).join(' · ');
    return '<article role="button" tabindex="0" class="p-cell '+sexClass+' '+(isDead(x.status)?'dead-record':'')+'" data-nav="adult/'+attr(x.id)+'" title="'+attr(x.code)+' 상세 보기"><span class="p-sex" role="img" aria-label="'+(gender==='M'?'수컷':gender==='F'?'암컷':'미구분')+'">'+symbol+'</span><span class="p-size">'+fmtSize(x.size)+'</span><span class="p-detail p-lineage" title="'+attr(lineage)+'">'+esc(lineage)+'</span><span class="p-detail p-code">'+deathName(x.code,x.status)+'</span>'+pedigreeBreeder(x.breeder)+'</article>';
  }
  function pedigree(ad){
    let generation=[ad?.id||''];const cols=[];
    for(let depth=0;depth<3;depth++){
      const expected=depth===0?[ad?.sex||'M']:generation.map((_,i)=>i%2===0?'M':'F');
      cols.push('<div class="p-body">'+generation.map((id,i)=>pedCell(id,expected[i])).join('')+'</div>');
      if(depth<2)generation=generation.flatMap(id=>[adult(id)?.father||'',adult(id)?.mother||'']);
    }
    return '<div class="pedigree-scroll"><div class="pedigree" role="group" aria-label="조부모까지의 3세대 계통도">'+cols.join('')+'</div></div>';
  }
  function adultDetail(id){const a=adult(id);if(!a)return `${pageHead('NOT FOUND','개체를 찾을 수 없습니다.','삭제되거나 등록되지 않은 개체입니다.')}<button class="btn btn-light" data-nav="adults">성충 목록</button>`;const user=current();const linked=db.lines.filter(l=>l.father===id||l.mother===id);const comments=db.comments.filter(x=>x.adultId===id);const transfers=db.transfers.filter(t=>t.adultId===id);return `<button class="backlink" data-nav="${mineAdult(a)?'adults':'registry'}">${icon('back')} ${mineAdult(a)?'내 성충':'전체 성충'} 목록으로</button>${pageHead('SPECIMEN DETAIL',deathName(a.code,a.status),`${a.lineage?esc(a.lineage)+' · ':''}${a.sex==='M'?'수컷':'암컷'} · ${fmtSize(a.size)}`,(mineAdult(a)||isAdmin()?button('개체 수정','edit-adult','btn-light','edit').replace('data-action="edit-adult"','data-action="edit-adult" data-id="'+attr(a.id)+'"'):''))}
  <div class="detail-layout"><section class="panel"><div class="detail-photo"><img src="${attr(specimenPhotoUrl(a))}" alt="${attr(a.code)} 성충 이미지" loading="lazy" /></div><div class="detail-card"><div class="detail-subhead">개체 기본 정보 ${status(a.status)}</div><div class="detail-facts ${isDead(a.status)?'dead-facts':''}">${[['관리번호',a.code],['성별',a.sex==='M'?'♂ 수컷':'♀ 암컷'],['체장',fmtSize(a.size)],['혈통',a.lineage||'—'],['누대수',a.generation||'—'],['우화일',a.emerged||'—'],['입수 경로',a.source||'—'],['브리더',memberName(a.breeder)],['현재 소유자',memberName(a.owner)]].map(([k,v])=>`<div class="fact"><small>${k}</small><strong>${k==='브리더'?tableMember(a.breeder):k==='현재 소유자'?tableMember(a.owner):esc(v)}</strong></div>`).join('')}</div>${a.note?`<p class="section-caption">${esc(a.note)}</p>`:''}<div data-adult-transfer-state="${attr(a.id)}"></div><div class="helper-row">${(mineAdult(a)||isAdmin()?button('성충 보내기','transfer','btn-light','users').replace('data-action="transfer"','data-action="transfer" data-id="'+attr(a.id)+'"'):'')}</div></div></section>${specimenTools('adult',a.id,pedigree(a))}</div>
  <div class="below-detail"><section class="panel section-pad"><div class="detail-subhead">${icon('layers')} 교배 라인 / 개체 이동 이력</div><div style="margin-top:18px">${linked.length?linked.map(l=>`<div class="small-detail-card" data-nav="line/${attr(l.id)}" role="button"><span><b>${esc(l.name)}</b><br><small>${esc(l.year)}년 · ${a.sex==='M'?'부 ♂':'모 ♀'}</small></span>${icon('chevron')}</div>`).join(''):'<div class="empty-mini">연결된 교배 라인이 없습니다.</div>'}</div><div class="detail-subhead" style="margin-top:18px">이동 이력</div>${transfers.length?transfers.map(t=>`<div class="small-detail-card" style="cursor:default"><span>${breederLink(t.from)} → ${breederLink(t.to)}</span><small>${esc(t.date)}</small></div>`).join(''):'<div class="empty-mini">이동 기록이 없습니다.</div>'}</section><section class="panel section-pad"><div class="detail-subhead">${icon('message')} 개체 댓글 <span class="tag">${comments.length}</span></div><div id="comments">${comments.length?comments.map(c=>{const m=member(c.memberId);return `<div class="comment" id="comment-${attr(c.id)}">${breederLink(c.memberId,'comment-breeder',avatar(m))}<div style="min-width:0;flex:1"><div class="comment-meta"><strong>${breederLink(c.memberId,'breeder-name',esc(memberName(c.memberId)))}</strong><span>${esc(c.date)}</span>${c.memberId===db.currentUser?`<button class="icon-btn" style="margin-left:auto" data-action="delete-comment" data-id="${attr(c.id)}" aria-label="댓글 삭제">${icon('close')}</button>`:''}</div><p>${esc(c.body)}</p><div data-comment-reaction="${attr(c.id)}">${commentReactionButton(c)}</div></div></div>`}).join(''):'<div class="empty-mini">아직 댓글이 없습니다.</div>'}</div><form class="comment-compose" id="comment-form" data-adult-id="${attr(a.id)}"><textarea name="body" placeholder="개체에 대한 의견이나 사육 메모를 입력하세요." maxlength="1500" required></textarea><button type="submit" class="btn btn-dark">${icon('message')} 댓글 등록</button></form></section></div>`;}
  function linesPage(){const mine=route().page!=='archive';const ls=db.lines.filter(x=>!mine||mineLine(x)).filter(x=>[x.name,x.generation,x.year].some(s=>String(s||'').toLowerCase().includes(ui.lineSearch.toLowerCase())));return `${pageHead('BREEDING LINES',mine?'내 라인 관리':'전체 라인 목록',mine?'내가 생성한 교배 라인을 관리합니다.':'브리더들의 교배 라인을 검색하고 조회합니다.',mine?button('라인 생성','new-line','btn-dark','plus')+button('Excel 가져오기','excel-import','btn-light','upload').replace('data-action="excel-import"','data-action="excel-import" data-kind="larvae"')+button('BeetleLog 가져오기','beetle-import','btn-light','download').replace('data-action="beetle-import"','data-action="beetle-import" data-type="lines"'):'')}<div class="data-tools"><label class="searchbox">${icon('search')}<input id="line-search" value="${attr(ui.lineSearch)}" placeholder="라인명 · 시즌 · 메모 검색" /></label></div><div class="line-cards" id="line-cards">${ls.length?ls.map(l=>lineCard(l)).join(''):'<div class="panel section-pad">등록된 라인이 없습니다.</div>'}</div>`;}
  function lineCard(l){const f=adult(l.father),m=adult(l.mother);return `<article role="button" tabindex="0" class="line-card" data-nav="line/${attr(l.id)}"><div class="line-card-top"><span class="tag gold">${esc(l.year||'연도 미등록')}</span><span class="tag">${breederLink(l.createdBy)}</span></div><strong>${esc(l.name)}${l.isWild?' <span class="tag gold">Wild</span>':''}</strong><p>${esc(l.generation||'누대수 미입력')} · 유충 ${db.larvae.filter(v=>v.lineId===l.id).length}마리${l.note?' · '+esc(l.note):''}</p><div class="pair"><span><em>♂ ${esc(f?.code||(l.isWild?'Wild':'미등록'))}</em><br>${fmtSize(f?.size)}</span><span><em>♀ ${esc(m?.code||'미등록')}</em><br>${fmtSize(m?.size)}</span></div></article>`;}
  function linePedigreeNode(a,expected,withPhoto=false,wild=false){
    const gender=a?.sex||expected,symbol=gender==='F'?'♀':'♂',name=a?.code||(wild?'Wild':'미등록'),lineage=a?[a.lineage||'—',a.generation].filter(Boolean).join(' · '):'';
    const photo=withPhoto?`<${a?'button type="button"':'div'} class="line-pedigree-photo" ${a?`data-nav="adult/${attr(a.id)}" aria-label="${attr(name)} 상세 보기"`:''}><img src="${attr(a?specimenPhotoUrl(a):defaultAdultPhoto(expected))}" alt="${attr(name)} ${gender==='F'?'암컷':'수컷'} ${a?'사진':'기본 이미지'}" loading="lazy" /></${a?'button':'div'}>`:'';
    return `<div class="line-pedigree-node ${withPhoto?'line-pedigree-stock':''}"><div class="line-pedigree-size"><span class="line-pedigree-sex ${gender==='F'?'female':'male'}" role="img" aria-label="${gender==='F'?'암컷':'수컷'}">${symbol}</span><strong>${a?fmtSize(a.size):esc(name)}</strong></div>${photo}${a?`<div class="line-pedigree-identity"><span class="line-pedigree-lineage">${esc(lineage)}</span><button type="button" class="plain-link line-pedigree-code" data-nav="adult/${attr(a.id)}">${deathName(a.code,a.status)}</button></div>${breederLink(a.breeder,'line-pedigree-breeder')}`:''}</div>`;
  }
  function linePairPedigree(l){
    const rows=[];
    for(const [root,expected,wild]of [[adult(l.father),'M',l.isWild],[adult(l.mother),'F',false]]){
      const parents=[adult(root?.father),adult(root?.mother)];
      for(let i=0;i<4;i++){
        const parent=parents[Math.floor(i/2)],grandparent=adult(i%2===0?parent?.father:parent?.mother);
        rows.push(`<tr class="line-pedigree-branch-${expected==='M'?'male':'female'}">${i===0?`<td rowspan="4" class="line-pedigree-root">${linePedigreeNode(root,expected,true,wild)}</td>`:''}${i%2===0?`<td rowspan="2">${linePedigreeNode(parent,i===0?'M':'F')}</td>`:''}<td>${linePedigreeNode(grandparent,i%2===0?'M':'F')}</td></tr>`);
      }
    }
    return `<div class="line-pedigree-scroll" role="region" tabindex="0" aria-label="종충과 부모, 조부모 계통표"><table class="line-pedigree-table" aria-label="수컷·암컷 종충의 조부모까지 계통"><colgroup><col style="width:34%"><col style="width:33%"><col style="width:33%"></colgroup><tbody>${rows.join('')}</tbody></table></div>`;
  }
  function lineDetail(id){const l=byId(db.lines,id);if(!l)return pageHead('NOT FOUND','라인을 찾을 수 없습니다.','');const list=db.larvae.filter(v=>v.lineId===id),bottles=Array.from({length:Math.max(3,...list.map(v=>v.records.length))},(_,i)=>i);return `<div class="line-detail-toolbar"><button class="backlink" data-nav="${mineLine(l)?'lines':'archive'}">${icon('back')} ${mineLine(l)?'내 라인':'전체 라인'} 목록으로</button>${mineLine(l)||isAdmin()?`<button class="btn btn-light" data-action="edit-line" data-id="${attr(l.id)}">${icon('edit')} 라인 수정</button>`:''}</div><div class="line-detail-title"><h1>${esc(l.name)}</h1></div><section class="panel line-pair-panel"><div class="line-detail-head"><div><span class="eyebrow">BREEDING PAIR</span>${l.note?`<p>${esc(l.note)}</p>`:''}</div><div class="line-pair-meta"><span class="tag gold">${l.isWild?'Wild · ':''}${esc(l.year||'연도 미등록')} · ${esc(l.generation||'누대수 미입력')}</span><span class="tag">유충 ${list.length}마리</span></div></div><div class="section-pad line-pair-body">${linePairPedigree(l)}</div></section><section class="panel" style="margin-top:19px"><div class="panel-head"><div><div class="panel-title">라인 유충 리스트</div></div></div><div class="datatable-wrap"><table class="datatable"><thead><tr><th>번호</th><th>성별</th><th>상태</th>${bottles.map(i=>`<th>${i+1}병</th>`).join('')}<th>우화일</th><th>체장</th>${canEditLarvaLine(l)?'<th>수정</th>':''}</tr></thead><tbody>${list.length?list.map(v=>`<tr class="${isDead(v.sourceData?.status)?'dead-record':''}"><td><button type="button" class="plain-link id-link" data-nav="larva/${attr(v.id)}">${esc(v.number)}</button></td><td>${sex(v.sex)}</td><td class="state-cell">${status(v.sourceData?.status||'—',true)}</td>${bottles.map(i=>`<td class="bottle-cell">${v.records[i]?`<span>${esc(v.records[i][0]||'—')}</span><br><span>${esc(v.records[i][1]||'—')}</span><br><span>${v.records[i][2]!==''&&v.records[i][2]!=null?esc(v.records[i][2])+' cc':'—'}</span><br><span>${v.records[i][3]!==''&&v.records[i][3]!=null?esc(v.records[i][3])+' g':'—'}</span>`:'—'}</td>`).join('')}<td>${esc(v.emerged||'—')}</td><td>${fmtSize(v.size)}</td>${canEditLarvaLine(l)?`<td><button class="btn btn-light btn-sm" data-action="edit-larva" data-id="${attr(v.id)}">${icon('edit')} 기록 수정</button></td>`:''}</tr>`).join(''):'<tr><td colspan="${bottles.length+5+(canEditLarvaLine(l)?1:0)}" class="empty-table">등록된 유충이 없습니다.</td></tr>'}</tbody></table></div></section>`;}
  function larvaPedigree(v,line){
  const records=larvaBottleRecords(v).filter(r=>!labelIsPudding(r));
  const last=records.slice().sort((a,b)=>labelText(a.date).localeCompare(labelText(b.date))).reverse().find(r=>labelText(r.weight)!=='');
  const symbol=v.sex==='M'?'♂':v.sex==='F'?'♀':'—',sexClass=v.sex==='M'?'m':v.sex==='F'?'f':'';
  const value=v.size!==''&&v.size!==null&&v.size!==undefined?fmtSize(v.size):last?esc(last.weight)+' g':'—';
  const dead=isDead(v.sourceData?.status),title=dead?'<span class="dead-text">'+esc(v.number)+'</span> <span class="death-mark" role="img" aria-label="사망">★</span>':esc(v.number);
  const lineage=[line.name,line.generation].filter(Boolean).join(' · ');
  const child='<div class="p-cell '+sexClass+' '+(dead?'dead-record':'')+'"><span class="p-sex" role="img" aria-label="'+(v.sex==='M'?'수컷':v.sex==='F'?'암컷':'미구분')+'">'+symbol+'</span><span class="p-size">'+value+'</span><span class="p-detail p-lineage" title="'+attr(lineage)+'">'+esc(lineage)+'</span><span class="p-detail p-code">'+title+'</span>'+pedigreeBreeder(line.createdBy)+'</div>';
  const parents=[line.father||'',line.mother||''];
  const grandparents=parents.flatMap(id=>[adult(id)?.father||'',adult(id)?.mother||'']);
  return '<div class="pedigree-scroll"><div class="pedigree" role="group" aria-label="조부모까지의 3세대 계통도"><div class="p-body">'+child+'</div><div class="p-body">'+parents.map((id,i)=>pedCell(id,i%2===0?'M':'F')).join('')+'</div><div class="p-body">'+grandparents.map((id,i)=>pedCell(id,i%2===0?'M':'F')).join('')+'</div></div></div>';
}
function larvaDetail(id){
  const v=byId(db.larvae,id),line=v?byId(db.lines,v.lineId):null;
  if(!v||!line)return pageHead('NOT FOUND','유충을 찾을 수 없습니다.','라인이나 개체가 삭제되었을 수 있습니다.');
  const records=larvaBottleRecords(v),bottles=records.filter(r=>!labelIsPudding(r));
  const last=bottles.slice().sort((a,b)=>labelText(a.date).localeCompare(labelText(b.date))).reverse().find(r=>labelText(r.weight)!=='');
  const s=v.sourceData?.status||'사육중';
  const facts=[['관리번호',v.number],['성별',v.sex==='M'?'♂ 수컷':v.sex==='F'?'♀ 암컷':'미구분'],['라인',line.name],['누대수',line.generation||'—'],['최근 무게',last?labelText(last.weight)+' g':'—'],['우화일',v.emerged||'—'],['체장',v.size!==''&&v.size!==null&&v.size!==undefined?fmtSize(v.size):'—']];
  let bottle=0;const rows=records.map(r=>{const label=labelIsPudding(r)?'푸딩':String(++bottle)+'병';return '<tr><td>'+label+'</td><td>'+esc(r.date||'—')+'</td><td>'+esc(r.feedBrand||r.feedType||'—')+'</td><td>'+(labelText(r.bottleSize)!==''?esc(r.bottleSize)+(/^\d+(?:\.\d+)?$/.test(String(r.bottleSize))?' cc':''):'—')+'</td><td>'+(labelText(r.weight)!==''?esc(r.weight)+' g':'—')+'</td></tr>';}).join('');
  return '<button type="button" class="backlink" data-nav="line/'+attr(line.id)+'">'+icon('back')+' '+esc(line.name)+' 라인으로</button>'+pageHead('LARVA DETAIL',esc(v.number),esc(line.name)+' · '+esc(line.generation||'')+' · '+(v.sex==='M'?'수컷':v.sex==='F'?'암컷':'성별 미구분'),canEditLarvaLine(line)?button('기록 수정','edit-larva','btn-light','edit').replace('data-action="edit-larva"','data-action="edit-larva" data-id="'+attr(v.id)+'"'):'')+'<div class="detail-layout"><section class="panel"><div class="detail-card"><div class="detail-subhead">유충 기본 정보 '+status(s,true)+'</div><div class="detail-facts '+(isDead(s)?'dead-facts':'')+'">'+facts.map(([k,value])=>'<div class="fact"><small>'+k+'</small><strong>'+esc(value)+'</strong></div>').join('')+'<div class="fact"><small>브리더 / 라인 등록자</small><strong>'+pedigreeBreeder(line.createdBy)+'</strong></div></div></section>'+specimenTools('larva',v.id,larvaPedigree(v,line))+'</div><section class="panel larva-records"><div class="panel-head"><div class="panel-title">사육 기록</div><span class="tag">'+bottles.length+'병</span></div><div class="datatable-wrap"><table class="datatable"><thead><tr><th>병</th><th>날짜</th><th>먹이원</th><th>용량</th><th>무게</th></tr></thead><tbody>'+(rows||'<tr><td colspan="5" class="empty-table">사육 기록이 아직 없습니다.</td></tr>')+'</tbody></table></div></section>';
}
function membersPage(){if(!isAdmin())return pageHead('FORBIDDEN','관리자 전용','브리더 목록은 관리자만 볼 수 있습니다.');return `${pageHead('BREEDERS CLUB','브리더','승인된 브리더들의 프로필 사진과 닉네임을 확인할 수 있습니다.')}<div class="members-grid">${db.members.map(m=>`<div class="member-card">${breederLink(m.id,'member-profile',avatar(m,true)+'<strong>'+esc(m.nickname)+'</strong>')}<p>${esc(m.intro||'소개가 없습니다.')}</p><div class="helper-row"><span class="tag ${m.role==='관리자'?'gold':'green'}">${esc(m.role)}</span><small>${db.adults.filter(x=>x.owner===m.id).length}개체 보유</small></div></div>`).join('')}</div>`;}
  function profilePage(){const m=current();return `${pageHead('MY ACCOUNT','내 프로필','닉네임, 프로필 사진과 소개를 변경합니다.')}<section class="profile-top">${breederLink(m.id,'profile-breeder',avatar(m,true))}<div><h2>${breederLink(m.id,'breeder-name',esc(m.nickname))}</h2><p>${esc(m.role)} · Google 인증 계정</p></div></section><section class="panel profile-edit"><form id="profile-form"><div class="profile-photo-field"><label for="profile-photo">프로필 사진</label><div class="profile-photo-row">${avatar(m,true)}<div><input id="profile-photo" type="file" name="photo" accept="image/jpeg,image/png,image/webp" /><button type="button" class="btn btn-light btn-sm" data-action="reset-profile-photo">사진 초기화</button></div></div></div><div class="form-grid"><div class="field"><label for="profile-name">닉네임 *</label><input id="profile-name" name="nickname" maxlength="30" required value="${attr(m.nickname)}"/></div><div class="field full"><label for="profile-intro">소개</label><textarea id="profile-intro" name="intro" maxlength="400">${esc(m.intro||'')}</textarea></div></div><div class="helper-row"><button class="btn btn-dark" type="submit">저장</button></div></form></section>`;}
  function dataPage(){return pageHead('DATA CENTER','데이터 연결','')+'<section class="panel section-pad"><div class="detail-subhead">'+icon('shield')+' BeetleLog 계정 연결</div><div class="helper-row"><button class="btn btn-light" data-action="check-beetle">연결 상태 확인</button><button class="btn btn-light" data-nav="help">도움말</button></div><div id="beetle-connect-result" class="section-caption">아직 확인하지 않았습니다.</div></section>';}
const opt=(items,current,empty='선택 안 함')=>`<option value="">${empty}</option>${items.map(x=>`<option value="${attr(x.id)}" ${x.id===current?'selected':''}>${esc(x.code||x.nickname)}${x.size?' · '+x.size+'mm':''}</option>`).join('')}`;
  function modalFrame(title,desc,body,footer){return `<div class="modal-backdrop" data-action="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-label="${attr(title)}"><div class="modal-head"><div><h2>${esc(title)}</h2></div><button type="button" class="icon-btn modal-close-btn" data-action="close-modal" aria-label="창 닫기" title="닫기">${icon('close')}</button></div>${body}${footer||''}</div></div>`;}
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

  const currentYear=()=>new Date().getFullYear();
  const yearBounds=()=>({min:currentYear()-5,max:currentYear()+5});
  const selectedYear=value=>/^\d{4}$/.test(String(value||''))?Number(value):currentYear();
  function yearOptions(value){
    const selected=selectedYear(value),{min,max}=yearBounds();
    const years=Array.from({length:11},(_,i)=>min+i);
    if(selected<min||selected>max)years.push(selected);
    return years.sort((a,b)=>a-b).map(year=>'<option value="'+year+'" '+(year===selected?'selected':'')+'>'+year+'년'+(year<min||year>max?' (기존 값)':'')+'</option>').join('');
  }
  function yearPicker({name,value,label='연도',datePart=false}){
    const selected=selectedYear(value),{min,max}=yearBounds(),outside=selected<min||selected>max;
    return '<div class="year-picker"><select name="'+attr(name)+'" data-year-select '+(datePart?'data-date-year':'')+' aria-label="'+attr(label)+'">'+yearOptions(selected)+'</select><div class="year-step-controls"><button type="button" class="year-step" data-action="year-step" data-step="1" aria-label="'+attr(label)+' 한 해 올리기" '+(outside||selected>=max?'disabled':'')+'>▲</button><button type="button" class="year-step" data-action="year-step" data-step="-1" aria-label="'+attr(label)+' 한 해 내리기" '+(outside||selected<=min?'disabled':'')+'>▼</button></div></div>';
  }
  const daysInMonth=(year,month)=>month?new Date(Number(year),Number(month),0).getDate():0;
  const padDate=n=>String(n).padStart(2,'0');
  function dayOptions(year,month,selected){
    return '<option value="">일</option>'+Array.from({length:daysInMonth(year,month)},(_,i)=>i+1).map(day=>'<option value="'+padDate(day)+'" '+(Number(selected)===day?'selected':'')+'>'+day+'일</option>').join('');
  }
  function datePicker({name,value='',label='날짜',required=false}){
    const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/),year=match?match[1]:currentYear(),month=match?match[2]:'',day=match?match[3]:'';
    return '<div class="date-picker" data-date-picker data-required="'+required+'"><input type="hidden" name="'+attr(name)+'" data-date-value value="'+attr(value)+'"/>'+yearPicker({name:name+'Year',value:year,label:label+' 연도',datePart:true})+'<div class="date-month-day"><select data-date-month aria-label="'+attr(label)+' 월" '+(required?'required':'')+'><option value="">월</option>'+Array.from({length:12},(_,i)=>i+1).map(m=>'<option value="'+padDate(m)+'" '+(Number(month)===m?'selected':'')+'>'+m+'월</option>').join('')+'</select><select data-date-day data-month-key="'+year+'-'+month+'" aria-label="'+attr(label)+' 일" '+(!month?'disabled':'')+' '+(required||month?'required':'')+'>'+dayOptions(year,month,day)+'</select></div></div>';
  }
  function updateYearButtons(select){
    const {min,max}=yearBounds(),value=Number(select.value),box=select.closest('.year-picker'),outside=value<min||value>max;
    box.querySelector('[data-step="1"]').disabled=outside||value>=max;
    box.querySelector('[data-step="-1"]').disabled=outside||value<=min;
  }
  function syncDatePicker(picker){
    const year=picker.querySelector('[data-date-year]'),month=picker.querySelector('[data-date-month]'),day=picker.querySelector('[data-date-day]'),hidden=picker.querySelector('[data-date-value]');
    const key=year.value+'-'+month.value;
    if(day.dataset.monthKey!==key){const previous=day.value;day.innerHTML=dayOptions(year.value,month.value,previous);day.dataset.monthKey=key;}
    day.disabled=!month.value;day.required=picker.dataset.required==='true'||!!month.value;
    hidden.value=month.value&&day.value?year.value+'-'+padDate(month.value)+'-'+padDate(day.value):'';
    day.setCustomValidity(month.value&&!day.value?'일을 선택하세요.':'');
  }
  function stepYear(button){
    if(button.disabled)return;
    const select=button.closest('.year-picker').querySelector('[data-year-select]'),{min,max}=yearBounds();
    select.value=String(Math.max(min,Math.min(max,Number(select.value)+Number(button.dataset.step))));
    updateYearButtons(select);
    const picker=select.closest('[data-date-picker]');if(picker)syncDatePicker(picker);
  }

  
function adultModal(id){const a=adult(id),t=a||{code:'',lineage:'',generation:'',sex:'M',size:'',emerged:'',breeder:db.currentUser,owner:db.currentUser,father:'',mother:'',source:'우화',status:'보유',note:''};const body=`<form id="adult-form"><input type="hidden" name="id" value="${attr(a?.id||'')}"/><div class="modal-content"><div class="form-grid"><div class="field full adult-photo-field"><label for="adult-photo-input">성충 사진 (선택)</label>
      <div class="adult-photo-row"><img id="adult-photo-preview" src="${attr(ui.adultPhotoPreview||((ui.adultPhotoReset)?defaultAdultPhoto(t.sex):specimenPhotoUrl(t)))}" alt="성충 사진 미리보기"/>
        <div class="adult-photo-controls"><input id="adult-photo-input" type="file" accept="image/jpeg,image/png,image/webp"/>
          <button type="button" class="btn btn-light btn-sm" data-action="adult-photo-remove">내 사진 제거</button>
          
        </div></div></div><div class="field"><label>관리번호 *</label><input name="code" required maxlength="60" value="${attr(t.code)}" placeholder="예: 꼴통A-001"/></div><div class="field"><label>혈통 *</label><input name="lineage" required maxlength="80" value="${attr(t.lineage)}" placeholder="예: 꼴통A, Wild"/></div><div class="field"><label>누대수</label><input name="generation" maxlength="30" list="adult-generation-options" value="${attr(t.generation||'')}" placeholder="예: WD, WF1, F2, CBF1"/><datalist id="adult-generation-options">${['WD','WF1','WF2','WF3','F1','F2','F3','F4','CBF1','CBF2','CBF3'].map(v=>`<option value="${v}"></option>`).join('')}</datalist></div><div class="field"><label>성별 *</label><select name="sex"><option value="M" ${t.sex==='M'?'selected':''}>♂ 수컷</option><option value="F" ${t.sex==='F'?'selected':''}>♀ 암컷</option></select></div><div class="field"><label>체장 (mm)</label><input name="size" type="number" min="0" max="200" step="0.1" value="${attr(t.size)}" placeholder="84.2"/></div><div class="field"><label>우화일</label>${datePicker({name:"emerged",value:t.emerged,label:"우화일"})}</div><div class="field"><label>보유 상태</label><select name="status">${['보유','분양','사망'].map(v=>`<option value="${attr(v)}" ${t.status===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>브리더</label><select name="breeder">${opt(db.members,t.breeder,'외부 / 미등록')}</select></div><div class="field"><label>현재 소유자</label>${isAdmin()?`<select name="owner" required ${a?'disabled':''}>${opt(db.members,t.owner,'선택')}</select>${a?`<input type="hidden" name="owner" value="${attr(t.owner)}"/>`:''}`:`<input disabled value="${attr(memberName(t.owner||db.currentUser))}"/><input type="hidden" name="owner" value="${attr(t.owner||db.currentUser)}"/>`}</div><div class="field"><label>부 ♂ (계통도 자동 연결)</label><select name="father">${opt(db.adults.filter(x=>x.sex==='M'&&x.id!==id),t.father,'미등록 / 모름')}</select></div><div class="field"><label>모 ♀ (계통도 자동 연결)</label><select name="mother">${opt(db.adults.filter(x=>x.sex==='F'&&x.id!==id),t.mother,'미등록 / 모름')}</select></div><div class="field"><label>입수 경로</label><select name="source">${['우화','입양','채집'].map(v=>`<option ${t.source===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field full"><label>개체 메모</label><textarea name="note" maxlength="1000">${esc(t.note||'')}</textarea></div></div></div><div class="modal-actions">${a?`<button type="button" class="btn btn-red delete-record" data-action="delete-adult" data-id="${attr(a.id)}">삭제</button>`:''}<button type="button" class="btn btn-light" data-action="close-modal">취소</button><button type="submit" class="btn btn-dark">${a?'변경사항 저장':'성충 등록'}</button></div></form>`;return modalFrame(a?'성충 정보 수정':'새 성충 등록','왕사슴벌레 개체 정보를 입력합니다.',body);}
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
    const body=`<form id="line-form"><input type="hidden" name="id" value="${attr(l?.id||'')}"/><input type="hidden" name="version" value="${attr(l?.updatedAt||'')}"/><div class="modal-content"><div class="form-grid">
      <div class="field"><label>라인명 *</label><input name="name" required maxlength="80" value="${attr(l?.name||'')}" placeholder="예: 꼴통A"/></div>
      <div class="field"><label>시즌 (연도)</label>${yearPicker({name:"year",value:l?.year,label:"시즌 연도"})}</div>
      <div class="field full wild-line-field"><label class="wild-line-toggle"><input type="checkbox" name="isWild" ${wild?'checked':''}/><span>Wild</span></label></div>
      <div class="field"><label data-line-father-label>${wild?'부 ♂ (선택)':'부 ♂ *'}</label><select name="father" ${wild?'':'required'}>${opt(db.adults.filter(x=>x.sex==='M'),l?.father||'',wild?'미등록 / 모름':'수컷 개체 선택')}</select></div>
      <div class="field"><label>모 ♀ *</label><select name="mother" required>${opt(db.adults.filter(x=>x.sex==='F'),l?.mother||'','암컷 개체 선택')}</select></div>
      <div class="field full"><label>누대수</label><div class="line-generation-controls"><input name="generation" maxlength="30" value="${attr(l?.generation||suggested)}" data-manual="${l?.generation?'true':'false'}" placeholder="예: WF1, F3, CBF1"/><button type="button" class="btn btn-light btn-sm" data-action="line-generation-auto">자동 계산</button></div><small class="field-hint" data-line-generation-hint>${suggested?'자동 계산값: '+esc(suggested)+' · 직접 수정할 수 있습니다.':'부모의 혈통·누대수를 확인하거나 직접 입력하세요.'}</small></div>
      <div class="field full"><label>메모</label><textarea name="note" maxlength="700" placeholder="산란 세팅, 교배 이력 등">${esc(l?.note||'')}</textarea></div>
      </div>${l?`<div class="line-file-tools"><button type="button" class="btn btn-light btn-sm" data-action="download-line" data-id="${attr(l.id)}">${icon('download')} Excel 내보내기</button><button type="button" class="btn btn-light btn-sm" data-action="excel-import" data-kind="larvae" data-line-id="${attr(l.id)}">${icon('upload')} Excel 가져오기</button></div>`:''}</div>
      <div class="modal-actions">${l?`<button type="button" class="btn btn-red delete-record" data-action="delete-line" data-id="${attr(l.id)}">삭제</button>`:''}<button type="button" class="btn btn-light" data-action="close-modal">취소</button><button class="btn btn-dark" type="submit">${l?'변경사항 저장':'라인 생성'}</button></div></form>`;
    return modalFrame(l?'라인 정보 수정':'새 라인 생성','등록된 성충으로 일반·Wild 라인을 관리합니다.',body);
  }
  function transferModal(id){const a=adult(id);if(!a)return '';const choices=ui.transferCandidates||[];const body=`<form id="transfer-form"><input type="hidden" name="id" value="${attr(id)}"/><input type="hidden" name="version" value="${attr(a.updatedAt||'')}"/><div class="modal-content"><div class="form-grid"><div class="field full"><label>보낼 성충</label><input disabled value="${attr(a.code)} · ${attr(a.lineage)} · ${attr(fmtSize(a.size))}"/></div><div class="field"><label>현재 보유자</label><input disabled value="${attr(memberName(a.owner))}"/></div><div class="field"><label>받을 KML 회원 *</label><select name="to" required>${opt(choices,'','회원 선택')}</select>${!choices.length?'':''}</div><div class="field"><label>이동일 *</label>${datePicker({name:'date',value:dateToday(),label:'이동일',required:true})}</div><div class="field full"><label>보내기 메모</label><textarea name="note" maxlength="1000" placeholder="분양, 사육 이관 등"></textarea></div></div><div class="note">상대가 수락하면 보유 목록이 이동합니다.</div><p class="notification-error" role="alert" data-transfer-error hidden></p></div><div class="modal-actions"><button type="button" class="btn btn-light" data-action="close-modal">닫기</button><button class="btn btn-dark" type="submit" ${!choices.length?'disabled':''}>성충 보내기</button></div></form>`;return modalFrame('성충 보내기','국균연구소 내부 회원에게 성충을 보냅니다.',body);}
  // Keep the page behind a dialog stationary, especially in mobile Safari.
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
    root.innerHTML=ui.modal?.kind==='excel-import'?excelImportModal():ui.modal?.kind==='larva'?larvaModal(ui.modal.id):ui.modal?.kind==='adult'?adultModal(ui.modal.id):ui.modal?.kind==='line'?lineModal(ui.modal.id):ui.modal?.kind==='transfer'?transferModal(ui.modal.id):ui.modal?.kind==='beetle-import'?beetleImportModal():'';
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
  function render(){if(!allowed){gate();return;}const r=route();if(r.page==='members'&&!isAdmin()){go('dashboard');return;}if(!['adult','larva'].includes(r.page))leaveSpecimenDetail();app.innerHTML=shell(r.page);document.getElementById('page-content').innerHTML= r.page==='help'?helpPage():r.page==='notifications'?notificationsPage():r.page==='dashboard'?dashboard():r.page==='mypage'?myPage():r.page==='adults'||r.page==='registry'?adultsPage():r.page==='breeder'?breederPage(r.id):r.page==='adult'?adultDetail(r.id):r.page==='larva'?larvaDetail(r.id):r.page==='lines'||r.page==='archive'?linesPage():r.page==='line'?lineDetail(r.id):r.page==='members'&&isAdmin()?membersPage():r.page==='profile'?profilePage():r.page==='data'?dataPage():dashboard();renderModal();mountSpecimenTools();mountSocial();document.title=`KML | ${({help:'도움말',notifications:'알림',breeder:'브리더 기록',dashboard:'국균연구소 DB',adults:'성충 관리',adult:'개체 상세',larva:'유충 상세',lines:'라인 관리',line:'라인 상세',members:'브리더 목록',mypage:'마이페이지',registry:'전체 성충',archive:'전체 라인',profile:'내 프로필',data:'데이터 관리'})[r.page]||'국균연구소'}`;}
  function openModal(kind,id=''){ui.modal={kind,id};ui.adultPhotoPreview=null;ui.adultPhotoReset=false;renderModal();}
  function closeModal(){if(ui.modal?.kind==='excel-import'&&closeExcelImport())return;ui.modal=null;ui.adultPhotoPreview=null;ui.adultPhotoReset=false;renderModal();}
  const lineExcelDownloads=new Set();
function lineExcelData(line,list){
 const count=Math.max(5,...list.map(v=>larvaBottleRecords(v).length));
 if(count>60)throw Error('Excel 양식은 최대 60병까지 지원합니다.');
 if(list.length>500)throw Error('한 번에 내보낼 수 있는 유충은 최대 500개체입니다.');
 const headers=['라인명*','관리번호*','성별','두폭(mm)','상태',...Array.from({length:count},(_,i)=>[`${i+1}병 날짜`,`${i+1}병 먹이원`,`${i+1}병 용량(cc)`,`${i+1}병 무게(g)`]).flat(),'용화일','용화 무게(g)','우화일','체장(mm)','메모'];
 const sorted=list.slice().sort((a,b)=>String(a.number??'').localeCompare(String(b.number??''),'ko',{numeric:true,sensitivity:'base'}));
 const rows=sorted.map(v=>{const records=larvaBottleRecords(v),source=v.sourceData||{},p=source.pupation||{};return[line.name,String(v.number??''),v.sex==='M'?'수컷':v.sex==='F'?'암컷':'미구분',larvaHeadWidth(v),source.status||'유충',...Array.from({length:count},(_,i)=>{const b=records[i]||{};return[b.date??'',b.feedBrand||b.feedType||'',b.bottleSize??'',b.weight??''];}).flat(),p.pupaDate??'',p.pupaWeight??'',v.emerged||source.eclosion?.date||'',v.size??'',source.memo??''];});
 return {headers,rows};
}
async function downloadLineExcel(id,button){
 const line=byId(db.lines,id);if(!line||!(mineLine(line)||isAdmin())||lineExcelDownloads.has(id))return;
 const user=db.currentUser;let worker,timer;const label=button?.innerHTML;
 lineExcelDownloads.add(id);if(button){button.disabled=true;button.textContent='Excel 준비 중…';}
 try{
  const data=lineExcelData(line,db.larvae.filter(v=>v.lineId===id));
  const controller=new AbortController(),fetchTimer=setTimeout(()=>controller.abort(),20000);let response;
  try{response=await fetch('assets/templates/KML_larvae_template.xlsx?v=headwidth-sort-20261028',{signal:controller.signal});if(!response.ok)throw Error('엑셀 양식을 내려받지 못했습니다.');}finally{clearTimeout(fetchTimer);}
  const template=await response.arrayBuffer();
  const buffer=await new Promise((resolve,reject)=>{
   worker=new Worker('assets/excel-export-worker.js?v=headwidth-sort-20261028');
   timer=setTimeout(()=>reject(Error('파일 생성 시간이 초과됐습니다. 다시 시도해 주세요.')),30000);
   worker.onmessage=event=>event.data.error?reject(Error(event.data.error)):resolve(event.data.buffer);
   worker.onerror=()=>reject(Error('Excel 파일을 만들지 못했습니다. 다시 시도해 주세요.'));
   worker.postMessage({template,...data},[template]);
  });
  if(db.currentUser!==user)return;
  const url=URL.createObjectURL(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})),a=document.createElement('a');
  a.href=url;a.download=`KML_${line.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_')}_유충기록.xlsx`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  notify('엑셀 파일을 내려받았습니다. 수정 후 Excel 가져오기에서 다시 넣을 수 있습니다.');
 }catch(error){if(db.currentUser===user)notify('Excel 내보내기 실패: '+(error.message||String(error)));}
 finally{worker?.terminate();clearTimeout(timer);lineExcelDownloads.delete(id);if(button){button.disabled=false;button.innerHTML=label;}}
}
const canEditLarvaLine=line=>!!line&&(mineLine(line)||isAdmin());
const larvaEditorText=value=>value===null||value===undefined?'':String(value);
function larvaEditorField(name,label,value,type='text',extra=''){
 return '<label class="field"><span>'+label+'</span><input type="'+type+'" name="'+name+'" value="'+attr(larvaEditorText(value))+'" '+extra+'></label>';
}
function larvaEditorRow(record={},index=-1){
 const r=record;return '<fieldset class="larva-edit-record" data-larva-record data-original-index="'+index+'"><legend>교체 기록</legend><div class="form-grid">'+
 larvaEditorField('date','날짜',r.date,'date','required')+larvaEditorField('feedBrand','먹이원 · 제품명',r.feedBrand||r.feedType,'text','maxlength="160"')+
 larvaEditorField('feedType','먹이 종류',r.feedType,'text','maxlength="80"')+larvaEditorField('bottleSize','용량 (cc)',r.bottleSize,'text','maxlength="40"')+
 larvaEditorField('weight','무게 (g)',r.weight,'number','min="0" step="any"')+larvaEditorField('headWidth','두폭 (mm)',r.headWidth,'number','min="0" step="any"')+
 larvaEditorField('nextDate','다음 교체일',r.nextDate,'date')+larvaEditorField('instar','령수',r.instar,'text','maxlength="30"')+
 '<label class="field full"><span>기록 메모</span><textarea name="memo" maxlength="2000">'+esc(r.memo||'')+'</textarea></label></div><div class="helper-row"><label class="larva-pudding"><input type="checkbox" name="pudding" '+(labelIsPudding(r)?'checked':'')+'> 푸딩</label><button type="button" class="btn btn-red btn-sm" data-action="remove-larva-record">이 기록 제거</button></div></fieldset>';
}
function larvaModal(id){
 const v=byId(db.larvae,id),line=v&&byId(db.lines,v.lineId);if(!v||!canEditLarvaLine(line))return '';
 const source=v.sourceData||{},p=source.pupation||{},ec=source.eclosion||{};
 const states=[...new Set(['유충','용화','우화','분양','사망',source.status].filter(Boolean))];
 const body='<form id="larva-form"><input type="hidden" name="id" value="'+attr(id)+'"><input type="hidden" name="version" value="'+attr(v.updatedAt||'')+'"><div class="modal-content"><div class="form-grid">'+larvaEditorField('number','관리번호',v.number,'text','required maxlength="80"')+
 '<label class="field"><span>성별</span><select name="sex">'+[['U','미구분'],['M','♂ 수컷'],['F','♀ 암컷']].map(([key,label])=>'<option value="'+key+'" '+(v.sex===key?'selected':'')+'>'+label+'</option>').join('')+'</select></label><label class="field"><span>상태</span><select name="status">'+states.map(x=>'<option '+((source.status||'유충')===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label>'+larvaEditorField('specimenMemo','개체 메모',source.memo,'text','maxlength="2000"')+'</div><h3>병별 사육 기록</h3><div data-larva-records>'+larvaBottleRecords(v).map((r,i)=>larvaEditorRow(r,i)).join('')+'</div><button type="button" class="btn btn-light" data-action="add-larva-record">'+icon('plus')+' 교체 기록 추가</button><h3>용화 · 우화</h3><div class="form-grid">'+larvaEditorField('prepupaDate','전용 날짜',p.prepupaDate,'date')+larvaEditorField('pupaDate','용화일',p.pupaDate,'date')+larvaEditorField('pupaWeight','용화 무게 (g)',p.pupaWeight,'number','min="0" step="any"')+larvaEditorField('emerged','우화일',v.emerged||ec.date,'date')+larvaEditorField('size','체장 (mm)',v.size!==''?v.size:ec.totalLength,'number','min="0" max="200" step="any"')+'</div><p class="section-caption">'+(v.beetlelogId?'저장하면 같은 계정의 BeetleLog 원본에도 반영됩니다.':'KML에 등록된 유충 기록을 수정합니다.')+' 사진·표시 등 기존 추가 정보는 유지됩니다.</p><p data-larva-save-error class="larva-save-error" role="alert" hidden></p></div><div class="modal-actions"><button type="button" class="btn btn-light" data-action="close-modal">취소</button><button type="submit" class="btn btn-dark">변경사항 저장</button></div></form>';
 return modalFrame('유충 기록 수정',line.name+' · '+v.number,body);
}
function addLarvaEditorRow(){const host=document.querySelector('[data-larva-records]');if(host)host.insertAdjacentHTML('beforeend',larvaEditorRow({date:dateToday(),id:uid()},-1));}
function larvaEditorPayload(v,data,entries){
 const number=String(data.number||'').trim();if(!number||number.length>80)throw Error('관리번호를 입력하세요.');
 const source=JSON.parse(JSON.stringify(v.sourceData||{})),original=larvaBottleRecords(v);
 const bottles=entries.map(({index,values})=>{
   const r={...(index>=0?original[index]:{id:uid()})};
   for(const key of ['date','feedBrand','feedType','bottleSize','weight','headWidth','nextDate','instar','memo'])r[key]=larvaEditorText(values[key]).trim();
   if(!r.date||!validLarvaDate(r.date))throw Error('교체 날짜를 확인하세요.');
   if(r.nextDate&&!validLarvaDate(r.nextDate))throw Error('다음 교체일을 확인하세요.');
   for(const key of ['weight','headWidth'])if(r[key]!==''&&(!Number.isFinite(Number(r[key]))||Number(r[key])<0))throw Error('무게와 두폭은 0 이상의 숫자로 입력하세요.');
   r.id=r.id||uid();r.pudding=values.pudding===true;return r;
 });
 for(const key of ['prepupaDate','pupaDate','emerged'])if(data[key]&&!validLarvaDate(data[key]))throw Error('용화·우화 날짜를 확인하세요.');
 for(const key of ['pupaWeight','size'])if(data[key]!==''&&data[key]!=null&&(!Number.isFinite(Number(data[key]))||Number(data[key])<0||(key==='size'&&Number(data[key])>200)))throw Error('용화 무게와 체장을 확인하세요.');
 source.code=number;source.sex=data.sex==='M'?'수컷 ♂':data.sex==='F'?'암컷 ♀':'미구분';source.status=data.status;source.memo=String(data.specimenMemo||'');source.bottleRecords=bottles;
 source.pupation={...(source.pupation||{}),prepupaDate:data.prepupaDate||'',pupaDate:data.pupaDate||'',pupaWeight:larvaEditorText(data.pupaWeight)};
 source.eclosion={...(source.eclosion||{}),date:data.emerged||'',totalLength:larvaEditorText(data.size)};
 return {number,sex:['M','F'].includes(data.sex)?data.sex:'U',records:bottles.map(r=>[r.date,r.feedBrand||r.feedType,r.bottleSize,r.weight]),emerged:data.emerged||null,size:data.size===''||data.size==null?null:Number(data.size),source_data:source};
}
function validLarvaDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
async function saveLarvaEditor(form){
 if(form.dataset.saving==='true')return;
 const data=Object.fromEntries(new FormData(form)),v=byId(db.larvae,data.id),line=v&&byId(db.lines,v.lineId),errorBox=form.querySelector('[data-larva-save-error]');
 const fail=message=>{if(errorBox){errorBox.hidden=false;errorBox.textContent=message;}notify(message);};
 if(!v||!canEditLarvaLine(line))return fail('본인 라인의 유충만 수정할 수 있습니다.');
 if(!data.version||data.version!==v.updatedAt)return fail('기록이 변경됐습니다. 창을 닫고 최신 기록에서 다시 수정하세요.');
 const submit=form.querySelector('[type="submit"]');
 try{
   const entries=Array.from(form.querySelectorAll('[data-larva-record]')).map(row=>({index:Number(row.dataset.originalIndex),values:Object.fromEntries(Array.from(row.querySelectorAll('[name]')).map(input=>[input.name,input.type==='checkbox'?input.checked:input.value]))}));
   const payload=larvaEditorPayload(v,data,entries);
   if(db.larvae.some(x=>x.id!==v.id&&x.lineId===v.lineId&&x.number===payload.number))throw Error('같은 라인에 이미 있는 관리번호입니다.');
   form.dataset.saving='true';if(submit)submit.disabled=true;
   await persist('kml_larvae',v.id,payload,true);
   await loadRemote();closeModal();render();notify(v.beetlelogId?'유충 기록을 저장하고 BeetleLog에 반영했습니다.':'유충 기록을 저장했습니다.');
 }catch(error){fail('저장 실패: '+(error.message||String(error)));}
 finally{form.dataset.saving='false';if(submit)submit.disabled=false;}
}
// Social state stays outside page rendering so inbox and likes never discard form input.
const social={user:'',items:[],unread:0,requests:[],reactions:{},reactionAdult:'',open:false,loading:false,loaded:false,more:false,busy:new Set(),timer:0,error:''};
function resetSocial(){Object.assign(social,{user:'',items:[],unread:0,requests:[],reactions:{},reactionAdult:'',open:false,loading:false,loaded:false,more:false,error:''});social.busy.clear();if(social.timer)clearTimeout(social.timer);social.timer=0;}
function ensureSocialUser(){if(social.user!==db.currentUser){resetSocial();social.user=db.currentUser||'';}}
const requestLabel=state=>({pending:'수락 대기',accepted:'받기 완료',declined:'거절됨',cancelled:'보내기 취소',expired:'만료됨'})[state]||'처리됨';
const socialDate=value=>{const date=new Date(value);return Number.isNaN(date.valueOf())?'':new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'}).format(date);};
function notificationBell(){
 ensureSocialUser();const count=social.unread;
 return '<button type="button" id="notification-bell" class="icon-btn notification-bell" data-action="toggle-inbox" aria-controls="notification-root" aria-expanded="'+social.open+'" aria-label="알림'+(count?' · 읽지 않은 알림 '+count+'개':'')+'">'+icon('bell')+'<span class="notification-badge" aria-hidden="true" '+(!count?'hidden':'')+'>'+(count>99?'99+':count)+'</span></button>';
}
function noticeText(item){
 const code=item.adult_code||'성충';
 return ({transfer_request:code+' 성충을 보냈습니다. 수락하면 내 성충 목록으로 이동합니다.',transfer_accepted:code+' 성충을 받았습니다.',transfer_declined:code+' 성충 보내기를 거절했습니다.',transfer_cancelled:code+' 성충 보내기를 취소했습니다.',transfer_expired:code+' 보내기가 만료되었습니다.',comment:code+' 성충에 댓글을 남겼습니다.',comment_like:'내 댓글에 좋아요를 눌렀습니다.'})[item.kind]||'새 알림이 있습니다.';
}
function requestActions(r){
 if(!r||r.status!=='pending')return r?'<span class="tag">'+requestLabel(r.status)+'</span>':'';
 const disabled=social.busy.has('request:'+r.id)?'disabled':'';
 const button=(action,label,cls)=>'<button type="button" class="btn '+cls+' btn-sm" data-action="resolve-transfer" data-id="'+attr(r.id)+'" data-choice="'+action+'" '+disabled+'>'+label+'</button>';
 return '<div class="notification-request-actions">'+(r.to_user===db.currentUser?button('accept','수락 · 내 성충으로 받기','btn-dark')+button('decline','거절','btn-light'):r.from_user===db.currentUser||r.initiated_by===db.currentUser?button('cancel','보내기 취소','btn-light'):'')+'</div>';
}
function notificationRow(n){
 const r=social.requests.find(x=>x.id===n.request_id),m=member(n.actor_id)||{nickname:n.actor_name||'KML',avatar_url:n.actor_avatar||'',initial:(n.actor_name||'K')[0]};
 const actor=n.actor_id?'<a class="breeder-link notification-actor" href="#/breeder/'+attr(n.actor_id)+'" data-nav="breeder/'+attr(n.actor_id)+'">'+avatar(m)+'<strong>'+esc(m.nickname)+'</strong></a>':'<span class="notification-actor">'+icon('bell')+'<strong>KML</strong></span>';
 return '<article class="notification-item '+(!n.read_at?'is-unread':'')+'" data-notice-id="'+attr(n.id)+'"><div class="notification-meta">'+actor+'<time datetime="'+attr(n.created_at)+'">'+esc(socialDate(n.created_at))+'</time></div><button type="button" class="notification-open" data-action="open-notice" data-id="'+attr(n.id)+'">'+esc(noticeText(n))+'</button>'+(n.excerpt?'<p class="notification-excerpt">'+esc(n.excerpt)+'</p>':'')+(n.kind==='transfer_request'?requestActions(r):'')+(!n.read_at?'<button type="button" class="notification-read" data-action="read-notice" data-id="'+attr(n.id)+'">읽음 처리</button>':'')+'</article>';
}
function inboxContents(compact=false){
 return (social.error?'<p class="notification-error" role="alert">'+esc(social.error)+'</p>':'')+(social.items.length?social.items.map(notificationRow).join(''):'<div class="empty">'+(social.loaded?'아직 알림이 없습니다.':'알림을 불러오는 중…')+'</div>')+(social.more?'<div class="notification-more"><button type="button" class="btn btn-light btn-sm" data-action="older-notifications" '+(social.loading?'disabled':'')+'>이전 알림 더 보기</button></div>':'')+(compact?'<button type="button" class="notification-all" data-nav="notifications">전체 알림 · 보낸 성충 보기 '+icon('arrow')+'</button>':'');
}
function sentTransferRows(){
 const list=social.requests.filter(r=>r.from_user===db.currentUser||r.initiated_by===db.currentUser).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
 return list.length?list.map(r=>'<article class="sent-transfer"><div><a class="plain-link id-link" href="#/adult/'+attr(r.adult_id)+'" data-nav="adult/'+attr(r.adult_id)+'">'+esc(adult(r.adult_id)?.code||'성충')+'</a><p>'+esc(memberName(r.from_user))+' → '+esc(memberName(r.to_user))+'</p><small>'+esc(socialDate(r.created_at))+'</small></div>'+requestActions(r)+'</article>').join(''):'<div class="empty">보낸 성충이 없습니다.</div>';
}
function notificationsPage(){
 ensureSocialUser();return pageHead('NOTIFICATIONS','알림','성충 받기와 댓글·좋아요 알림을 확인합니다.','<button type="button" class="btn btn-light" data-action="read-all-notices">모두 읽음</button>')+'<div class="notifications-layout"><section class="panel"><div class="panel-head"><div class="panel-title">받은 알림 <span data-unread-total>'+social.unread+'</span></div></div><div data-inbox-list>'+inboxContents()+'</div></section><section class="panel"><div class="panel-head"><div class="panel-title">보낸 성충</div></div><div data-sent-transfers>'+sentTransferRows()+'</div></section></div>';
}
function setSocialHTML(node,html){if(node&&node.kmlSocialHTML!==html){node.innerHTML=html;node.kmlSocialHTML=html;}}
function renderInboxPopover(){
 const root=document.getElementById('notification-root');if(!root)return;
 const body=root.querySelector('.notification-popover-list'),scroll=body?.scrollTop||0;
 const markup=social.open?'<section class="notification-popover" role="dialog" aria-modal="false" aria-labelledby="notification-popover-title"><header><h2 id="notification-popover-title" tabindex="-1">알림</h2><div class="actions"><button type="button" class="notification-read" data-action="read-all-notices">모두 읽음</button><button type="button" class="icon-btn" data-action="close-inbox" aria-label="알림 닫기">'+icon('close')+'</button></div></header><div class="notification-popover-list">'+inboxContents(true)+'</div></section>':'';
 setSocialHTML(root,markup);
 const next=root.querySelector('.notification-popover-list');if(next)next.scrollTop=scroll;
 const bell=document.getElementById('notification-bell');if(bell)bell.setAttribute('aria-expanded',String(social.open));
}
function closeInbox(focus=false){social.open=false;renderInboxPopover();if(focus)document.getElementById('notification-bell')?.focus();}
function renderSocialFragments(){
 const bell=document.getElementById('notification-bell');if(bell){bell.setAttribute('aria-label','알림'+(social.unread?' · 읽지 않은 알림 '+social.unread+'개':''));const badge=bell.querySelector('.notification-badge');if(badge){badge.hidden=!social.unread;badge.textContent=social.unread>99?'99+':String(social.unread);}}
 renderInboxPopover();
 document.querySelectorAll('[data-inbox-list]').forEach(root=>{setSocialHTML(root,inboxContents());});
 document.querySelectorAll('[data-sent-transfers]').forEach(root=>{setSocialHTML(root,sentTransferRows());});
 document.querySelectorAll('[data-unread-total]').forEach(el=>{el.textContent=social.unread;});
 document.querySelectorAll('[data-adult-transfer-state]').forEach(el=>{const r=social.requests.find(x=>x.adult_id===el.dataset.adultTransferState&&x.status==='pending');el.innerHTML=r?'<div class="pending-transfer"><span>'+esc(memberName(r.to_user))+'님에게 보내기 · 수락 대기</span>'+requestActions(r)+'</div>':'';});
 renderCommentReactions();
}
async function refreshSocial(older=false){
 if(!allowed||!authUser||document.hidden)return;ensureSocialUser();if(social.loading)return;
 const user=social.user,account=authUser.id;social.loading=true;
 try{
  const last=older?social.items.at(-1):null;
  const args={p_before:last?.created_at||null,p_before_id:last?.id||null,p_limit:30};
  const [feed,pending,recent]=await Promise.all([supa.rpc('kml_inbox',args),supa.from('kml_transfer_requests').select('*').eq('status','pending').order('created_at',{ascending:false}),supa.from('kml_transfer_requests').select('*').neq('status','pending').order('created_at',{ascending:false}).limit(30)]);
  for(const result of [feed,pending,recent])if(result.error)throw result.error;
  if(!allowed||authUser?.id!==account||social.user!==user)return;
  const firstLoad=!social.loaded,incoming=feed.data?.items||[],map=new Map(social.items.map(x=>[x.id,x]));for(const item of incoming)map.set(item.id,item);
  social.items=[...map.values()].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))||String(b.id).localeCompare(String(a.id)));
  social.unread=Number(feed.data?.unread||0);social.requests=[...(pending.data||[]),...(recent.data||[])];social.loaded=true;social.error='';
  if(older||firstLoad)social.more=incoming.length===30;
 }catch(error){if(social.user===user)social.error='알림을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.';}
 finally{if(social.user===user){social.loading=false;renderSocialFragments();}}
}
async function markNoticesRead(id=null){
 const account=authUser?.id;if(!account)return;
 const {error}=await supa.rpc('kml_mark_notifications_read',{p_id:id});if(error)throw error;
 if(authUser?.id!==account)return;
 const now=new Date().toISOString();let read=0;for(const n of social.items)if((!id||n.id===id)&&!n.read_at){n.read_at=now;read++;}social.unread=id?Math.max(0,social.unread-read):0;renderSocialFragments();
 await refreshSocial();
}
async function openNotice(id){
 const n=social.items.find(x=>x.id===id);if(!n)return;
 await markNoticesRead(id);closeInbox();
 if(n.adult_id){go('adult/'+n.adult_id+(n.comment_id?'/comment-'+n.comment_id:''));}else notify('연결된 개체가 삭제되었습니다. 알림 기록은 유지됩니다.');
}
function commentReactionButton(c){
 const stat=social.reactions[c.id]||{likes:0,liked:false},busy=social.busy.has('like:'+c.id);
 return '<button type="button" class="comment-like '+(stat.liked?'is-liked':'')+'" data-action="like-comment" data-id="'+attr(c.id)+'" aria-pressed="'+stat.liked+'" aria-label="댓글 좋아요'+(stat.liked?' 취소':'')+'" '+(busy?'disabled':'')+'>'+icon('heart')+'<span>좋아요</span><b>'+Number(stat.likes||0)+'</b></button>';
}
function renderCommentReactions(){document.querySelectorAll('[data-comment-reaction]').forEach(el=>{const c=byId(db.comments,el.dataset.commentReaction);if(c)setSocialHTML(el,commentReactionButton(c));});}
async function refreshCommentReactions(){
 const r=route();if(!allowed||r.page!=='adult')return;const account=authUser?.id;
 const {data,error}=await supa.rpc('kml_comment_reactions',{p_adult:r.id});
 if(error||!allowed||authUser?.id!==account||route().page!=='adult'||route().id!==r.id)return;
 social.reactionAdult=r.id;for(const stat of data||[])if(!social.busy.has('like:'+stat.comment_id))social.reactions[stat.comment_id]=stat;
 renderCommentReactions();
}
async function toggleCommentLike(id){
 const key='like:'+id;if(social.busy.has(key))return;const account=authUser?.id;social.busy.add(key);renderCommentReactions();
 try{const {data,error}=await supa.rpc('kml_toggle_comment_like',{p_comment:id});if(error)throw error;if(authUser?.id===account&&data)social.reactions[id]=data;}
 catch(error){notify('좋아요 저장 실패: '+(error.message||String(error)));}
 finally{if(authUser?.id===account){social.busy.delete(key);renderCommentReactions();}}
}
async function openTransferModal(id){
 const a=adult(id);if(!a||(!mineAdult(a)&&!isAdmin()))return notify('본인 성충만 보낼 수 있습니다.');
 const account=authUser?.id;const {data,error}=await supa.rpc('kml_transfer_candidates');
 if(account!==authUser?.id)return;if(error)return notify('회원 목록을 불러오지 못했습니다: '+error.message);
 ui.transferCandidates=(data||[]).filter(x=>x.user_id!==a.owner).map(x=>({id:x.user_id,nickname:x.nickname,avatar_url:x.avatar_url}));
 openModal('transfer',id);
}
async function submitTransfer(form){
 if(form.dataset.saving==='true')return;const data=Object.fromEntries(new FormData(form)),a=adult(data.id);
 const errorBox=form.querySelector('[data-transfer-error]'),submit=form.querySelector('[type="submit"]');
 const fail=message=>{if(errorBox){errorBox.hidden=false;errorBox.textContent=message;}notify(message);};
 if(!a||(!mineAdult(a)&&!isAdmin()))return fail('본인 성충만 보낼 수 있습니다.');
 if(!data.to||data.to===a.owner)return fail('받을 회원을 선택하세요.');
 form.dataset.saving='true';if(submit)submit.disabled=true;
 try{
  const account=authUser?.id;
  const {data:requestId,error}=await supa.rpc('kml_request_adult_transfer',{p_adult:a.id,p_to:data.to,p_date:data.date,p_note:data.note||'',p_version:data.version});if(error)throw error;
  if(account!==authUser?.id)return;
  social.requests.push({id:requestId,adult_id:a.id,from_user:a.owner,to_user:data.to,initiated_by:db.currentUser,status:'pending',transfer_date:data.date,note:data.note||'',created_at:new Date().toISOString()});
  closeModal();render();notify('받는 회원에게 알림을 보냈습니다. 수락하면 보유 목록이 이동합니다.');await refreshSocial();
 }catch(error){fail('보내기 실패: '+(error.message||String(error)));}
 finally{form.dataset.saving='false';if(submit)submit.disabled=false;}
}
async function resolveTransfer(id,choice){
 const key='request:'+id;if(social.busy.has(key))return;const account=authUser?.id;social.busy.add(key);renderSocialFragments();
 try{
  const {data,error}=await supa.rpc('kml_resolve_adult_transfer',{p_request:id,p_action:choice});if(error)throw error;
  if(account!==authUser?.id)return;
  const local=social.requests.find(r=>r.id===id);if(local){local.status=data;if(data==='accepted'){const a=adult(local.adult_id);if(a){a.owner=local.to_user;a.status='보유';a.updatedAt='';}}}
  let refreshFailed=false;try{await loadRemote();}catch(error){refreshFailed=true;}
  await refreshSocial();
  if(!ui.modal&&!document.querySelector('#comment-form textarea')?.value?.trim())render();
  if(refreshFailed)notify('요청을 처리했습니다. 최신 목록을 불러오려면 새로고침해 주세요.');
  else notify(data==='accepted'?'성충을 받았습니다. 내 성충 목록에서 확인할 수 있습니다.':data==='expired'?'성충 상태가 변경되어 보내기가 만료됐습니다.':data==='declined'?'성충 받기를 거절했습니다.':'보내기를 취소했습니다.');
 }catch(error){notify('처리 실패: '+(error.message||String(error)));}
 finally{if(account===authUser?.id){social.busy.delete(key);renderSocialFragments();}}
}
function mountSocial(){
 ensureSocialUser();renderSocialFragments();
 if(!social.loaded&&!social.loading&&!social.timer)social.timer=setTimeout(()=>{social.timer=0;refreshSocial();},0);
 if(route().page==='adult'){
  refreshCommentReactions();const anchor=route().tab;
  if(anchor?.startsWith('comment-'))requestAnimationFrame(()=>{document.getElementById(anchor)?.scrollIntoView?.({block:'center',behavior:'smooth'});});
 }
}
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&social.open){event.preventDefault();closeInbox(true);}});
document.addEventListener('click',event=>{if(social.open&&!event.target.closest('#notification-root')&&!event.target.closest('#notification-bell'))closeInbox();});
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
 const labels={lineage:'혈통',generation:'누대수',sex:'성별',size:'체장',emerged:'우화일',breeder_id:'브리더',father_id:'부',mother_id:'모',source:'입수 경로',status:'상태',note:'메모',memo:'메모',pupaDate:'용화일',prepupaDate:'전용일',pupaWeight:'용화 무게',date:'날짜',feedBrand:'먹이원',feedType:'종류',bottleSize:'용량',weight:'무게',headWidth:'두폭',pudding:'푸딩'};
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
   if(f.breeder!==undefined){const value=clean(f.breeder);let breeder=null;if(value){if(['본인','나','me'].includes(value))breeder=db.currentUser;else{const matches=db.members.filter(m=>m.nickname===value);if(matches.length!==1)throw Error('브리더 닉네임을 확인하세요. 같은 이름이 여러 명이면 개체 수정에서 선택해 주세요.');breeder=matches[0].id;}}put('breeder_id',breeder,old?.breeder||null,'브리더');}
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
document.addEventListener('click',async event=>{
    const nav=event.target.closest('[data-nav]');if(nav){if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();go(nav.dataset.nav);return;}
    const a=event.target.closest('[data-action]');if(!a)return;
    const act=a.dataset.action;
    if(act==='excel-import'){openExcelImport(a.dataset.kind,a.dataset.lineId||'');return;}
    if(act==='save-excel-import'){await saveExcelImport();return;}
    if(['toggle-inbox','close-inbox','open-notice','read-notice','read-all-notices','older-notifications','like-comment','resolve-transfer'].includes(act)){
      try{
        if(act==='toggle-inbox'){social.open=!social.open;renderInboxPopover();if(social.open){document.getElementById('notification-popover-title')?.focus();await refreshSocial();}}
        if(act==='close-inbox')closeInbox(true);
        if(act==='open-notice')await openNotice(a.dataset.id);
        if(act==='read-notice')await markNoticesRead(a.dataset.id);
        if(act==='read-all-notices')await markNoticesRead();
        if(act==='older-notifications')await refreshSocial(true);
        if(act==='like-comment')await toggleCommentLike(a.dataset.id);
        if(act==='resolve-transfer')await resolveTransfer(a.dataset.id,a.dataset.choice);
      }catch(error){notify('처리 실패: '+(error.message||String(error)));}
      return;
    }
    if(act==='edit-larva'){const v=byId(db.larvae,a.dataset.id);if(v&&canEditLarvaLine(byId(db.lines,v.lineId)))openModal('larva',v.id);else notify('본인 라인의 유충만 수정할 수 있습니다.');return;}
    if(act==='add-larva-record'){addLarvaEditorRow();return;}
    if(act==='remove-larva-record'){if(confirm('이 병 기록을 제거할까요? 저장하면 반영됩니다.'))a.closest('[data-larva-record]').remove();return;}
    if(act==='detail-specimen-view'){switchSpecimenView(a.dataset.view);return;}
    if(act==='save-specimen-label'){await saveSpecimenLabel(a);return;}
    if(act==='clear-label-feed'){clearLabelFeed(a.dataset.feed);return;}
    if(act==='toggle-label-editor'){toggleLabelEditor();return;}
    if(act==='complete-label-edit'){completeSpecimenLabelEdit();return;}
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
    if(act==='transfer'){await openTransferModal(a.dataset.id);return;}
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
    if(act==='download-line')await downloadLineExcel(a.dataset.id,a);
    if(act==='google-login'){if(!supa)return;const redirectTo=location.origin+location.pathname;const {error:e}=await supa.auth.signInWithOAuth({provider:'google',options:{redirectTo}});if(e)notify('Google 로그인 오류: '+e.message);}
    if(act==='sign-out'){ui.excelImport?.worker?.terminate();ui.excelImport=null;resetSocial();clearDetailLabels();await supa?.auth.signOut();allowed=false;authUser=null;db={members:[],adults:[],lines:[],larvae:[],comments:[],transfers:[],currentUser:null};gate();}
  });  document.addEventListener('input',e=>{
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
  document.addEventListener('change',e=>{const map={'sex-filter':'sex','year-filter':'year','status-filter':'status','sort-filter':'sort'};if(map[e.target.id]){ui[map[e.target.id]]=e.target.value;updateAdultsTable();}});
  document.addEventListener('submit',async e=>{
    const form=e.target;const formId=form.getAttribute('id');if(!['adult-form','line-form','profile-form','transfer-form','comment-form','larva-form'].includes(formId))return;e.preventDefault();if(formId==='larva-form'){await saveLarvaEditor(form);return;}const f=new FormData(form);const data=Object.fromEntries(f.entries());
    if(formId==='adult-form'){
       if(data.id){const x=adult(data.id);if(!x||(!mineAdult(x)&&!isAdmin()))return notify('본인 소유 개체만 수정할 수 있습니다.');}
      const code=String(data.code||'').trim(),lineage=String(data.lineage||'').trim();if(!code||!lineage)return notify('관리번호와 혈통을 입력하세요.');
      if(db.adults.some(x=>x.code.toLowerCase()===code.toLowerCase()&&x.id!==data.id))return notify('이미 사용 중인 관리번호입니다.');
      if(data.father&&data.father===data.mother)return notify('부모는 다른 개체여야 합니다.');
      const old=data.id?adult(data.id):null; if(old&&data.owner!==old.owner)return notify('소유자 변경은 개체 상세의 소유자 변경 기능을 이용하세요.');
      const next={id:data.id||uid(),code,lineage:/^(WD|wild|와일드)$/i.test(lineage)?'Wild':lineage,generation:String(data.generation||'').trim().toUpperCase(),sex:data.sex,size:data.size,emerged:data.emerged,breeder:data.breeder,owner:data.owner,father:data.father,mother:data.mother,source:data.source,status:data.status,note:data.note,photoUrl:ui.adultPhotoReset?'':(ui.adultPhotoPreview||old?.photoUrl||'')};
      // Prevent circular parent references (including indirect loops).
      const reaches=(start,target,seen=new Set())=>{if(!start||seen.has(start))return false;if(start===target)return true;seen.add(start);const a=adult(start);return a?reaches(a.father,target,seen)||reaches(a.mother,target,seen):false;};
      if(reaches(next.father,next.id)||reaches(next.mother,next.id))return notify('부모·자손 관계가 순환합니다. 다른 개체를 선택하세요.');
      try{const stored=await persist('kml_adults',next.id,adultRecord(next),Boolean(data.id));next.createdAt=stored.created_at||old?.createdAt||'';next.updatedAt=stored.updated_at;}catch(err){return notify('성충 저장 실패: '+(err.message||err));}
      if(!data.id)db.adults.push(next);else{const ix=db.adults.findIndex(x=>x.id===data.id);if(ix<0)return notify('기존 개체를 찾을 수 없습니다.');db.adults[ix]=next;}
      save();closeModal();go('adult/'+next.id);render();notify(data.id?'성충 정보를 수정했습니다.':'성충을 등록했습니다.');
    }
    if(formId==='line-form'){
      const name=String(data.name||'').trim();const wild=data.isWild==='on';if(!name||!data.mother||(!wild&&!data.father))return notify(wild?'라인명과 모 성충을 선택하세요.':'라인명과 부모 개체를 선택하세요.');if(db.lines.some(x=>x.name.toLowerCase()===name.toLowerCase()&&x.id!==data.id))return notify('이미 같은 라인명이 있습니다.');if(data.father===data.mother)return notify('부모 개체를 서로 다르게 선택하세요.');const old=data.id?byId(db.lines,data.id):null;if(data.id&&(!old||(!mineLine(old)&&!isAdmin())))return notify('본인이 만든 라인만 수정할 수 있습니다.');if(data.id&&data.version&&data.version!==old.updatedAt)return notify('라인이 다른 앱에서 변경됐습니다. 최신 내용을 확인한 뒤 다시 수정하세요.');const l={...(old||{}),id:data.id||uid(),name,father:data.father||'',mother:data.mother,year:data.year,generation:String(data.generation||'').trim().toUpperCase(),isWild:wild,method:old?.method||'',note:data.note,createdBy:old?.createdBy||db.currentUser};try{const stored=await persist('kml_lines',l.id,lineRecord(l),Boolean(data.id));l.createdAt=stored.created_at||old?.createdAt||'';l.updatedAt=stored.updated_at;}catch(err){return notify('라인 저장 실패: '+(err.message||err));}if(data.id){const index=db.lines.findIndex(x=>x.id===l.id);if(index>=0)db.lines[index]=l;}else db.lines.push(l);save();closeModal();go('line/'+l.id);render();notify(data.id?'라인을 수정했습니다.':'라인을 생성했습니다.');
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
  let crossAppRefreshBusy=false;
  let crossAppRefreshLast=0;
  async function refreshLinkedRecords(){
    if(crossAppRefreshBusy||!allowed||ui.modal||social.open||document.querySelector('#comment-form textarea')?.value?.trim()||detailLabelState.saving||detailLabelState.editorOpen||document.hidden||
       Date.now()-crossAppRefreshLast<3000)return;
    const target=document.activeElement;
    if(target&&target.matches?.('input,select,textarea,[contenteditable="true"]'))return;
    crossAppRefreshBusy=true;
    crossAppRefreshLast=Date.now();
    try{const old=JSON.stringify(db);await loadRemote();if(allowed&&!ui.modal&&JSON.stringify(db)!==old)render();}
    catch(e){/* Retain the last rendered data while offline. */}
    finally{crossAppRefreshBusy=false;}
  }
  setInterval(()=>{refreshLinkedRecords();refreshSocial();refreshCommentReactions();},8000);
  window.addEventListener('focus',()=>{refreshLinkedRecords();refreshSocial();refreshCommentReactions();});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden){showStandaloneHome();refreshLinkedRecords();refreshSocial();refreshCommentReactions();}
  });
  window.addEventListener('pageshow',event=>{
    if(event.persisted)showStandaloneHome();
  });
  boot();
})();
