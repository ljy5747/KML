/* KML v0.2 — authenticated Supabase registry. Public frontend, private RLS-protected data. */
(() => {
  'use strict';
  const PROJECT_URL = 'https://qybgsztoegkzqsdipili.supabase.co';
  // Publishable key is intentionally public. All KML records are secured with Supabase RLS.
  const PUBLISHABLE_KEY = 'sb_publishable_IwNmQESmOgj-DHR0sxOIlw_4EKsa4wu';
  const OFFICIAL_LOGO = 'assets/kml-official-logo.svg';
  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  const supa = window.supabase?.createClient(PROJECT_URL, PUBLISHABLE_KEY,
    {auth:{flowType:'pkce',autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
  let db={members:[],adults:[],lines:[],larvae:[],comments:[],transfers:[],currentUser:null};
  let authReady=false, allowed=false, loginError='', authUser=null, role='member';
  const ui = {search:'', sex:'all', status:'all', year:'all', sort:'code', lineSearch:'', modal:null, menu:false};
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
  const avatar=(m,large=false)=>`<div class="${large?'avatar-large':'mini-avatar'}" style="background:${attr(m?.color||'#98866c')}" aria-hidden="true">${m?.avatar_url&&/^https:\/\//.test(m.avatar_url)?`<img src="${attr(m.avatar_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit" referrerpolicy="no-referrer">`:esc(m?.initial||m?.nickname?.[0]||'?')}</div>`;
  const sex=(s)=>`<span class="gender ${s==='M'?'m':'f'}">${s==='M'?'♂':'♀'}</span>`;
  const status=(x)=>`<span class="tag ${x==='보유'?'green':x==='종료'?'gold':''}">${esc(x)}</span>`;
  const fmtSize=(n)=>n===null||n===undefined||n===''?'—':`${esc(n)} mm`;
  const persist=async(table,id,payload,updating=false)=>{
    const query=updating ? supa.from(table).update(payload).eq('id',id) : supa.from(table).insert({id,...payload});
    const {data,error}=await query.select().single();
    if(error)throw error;
    return data;
  };
  const adultRecord=a=>({code:a.code,lineage:a.lineage,sex:a.sex,size:a.size===''?null:Number(a.size),
    emerged:a.emerged||null,breeder_id:a.breeder||null,owner_id:a.owner||null,
    father_id:a.father||null,mother_id:a.mother||null,source:a.source,status:a.status,note:a.note||''});
  const lineRecord=l=>({name:l.name,father_id:l.father,mother_id:l.mother,year:l.year?Number(l.year):null,method:l.method||'',note:l.note||''});
  async function loadRemote(){
    const names=['kml_profiles','kml_adults','kml_lines','kml_larvae','kml_comments','kml_transfers'];
    const rs=await Promise.all(names.map(n=>supa.from(n).select('*')));
    rs.forEach((r,i)=>{if(r.error)throw new Error(names[i]+': '+r.error.message)});
    const [p,a,l,v,c,t]=rs.map(r=>r.data||[]);
    db={currentUser:authUser.id,
      members:p.map(x=>({id:x.user_id,nickname:x.nickname,intro:x.intro||'',avatar_url:x.avatar_url||'',
        role:x.user_id===authUser.id&&role==='admin'?'관리자':'브리더',initial:(x.nickname||'K')[0],color:'#a68758'})),
      adults:a.map(x=>({id:x.id,code:x.code,lineage:x.lineage,sex:x.sex,size:x.size===null?'':String(x.size),emerged:x.emerged||'',
        breeder:x.breeder_id||'',owner:x.owner_id||'',father:x.father_id||'',mother:x.mother_id||'',status:x.status,
        source:x.source,note:x.note||''})),
      lines:l.map(x=>({id:x.id,name:x.name,father:x.father_id,mother:x.mother_id,year:x.year||'',method:x.method||'',note:x.note||'',createdBy:x.created_by||''})),
      larvae:v.map(x=>({id:x.id,lineId:x.line_id,number:x.number,sex:x.sex||'U',records:x.records||[],emerged:x.emerged||'',size:x.size===null?'':String(x.size)})),
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
    if(allowed)render();else gate();
  }
  function route(){const p=(location.hash||'#/').replace(/^#\/?/,'').split('/').filter(Boolean);return {page:p[0]||'dashboard',id:p[1]||''};}
  const go=(target)=>{ui.menu=false;location.hash='#/'+target;};
  const activeNav=(page,key)=>page===key;
  const navBtn=(key,label,ico,page)=>`<button class="nav-item ${activeNav(page,key)?'active':''}" data-nav="${key}">${icon(ico)}<span>${label}</span>${activeNav(page,key)?icon('chevron'):''}</button>`;
  function shell(page){
    const c=current();
    return `<div class="app-shell"><div class="sidebar-overlay ${ui.menu?'open':''}" data-action="close-menu"></div><aside class="sidebar ${ui.menu?'open':''}"><div class="brand"><div class="brand-mark brand-mark--official"><img src="${OFFICIAL_LOGO}" class="brand-official-logo" alt="국균연구소 공식 원형 마크" /></div><div class="brand-name">KML<small>국균연구소 · BREEDERS CLUB</small></div></div><div class="nav-label">MY PAGE</div>${navBtn('mypage','마이페이지','user',page)}${navBtn('profile','프로필','user',page)}${navBtn('adults','내 성충 관리','bug',page)}${navBtn('lines','내 라인 관리','layers',page)}${navBtn('data','데이터 관리','file',page)}<div class="nav-label">COMMUNITY</div>${navBtn('dashboard','전체 대시보드','home',page)}${isAdmin()?`<div class="nav-label">ADMIN ONLY</div>${navBtn('members','브리더 목록','users',page)}`:''}<div class="sidebar-bottom"><div class="sidebar-foot">${avatar(c)}<div class="sidebar-user"><strong>${esc(c.nickname)}</strong><span>KML 승인 회원 · ${esc(c.role)}</span></div></div><div class="build-tag">KML PREVIEW · v0.1</div></div></aside><div class="main-wrap"><header class="topbar"><div class="breadcrumb"><button class="icon-btn mobile-menu" data-action="toggle-menu" aria-label="메뉴 열기">${icon('menu')}</button><span>KML</span>${icon('chevron')}<b>${esc({dashboard:'대시보드',adults:'성충 관리',adult:'개체 상세',lines:'라인 관리',line:'라인 상세',members:'브리더 목록',mypage:'마이페이지',registry:'전체 성충',archive:'전체 라인',profile:'내 프로필',data:'데이터 관리'}[page]||'페이지')}</b></div><div class="top-actions"><span class="demo-ribbon">승인된 브리더 전용</span><button class="icon-btn" data-action="sign-out" title="로그아웃">${icon('logout')}</button><button class="top-profile" data-nav="profile" aria-label="내 프로필 열기">${avatar(c)}<span>${esc(c.nickname)}</span></button></div></header><main class="page" id="page-content"></main></div></div><div id="modal-root"></div>`;
  }
  const pageHead=(eyebrow,title,desc,actions='')=>`<div class="page-title"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><div class="subline">${desc}</div></div><div class="actions">${actions}</div></div>`;
  const button=(name,action,cls='btn-dark',ico='plus')=>`<button type="button" class="btn ${cls}" data-action="${action}">${icon(ico)} ${name}</button>`;
  function adultRows(items){
    if(!items.length) return `<tr><td colspan="9" class="empty-table">조건에 맞는 개체가 없습니다. 필터를 변경하거나 새 개체를 등록하세요.</td></tr>`;
    return items.map(x=>`<tr><td><button type="button" class="plain-link id-link" data-nav="adult/${attr(x.id)}">${esc(x.code)}</button></td><td>${sex(x.sex)}</td><td><strong>${fmtSize(x.size)}</strong></td><td>${esc(x.lineage||'—')}</td><td>${esc(memberName(x.breeder))}</td><td>${esc(memberName(x.owner))}</td><td>${esc(x.emerged||'—')}</td><td>${status(x.status)}</td><td>${mineAdult(x)||isAdmin()?`<button class="icon-btn" data-action="edit-adult" data-id="${attr(x.id)}" aria-label="수정">${icon('edit')}</button>`:'<small class="read-only">조회 전용</small>'}</td></tr>`).join('');
  }
  function filteredAdults(){let a=db.adults.filter(x=>route().page==='registry'||mineAdult(x)).filter(x=>[x.code,x.lineage,memberName(x.owner),memberName(x.breeder)].some(s=>String(s).toLowerCase().includes(ui.search.toLowerCase())));if(ui.sex!=='all')a=a.filter(x=>x.sex===ui.sex);if(ui.status!=='all')a=a.filter(x=>x.status===ui.status);if(ui.year!=='all')a=a.filter(x=>String(x.emerged||'').startsWith(ui.year));a.sort((a,b)=> ui.sort==='size-desc'?Number(b.size||0)-Number(a.size||0):ui.sort==='size-asc'?Number(a.size||0)-Number(b.size||0):ui.sort==='date-desc'?String(b.emerged).localeCompare(String(a.emerged)):a.code.localeCompare(b.code,'ko'));return a;}
  function adultsTable(items,compact=false){return `<div class="datatable-wrap"><table class="datatable ${compact?'':'table-large'}"><thead><tr><th>관리번호</th><th>성별</th><th>체장</th><th>혈통</th><th>브리더</th><th>현재 소유자</th><th>우화일</th><th>상태</th>${compact?'':'<th>수정</th>'}</tr></thead><tbody>${compact?items.map(x=>`<tr><td><button class="plain-link id-link" data-nav="adult/${attr(x.id)}">${esc(x.code)}</button></td><td>${sex(x.sex)}</td><td>${fmtSize(x.size)}</td><td>${esc(x.lineage)}</td><td>${esc(memberName(x.breeder))}</td><td>${esc(memberName(x.owner))}</td><td>${esc(x.emerged||'—')}</td><td>${status(x.status)}</td></tr>`).join(''):adultRows(items)}</tbody></table></div>`;}
  function dashboard(){const nM=db.adults.filter(x=>x.sex==='M').length;const nF=db.adults.filter(x=>x.sex==='F').length;return `${pageHead('WELCOME TO KML','국균연구소 대시보드','왕사슴벌레 혈통과 개체를 함께 관리하는 브리더 모임 전용 공간')}
  <section class="hero"><div class="hero-copy"><div class="hero-kicker">PEDIGREE · RECORD · COMMUNITY</div><h2>한 개체의 기록이<br/><em>다음 세대의 혈통</em>으로.</h2><p>성충을 등록하고, 부모 개체를 연결하고, 교배 라인을 생성하세요. 같은 모임의 브리더와 개체 이동 이력도 함께 관리합니다.</p><div class="hero-actions">${button('성충 등록','new-adult','btn-gold','plus')}<button class="btn btn-outline" data-nav="adults">성충 목록 ${icon('arrow')}</button></div></div><div class="hero-visual hero-visual--official"><div class="rings"></div><img src="${OFFICIAL_LOGO}" class="hero-official-logo" alt="국균연구소 공식 원형 마크" /><span class="corner-mark">KML · BREEDERS CLUB</span></div></section>
  <div class="stat-grid">${[['전체 성충',db.adults.length,'bug'],['수컷 · 암컷',`${nM} / ${nF}`,'users'],['교배 라인',db.lines.length,'layers'],['브리더',db.members.length,'shield']].map(([a,b,i])=>`<div class="stat"><small>${a}</small><strong>${b}</strong><i>${icon(i)}</i></div>`).join('')}</div>
  <div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><div class="panel-title">최근 등록 성충</div><div class="panel-sub">개체를 선택하면 상세정보와 가로형 계통도를 볼 수 있습니다.</div></div><button class="link-arrow" data-nav="adults">전체 보기 ${icon('arrow')}</button></div>${adultsTable(db.adults.slice(0,5),true)}</section><section class="panel"><div class="panel-head"><div><div class="panel-title">등록된 라인</div><div class="panel-sub">수컷과 암컷을 연결한 교배 라인</div></div><button class="link-arrow" data-nav="lines">라인 보기 ${icon('arrow')}</button></div><div class="right-panel">${db.lines.map(l=>`<div class="line-item" data-nav="line/${attr(l.id)}" role="button" tabindex="0"><div><strong>${esc(l.name)}</strong><small>${esc(adult(l.father)?.code||'부 미등록')} ♂ × ${esc(adult(l.mother)?.code||'모 미등록')} ♀</small></div><div class="count">${db.larvae.filter(v=>v.lineId===l.id).length}<small>유충</small></div></div>`).join('')}<div class="notice"><strong>첫 번째 버전 안내</strong> 현재 승인 회원의 KML 전용 데이터베이스에 연결되어 있습니다. BeetleLog 자동 연동과 엑셀 업로드는 다음 단계입니다.</div></div></section></div>`;}
  function adultsPage(){const years=[...new Set(db.adults.map(x=>String(x.emerged||'').slice(0,4)).filter(Boolean))].sort().reverse();const mine=route().page!=='registry';return `${pageHead('SPECIMEN REGISTRY',mine?'내 성충 관리':'전체 성충 목록',mine?'내가 보유한 성충을 등록·검색·정렬합니다.':'다른 브리더의 성충과 혈통을 함께 조회합니다.',mine?button('성충 등록','new-adult','btn-dark','plus'):'')}<div class="data-tools"><label class="searchbox">${icon('search')}<input id="adult-search" value="${attr(ui.search)}" placeholder="관리번호 · 혈통 · 브리더 검색" autocomplete="off" /></label><select id="sex-filter" class="filter-select" aria-label="성별">${[['all','전체 성별'],['M','수컷 ♂'],['F','암컷 ♀']].map(([v,t])=>`<option value="${v}" ${ui.sex===v?'selected':''}>${t}</option>`).join('')}</select><select id="year-filter" class="filter-select" aria-label="우화 연도"><option value="all">전체 연도</option>${years.map(y=>`<option ${ui.year===y?'selected':''}>${y}</option>`).join('')}</select><select id="status-filter" class="filter-select" aria-label="상태">${[['all','전체 상태'],['보유','보유'],['이동','이동'],['종료','종료']].map(([v,t])=>`<option value="${v}" ${ui.status===v?'selected':''}>${t}</option>`).join('')}</select><select id="sort-filter" class="filter-select" aria-label="정렬">${[['code','관리번호순'],['size-desc','체장 큰순'],['size-asc','체장 작은순'],['date-desc','최근 우화순']].map(([v,t])=>`<option value="${v}" ${ui.sort===v?'selected':''}>${t}</option>`).join('')}</select></div><section class="panel"><div class="result-meta"><strong id="adult-count">검색 결과 ${filteredAdults().length}개체</strong><span>관리번호를 누르면 상세 페이지로 이동합니다.</span></div><div id="adult-table">${adultsTable(filteredAdults())}</div></section><p class="section-caption">승인된 계정만 접근할 수 있으며 등록 내용은 KML 데이터베이스에 저장됩니다.</p>`;}
  function updateAdultsTable(){const c=document.getElementById('adult-count'),t=document.getElementById('adult-table');if(c)c.textContent=`검색 결과 ${filteredAdults().length}개체`;if(t)t.innerHTML=adultsTable(filteredAdults());}
  function pedCell(id,sexExpected){const x=adult(id);if(!x)return `<div class="p-cell missing ${sexExpected==='M'?'m':'f'}"><div class="p-sex">${sexExpected==='M'?'♂':'♀'}</div><div class="p-size">미등록</div><div class="p-detail">혈통 · —</div><div class="p-detail">관리번호 · —</div><div class="p-detail">브리더 · —</div></div>`;return `<button class="p-cell ${x.sex==='M'?'m':'f'}" data-nav="adult/${attr(x.id)}" title="${attr(x.code)} 상세 보기"><span class="p-sex">${x.sex==='M'?'♂':'♀'}</span><span class="p-size">${fmtSize(x.size)}</span><span class="p-detail"><b>혈통</b> · ${esc(x.lineage||'—')}</span><span class="p-detail"><b>관리번호</b> · ${esc(x.code)}</span><span class="p-detail"><b>브리더</b> · ${esc(memberName(x.breeder))}</span><span class="p-hint">클릭해서 상세 보기</span></button>`;}
  function pedigree(ad){let generation=[ad?.id||''];const cols=[];for(let depth=0;depth<4;depth++){const expected=depth===0?[ad?.sex||'M']:generation.map((_,i)=>i%2===0?'M':'F');cols.push(`<div class="p-body">${generation.map((id,i)=>pedCell(id,expected[i])).join('')}</div>`);generation=generation.flatMap(id=>[adult(id)?.father||'',adult(id)?.mother||'']);}return `<div class="pedigree-scroll"><div class="pedigree">${['현재 개체','부모','조부모','증조부모'].map(h=>`<div class="p-head">${h}</div>`).join('')}${cols.join('')}</div></div>`;}
  function adultDetail(id){const a=adult(id);if(!a)return `${pageHead('NOT FOUND','개체를 찾을 수 없습니다.','삭제되거나 등록되지 않은 개체입니다.')}<button class="btn btn-light" data-nav="adults">성충 목록</button>`;const user=current();const linked=db.lines.filter(l=>l.father===id||l.mother===id);const comments=db.comments.filter(x=>x.adultId===id);const transfers=db.transfers.filter(t=>t.adultId===id);return `<button class="backlink" data-nav="adults">${icon('back')} 성충 목록으로</button>${pageHead('SPECIMEN DETAIL',esc(a.code),`${a.lineage?esc(a.lineage)+' · ':''}${a.sex==='M'?'수컷':'암컷'} · ${fmtSize(a.size)}`,button('개체 수정','edit-adult','btn-light','edit').replace('data-action="edit-adult"','data-action="edit-adult" data-id="'+attr(a.id)+'"'))}
  <div class="detail-layout"><section class="panel"><div class="detail-photo">${beetleArt()}</div><div class="detail-card"><div class="detail-subhead">개체 기본 정보 ${status(a.status)}</div><div class="detail-facts">${[['관리번호',a.code],['성별',a.sex==='M'?'♂ 수컷':'♀ 암컷'],['체장',fmtSize(a.size)],['혈통',a.lineage||'—'],['우화일',a.emerged||'—'],['입수 경로',a.source||'—'],['브리더',memberName(a.breeder)],['현재 소유자',memberName(a.owner)]].map(([k,v])=>`<div class="fact"><small>${k}</small><strong>${esc(v)}</strong></div>`).join('')}</div>${a.note?`<p class="section-caption">${esc(a.note)}</p>`:''}<div class="helper-row">${button('소유자 변경','transfer','btn-light','users').replace('data-action="transfer"','data-action="transfer" data-id="'+attr(a.id)+'"')}</div></div></section><section class="panel section-pad"><div class="detail-subhead">${icon('family')} 가로형 계통도 <span class="tag gold">4세대</span></div><div class="section-caption">왼쪽이 현재 개체, 오른쪽으로 갈수록 상위 세대입니다. 흰색 셀과 고정 그리드, ♂ 파랑 / ♀ 핑크로 구분하며 조상 셀을 클릭하면 해당 개체로 이동합니다.</div>${pedigree(a)}</section></div>
  <div class="below-detail"><section class="panel section-pad"><div class="detail-subhead">${icon('layers')} 교배 라인 / 개체 이동 이력</div><div class="section-caption">해당 개체가 부 또는 모로 연결된 모든 라인입니다.</div><div style="margin-top:18px">${linked.length?linked.map(l=>`<div class="small-detail-card" data-nav="line/${attr(l.id)}" role="button"><span><b>${esc(l.name)}</b><br><small>${esc(l.year)}년 · ${a.sex==='M'?'부 ♂':'모 ♀'}</small></span>${icon('chevron')}</div>`).join(''):'<div class="empty-mini">연결된 교배 라인이 없습니다.</div>'}</div><div class="section-caption" style="margin-top:22px">소유자 이동 기록</div>${transfers.length?transfers.map(t=>`<div class="small-detail-card" style="cursor:default"><span>${esc(memberName(t.from))} → <b>${esc(memberName(t.to))}</b></span><small>${esc(t.date)}</small></div>`).join(''):'<div class="empty-mini">이동 기록이 없습니다.</div>'}</section><section class="panel section-pad"><div class="detail-subhead">${icon('message')} 개체 댓글 <span class="tag">${comments.length}</span></div><div class="section-caption">승인된 브리더이 개체에 대한 의견과 사육 메모를 남기는 기능입니다.</div><div id="comments">${comments.length?comments.map(c=>{const m=member(c.memberId);return `<div class="comment">${avatar(m)}<div style="min-width:0;flex:1"><div class="comment-meta"><strong>${esc(memberName(c.memberId))}</strong><span>${esc(c.date)}</span>${c.memberId===db.currentUser?`<button class="icon-btn" style="margin-left:auto" data-action="delete-comment" data-id="${attr(c.id)}" aria-label="댓글 삭제">${icon('close')}</button>`:''}</div><p>${esc(c.body)}</p></div></div>`}).join(''):'<div class="empty-mini">아직 댓글이 없습니다.</div>'}</div><form class="comment-compose" id="comment-form" data-adult-id="${attr(a.id)}"><textarea name="body" placeholder="개체에 대한 의견이나 사육 메모를 입력하세요." maxlength="1500" required></textarea><button type="submit" class="btn btn-dark">${icon('message')} 댓글 등록</button></form></section></div>`;}
  function linesPage(){const mine=route().page!=='archive';const ls=db.lines.filter(x=>!mine||mineLine(x)).filter(x=>[x.name,x.method,x.year].some(s=>String(s||'').toLowerCase().includes(ui.lineSearch.toLowerCase())));return `${pageHead('BREEDING LINES',mine?'내 라인 관리':'전체 라인 목록',mine?'내가 생성한 교배 라인을 관리합니다.':'브리더들의 교배 라인을 검색하고 조회합니다.',mine?button('라인 생성','new-line','btn-dark','plus'):'')}<div class="data-tools"><label class="searchbox">${icon('search')}<input id="line-search" value="${attr(ui.lineSearch)}" placeholder="라인명 · 시즌 · 메모 검색" /></label></div><div class="line-cards" id="line-cards">${ls.length?ls.map(l=>lineCard(l)).join(''):'<div class="panel section-pad">등록된 라인이 없습니다.</div>'}</div>`;}
  function lineCard(l){const f=adult(l.father),m=adult(l.mother);return `<button type="button" class="line-card" data-nav="line/${attr(l.id)}"><div class="line-card-top"><span class="tag gold">${esc(l.year||'연도 미등록')}</span><span class="tag">유충 ${db.larvae.filter(v=>v.lineId===l.id).length}마리</span></div><strong>${esc(l.name)}</strong><p>${esc(l.method||'교배 라인')} · ${esc(l.note||'')}</p><div class="pair"><span><em>♂ ${esc(f?.code||'미등록')}</em><br>${fmtSize(f?.size)}</span><span><em>♀ ${esc(m?.code||'미등록')}</em><br>${fmtSize(m?.size)}</span></div></button>`;}
  function lineDetail(id){const l=byId(db.lines,id);if(!l)return pageHead('NOT FOUND','라인을 찾을 수 없습니다.','');const f=adult(l.father),m=adult(l.mother),list=db.larvae.filter(v=>v.lineId===id);return `<button class="backlink" data-nav="lines">${icon('back')} 라인 목록으로</button>${pageHead('LINE DETAIL',esc(l.name),`${esc(l.year||'')} 시즌 · ${esc(l.method||'라인')} · 유충 ${list.length}개체`)}<section class="panel"><div class="line-detail-head"><div><span class="eyebrow">BREEDING PAIR</span><h2>${esc(l.name)}</h2><p>${esc(l.note||'')}</p></div><span class="tag gold">등록된 라인</span></div><div class="section-pad" style="padding-top:0"><div class="info-tiles"><div class="info-tile"><small>부 ♂</small><strong>${f?`<button class="plain-link" data-nav="adult/${attr(f.id)}">${esc(f.code)} · ${fmtSize(f.size)}</button>`:'미등록'}</strong></div><div class="info-tile"><small>모 ♀</small><strong>${m?`<button class="plain-link" data-nav="adult/${attr(m.id)}">${esc(m.code)} · ${fmtSize(m.size)}</button>`:'미등록'}</strong></div><div class="info-tile"><small>기록 개체</small><strong>${list.length}마리</strong></div></div></div></section><section class="panel" style="margin-top:19px"><div class="panel-head"><div><div class="panel-title">라인 유충 전체 보기</div><div class="panel-sub">관리번호는 라인 내 번호로 관리합니다. 병별 기록은 가로로 표시됩니다.</div></div><div class="actions"><button class="btn btn-light btn-sm" data-action="download-line" data-id="${attr(l.id)}">${icon('download')} CSV 내보내기</button><button class="btn btn-light btn-sm" data-action="excel-not-ready">${icon('upload')} Excel 업로드 (예정)</button></div></div><div class="datatable-wrap"><table class="datatable"><thead><tr><th>번호</th><th>성별</th><th>1병</th><th>2병</th><th>3병</th><th>우화일</th><th>체장</th></tr></thead><tbody>${list.length?list.map(v=>`<tr><td><strong>${esc(v.number)}</strong></td><td>${sex(v.sex)}</td>${[0,1,2].map(i=>`<td>${v.records[i]?`${esc(v.records[i][0]||'—')}<br>${esc(v.records[i][1]||'—')} · ${v.records[i][3]?esc(v.records[i][3])+' g':'—'}`:'—'}</td>`).join('')}<td>${esc(v.emerged||'—')}</td><td>${fmtSize(v.size)}</td></tr>`).join(''):'<tr><td colspan="7" class="empty-table">유충 기록이 아직 없습니다. 향후 한 라인당 한 시트인 엑셀 업로드로 등록할 수 있습니다.</td></tr>'}</tbody></table></div></section>`;}
  function membersPage(){return `${pageHead('BREEDERS CLUB','브리더','승인된 브리더들의 프로필 사진과 닉네임을 확인할 수 있습니다.')}<div class="members-grid">${db.members.map(m=>`<div class="member-card">${avatar(m,true)}<strong>${esc(m.nickname)}</strong><p>${esc(m.intro||'소개가 없습니다.')}</p><div class="helper-row"><span class="tag ${m.role==='관리자'?'gold':'green'}">${esc(m.role)}</span><small>${db.adults.filter(x=>x.owner===m.id).length}개체 보유</small></div></div>`).join('')}</div><div class="notice"><strong>Google 인증 회원 목록</strong> 실제 서비스에서는 관리자가 허가한 Google 계정만 로그인할 수 있도록 데이터베이스 권한까지 제한합니다. Google 인증 후 관리자에게 승인받은 계정만 KML 데이터에 접근할 수 있습니다.</div>`;}
  function profilePage(){const m=current();return `${pageHead('MY ACCOUNT','내 프로필','KML에서 표시할 닉네임과 소개를 설정합니다.')}<section class="profile-top">${avatar(m,true)}<div><h2>${esc(m.nickname)}</h2><p>${esc(m.role)} · Google 인증 계정</p></div></section><section class="panel profile-edit"><form id="profile-form"><div class="form-grid"><div class="field"><label for="profile-name">닉네임 *</label><input id="profile-name" name="nickname" maxlength="30" required value="${attr(m.nickname)}"/><small class="field-hint">변경해도 개체의 브리더·소유자 연결은 유지됩니다.</small></div><div class="field"><label for="profile-initial">프로필 이니셜</label><input id="profile-initial" name="initial" maxlength="2" value="${attr(m.initial||'')}"/><small class="field-hint">Google 계정 프로필 사진 자동 적용</small></div><div class="field full"><label for="profile-intro">소개</label><textarea id="profile-intro" name="intro" maxlength="400">${esc(m.intro||'')}</textarea></div></div><div class="helper-row"><span class="section-caption">회원 프로필은 KML 서버에 저장됩니다.</span><button class="btn btn-dark" type="submit">저장</button></div></form></section>`;}
  function dataPage(){return `${pageHead('DATA CENTER','데이터 관리','우선 성충과 라인 등록을 완성하고, 추후 엑셀 업로드 및 BeetleLog 연결을 추가합니다.')}<div class="dashboard-grid"><section class="panel section-pad"><div class="detail-subhead">${icon('file')} 라인 엑셀 업로드</div><p class="section-caption">계획: KML에서 성충과 라인을 먼저 생성 → 라인명 기재된 단일 시트 업로드 → 같은 라인 검증 → 유충별 신규·변경 건 미리보기 → 저장.</p><div class="notice"><strong>현재 단계: 업로드 기능 미구현</strong> 실제 엑셀 양식이 확정되면 필드 매핑과 검증 로직을 연결합니다. 버튼이 없어도 파일 업로드가 완료된 것으로 오해하지 않도록 구분했습니다.</div></section><section class="panel section-pad"><div class="detail-subhead">${icon('layers')} BeetleLog 연동</div><p class="section-caption">계획: 기존 BeetleLog 성충·라인 데이터를 중복 없이 최초 가져오기. 그다음 KML과 BeetleLog가 공통 DB에서 같은 개체와 기록을 읽고 수정하도록 연결.</p><div class="notice"><strong>현재 단계: 연동 미구현</strong> 기존 BeetleLog 데이터와 Supabase 테이블에는 변경을 가하지 않았습니다.</div></section></div>`;}
  const opt=(items,current,empty='선택 안 함')=>`<option value="">${empty}</option>${items.map(x=>`<option value="${attr(x.id)}" ${x.id===current?'selected':''}>${esc(x.code||x.nickname)}${x.size?' · '+x.size+'mm':''}</option>`).join('')}`;
  function modalFrame(title,desc,body,footer){return `<div class="modal-backdrop" data-action="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-label="${attr(title)}"><div class="modal-head"><div><h2>${esc(title)}</h2><p>${esc(desc)}</p></div><button class="icon-btn" data-action="close-modal" aria-label="닫기">${icon('close')}</button></div>${body}${footer||''}</div></div>`;}
  function adultModal(id){const a=adult(id),t=a||{code:'',lineage:'',sex:'M',size:'',emerged:'',breeder:db.currentUser,owner:db.currentUser,father:'',mother:'',source:'자체 우화',status:'보유',note:''};const body=`<form id="adult-form"><input type="hidden" name="id" value="${attr(a?.id||'')}"/><div class="modal-content"><div class="form-grid"><div class="field"><label>관리번호 *</label><input name="code" required maxlength="60" value="${attr(t.code)}" placeholder="예: YG24-001"/></div><div class="field"><label>혈통 *</label><input name="lineage" required maxlength="80" value="${attr(t.lineage)}" placeholder="예: YG24"/></div><div class="field"><label>성별 *</label><select name="sex"><option value="M" ${t.sex==='M'?'selected':''}>♂ 수컷</option><option value="F" ${t.sex==='F'?'selected':''}>♀ 암컷</option></select></div><div class="field"><label>체장 (mm)</label><input name="size" type="number" min="0" max="200" step="0.1" value="${attr(t.size)}" placeholder="84.2"/></div><div class="field"><label>우화일</label><input name="emerged" type="date" value="${attr(t.emerged)}"/></div><div class="field"><label>보유 상태</label><select name="status">${['보유','이동','종료'].map(v=>`<option ${t.status===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>브리더</label><select name="breeder">${opt(db.members,t.breeder,'외부 / 미등록')}</select></div><div class="field"><label>현재 소유자</label><select name="owner" required ${a?'disabled':''}>${opt(db.members,t.owner,'선택')}</select>${a?`<input type="hidden" name="owner" value="${attr(t.owner)}"/>`:''}</div><div class="field"><label>부 ♂ (계통도 자동 연결)</label><select name="father">${opt(db.adults.filter(x=>x.sex==='M'&&x.id!==id),t.father,'미등록 / 모름')}</select></div><div class="field"><label>모 ♀ (계통도 자동 연결)</label><select name="mother">${opt(db.adults.filter(x=>x.sex==='F'&&x.id!==id),t.mother,'미등록 / 모름')}</select></div><div class="field"><label>입수 경로</label><select name="source">${['자체 우화','외부 입수','양도 입수','기타'].map(v=>`<option ${t.source===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field full"><label>개체 메모</label><textarea name="note" maxlength="1000">${esc(t.note||'')}</textarea></div></div><div class="note">관리번호는 개체를 연결하는 고유 식별값입니다. 이미 다른 개체에 사용된 번호는 중복 등록할 수 없습니다. 부·모는 등록된 개체 중에서 선택합니다.</div></div><div class="modal-actions"><button type="button" class="btn btn-light" data-action="close-modal">취소</button><button type="submit" class="btn btn-dark">${a?'변경사항 저장':'성충 등록'}</button></div></form>`;return modalFrame(a?'성충 정보 수정':'새 성충 등록','왕사슴벌레 개체 정보를 입력합니다.',body);}
  function lineModal(){const body=`<form id="line-form"><div class="modal-content"><div class="form-grid"><div class="field"><label>라인명 *</label><input name="name" required maxlength="80" placeholder="예: YG26-A"/></div><div class="field"><label>시즌 (연도)</label><input name="year" type="number" min="1990" max="2100" value="2026"/></div><div class="field"><label>부 ♂ *</label><select name="father" required>${opt(db.adults.filter(x=>x.sex==='M'),'','수컷 개체 선택')}</select></div><div class="field"><label>모 ♀ *</label><select name="mother" required>${opt(db.adults.filter(x=>x.sex==='F'),'','암컷 개체 선택')}</select></div><div class="field full"><label>교배 구분</label><input name="method" placeholder="예: 인라인, 아웃라인"/></div><div class="field full"><label>메모</label><textarea name="note" maxlength="700" placeholder="산란 세팅, 교배 이력 등"></textarea></div></div><div class="note">부모 성충은 KML 성충 목록에 먼저 등록해야 선택할 수 있습니다. 엑셀 업로드는 이곳에서 라인을 생성한 이후에 연결하도록 개발할 예정입니다.</div></div><div class="modal-actions"><button type="button" class="btn btn-light" data-action="close-modal">취소</button><button class="btn btn-dark" type="submit">라인 생성</button></div></form>`;return modalFrame('새 라인 생성','등록된 부·모 성충을 선택해 라인을 생성합니다.',body);}
  function transferModal(id){const a=adult(id);if(!a)return '';const body=`<form id="transfer-form"><input type="hidden" name="id" value="${attr(id)}"/><div class="modal-content"><div class="form-grid"><div class="field full"><label>선택 개체</label><input disabled value="${attr(a.code)}"/></div><div class="field"><label>현재 소유자</label><input disabled value="${attr(memberName(a.owner))}"/></div><div class="field"><label>새 소유자 *</label><select name="to" required>${opt(db.members.filter(x=>x.id!==a.owner),'','회원 선택')}</select></div><div class="field"><label>이동일 *</label><input name="date" type="date" required value="${dateToday()}"/></div><div class="field full"><label>이동 메모</label><textarea name="note" placeholder="분양, 사육 이관 등"></textarea></div></div><div class="note">브리더와 개체 관리번호는 그대로 유지하고, 소유자 및 이동 기록만 업데이트합니다.</div></div><div class="modal-actions"><button type="button" class="btn btn-light" data-action="close-modal">취소</button><button class="btn btn-dark" type="submit">소유자 변경 저장</button></div></form>`;return modalFrame('소유자 변경','브리더 간 개체 양도·이동 이력을 기록합니다.',body);}
  function renderModal(){const root=document.getElementById('modal-root');if(!root)return;root.innerHTML=ui.modal?.kind==='adult'?adultModal(ui.modal.id):ui.modal?.kind==='line'?lineModal():ui.modal?.kind==='transfer'?transferModal(ui.modal.id):'';}
  function render(){if(!allowed){gate();return;}const r=route();app.innerHTML=shell(r.page);document.getElementById('page-content').innerHTML= r.page==='dashboard'?dashboard():r.page==='mypage'?myPage():r.page==='adults'||r.page==='registry'?adultsPage():r.page==='adult'?adultDetail(r.id):r.page==='lines'||r.page==='archive'?linesPage():r.page==='line'?lineDetail(r.id):r.page==='members'&&isAdmin()?membersPage():r.page==='profile'?profilePage():r.page==='data'?dataPage():dashboard();renderModal();document.title=`KML | ${({dashboard:'대시보드',adults:'성충 관리',adult:'개체 상세',lines:'라인 관리',line:'라인 상세',members:'브리더 목록',mypage:'마이페이지',registry:'전체 성충',archive:'전체 라인',profile:'내 프로필',data:'데이터 관리'})[r.page]||'국균연구소'}`;}
  function openModal(kind,id=''){ui.modal={kind,id};renderModal();}
  function closeModal(){ui.modal=null;renderModal();}
  function downloadCSV(id){const l=byId(db.lines,id);if(!l)return;const rows=[['라인명',l.name],[],['관리번호','성별','1병 날짜','1병 균사','1병 체중(g)','2병 날짜','2병 균사','2병 체중(g)','3병 날짜','3병 균사','3병 체중(g)','우화일','체장(mm)'],...db.larvae.filter(v=>v.lineId===id).map(v=>[v.number,v.sex==='M'?'♂':'♀',...(v.records[0]?[v.records[0][0],v.records[0][1],v.records[0][3]]:['','','']),...(v.records[1]?[v.records[1][0],v.records[1][1],v.records[1][3]]:['','','']),...(v.records[2]?[v.records[2][0],v.records[2][1],v.records[2][3]]:['','','']),v.emerged,v.size])];const content='\uFEFF'+rows.map(a=>a.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const obj=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=obj;a.download=`KML_${l.name.replace(/[\\/:*?"<>|]/g,'_')}_유충기록.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(obj),500);}
  document.addEventListener('click',async event=>{
    const nav=event.target.closest('[data-nav]');if(nav){go(nav.dataset.nav);return;}
    const a=event.target.closest('[data-action]');if(!a)return;
    const act=a.dataset.action;
    if(act==='toggle-menu'){ui.menu=!ui.menu;render();}
    if(act==='close-menu'){ui.menu=false;render();}
    if(act==='new-adult')openModal('adult');
    if(act==='edit-adult')openModal('adult',a.dataset.id||route().id);
    if(act==='new-line')openModal('line');
    if(act==='transfer')openModal('transfer',a.dataset.id);
    if(act==='close-modal')closeModal();
    if(act==='modal-backdrop'&&event.target===a)closeModal();
    if(act==='delete-comment'){if(confirm('이 댓글을 삭제할까요?')){const {error:de}=await supa.from('kml_comments').delete().eq('id',a.dataset.id);if(de)return notify('댓글 삭제 실패: '+de.message);db.comments=db.comments.filter(c=>c.id!==a.dataset.id);render();notify('댓글을 삭제했습니다.');}}
    if(act==='excel-not-ready')notify('엑셀 업로드는 다음 개발 단계에서 연결합니다. 현재는 미구현 기능입니다.');
    if(act==='download-line')downloadCSV(a.dataset.id);
    if(act==='google-login'){if(!supa)return;const redirectTo=location.origin+location.pathname;const {error:e}=await supa.auth.signInWithOAuth({provider:'google',options:{redirectTo}});if(e)notify('Google 로그인 오류: '+e.message);}
    if(act==='sign-out'){await supa?.auth.signOut();allowed=false;authUser=null;db={members:[],adults:[],lines:[],larvae:[],comments:[],transfers:[],currentUser:null};gate();}
  });
  document.addEventListener('input',e=>{if(e.target.id==='adult-search'){ui.search=e.target.value;updateAdultsTable();}if(e.target.id==='line-search'){ui.lineSearch=e.target.value;document.getElementById('line-cards').innerHTML=db.lines.filter(x=>route().page==='archive'||mineLine(x)).filter(x=>[x.name,x.method,x.year].some(s=>String(s||'').toLowerCase().includes(ui.lineSearch.toLowerCase()))).map(lineCard).join('')||'<div class="panel section-pad">검색 결과가 없습니다.</div>';}});
  document.addEventListener('change',e=>{const map={'sex-filter':'sex','year-filter':'year','status-filter':'status','sort-filter':'sort'};if(map[e.target.id]){ui[map[e.target.id]]=e.target.value;updateAdultsTable();}});
  document.addEventListener('submit',async e=>{
    const form=e.target;const formId=form.getAttribute('id');if(!['adult-form','line-form','profile-form','transfer-form','comment-form'].includes(formId))return;e.preventDefault();const f=new FormData(form);const data=Object.fromEntries(f.entries());
    if(formId==='adult-form'){
      const code=String(data.code||'').trim(),lineage=String(data.lineage||'').trim();if(!code||!lineage)return notify('관리번호와 혈통을 입력하세요.');
      if(db.adults.some(x=>x.code.toLowerCase()===code.toLowerCase()&&x.id!==data.id))return notify('이미 사용 중인 관리번호입니다.');
      if(data.father&&data.father===data.mother)return notify('부모는 다른 개체여야 합니다.');
      const old=data.id?adult(data.id):null; if(old&&data.owner!==old.owner)return notify('소유자 변경은 개체 상세의 소유자 변경 기능을 이용하세요.');
      const next={id:data.id||uid(),code,lineage,sex:data.sex,size:data.size,emerged:data.emerged,breeder:data.breeder,owner:data.owner,father:data.father,mother:data.mother,source:data.source,status:data.status,note:data.note};
      // Prevent circular parent references (including indirect loops).
      const reaches=(start,target,seen=new Set())=>{if(!start||seen.has(start))return false;if(start===target)return true;seen.add(start);const a=adult(start);return a?reaches(a.father,target,seen)||reaches(a.mother,target,seen):false;};
      if(reaches(next.father,next.id)||reaches(next.mother,next.id))return notify('부모·자손 관계가 순환합니다. 다른 개체를 선택하세요.');
      try{await persist('kml_adults',next.id,adultRecord(next),Boolean(data.id));}catch(err){return notify('성충 저장 실패: '+(err.message||err));}
      if(!data.id)db.adults.push(next);else{const ix=db.adults.findIndex(x=>x.id===data.id);if(ix<0)return notify('기존 개체를 찾을 수 없습니다.');db.adults[ix]=next;}
      save();closeModal();go('adult/'+next.id);render();notify(data.id?'성충 정보를 수정했습니다.':'성충을 등록했습니다.');
    }
    if(formId==='line-form'){
      const name=String(data.name||'').trim();if(!name||!data.father||!data.mother)return notify('라인명과 부모 개체를 선택하세요.');if(db.lines.some(x=>x.name.toLowerCase()===name.toLowerCase()))return notify('이미 같은 라인명이 있습니다.');if(data.father===data.mother)return notify('부모 개체를 서로 다르게 선택하세요.');const l={id:uid(),name,father:data.father,mother:data.mother,year:data.year,method:data.method,note:data.note,createdBy:db.currentUser};try{await persist('kml_lines',l.id,lineRecord(l));}catch(err){return notify('라인 생성 실패: '+(err.message||err));}db.lines.push(l);save();closeModal();go('line/'+l.id);render();notify('라인을 생성했습니다.');
    }
    if(formId==='transfer-form'){
      const a=adult(data.id);if(!a||!data.to||data.to===a.owner)return notify('변경할 소유자를 선택하세요.');const {error:te}=await supa.rpc('kml_transfer_adult',{p_adult_id:a.id,p_to_user:data.to,p_date:data.date,p_note:data.note||''});if(te)return notify('소유자 변경 실패: '+te.message); db.transfers.push({id:uid(),adultId:a.id,from:a.owner,to:data.to,date:data.date,note:data.note});a.owner=data.to;save();closeModal();render();notify('소유자 변경 이력을 저장했습니다.');
    }
    if(formId==='profile-form'){
      const me=current();const nickname=String(data.nickname||'').trim();if(!nickname)return notify('닉네임을 입력하세요.');const intro=String(data.intro||'');const {error:pe}=await supa.from('kml_profiles').update({nickname,intro}).eq('user_id',db.currentUser);if(pe)return notify('프로필 저장 실패: '+pe.message);me.nickname=nickname;me.initial=nickname[0];me.intro=intro;save();render();notify('프로필을 저장했습니다.');
    }
    if(formId==='comment-form'){
      const body=String(data.body||'').trim();if(!body)return notify('댓글 내용을 입력하세요.');const comment={id:uid(),adultId:form.dataset.adultId,memberId:db.currentUser,body,date:dateToday()};const {error:ce}=await supa.from('kml_comments').insert({id:comment.id,adult_id:comment.adultId,member_id:comment.memberId,body:comment.body});if(ce)return notify('댓글 저장 실패: '+ce.message);db.comments.push(comment);save();render();notify('댓글을 저장했습니다.');
    }
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ui.modal)closeModal();const box=e.target.closest('[data-nav][role="button"]');if(box&&(e.key==='Enter'||e.key===' ')){e.preventDefault();go(box.dataset.nav);}});
  window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);});
  boot();
})();