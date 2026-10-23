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
  const avatar=(m,large=false)=>`<div class="${large?'avatar-large':'mini-avatar'}" style="background:${attr(m?.color||'#98866c')}" aria-hidden="true">${m?.avatar_url&&/^(https:\/\/|data:image\/jpeg;base64,)/.test(m.avatar_url)?`<img src="${attr(m.avatar_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit" referrerpolicy="no-referrer">`:esc(m?.initial||m?.nickname?.[0]||'?')}</div>`;
  const sex=(s)=>`<span class="gender ${s==='M'?'m':s==='F'?'f':''}">${s==='M'?'♂':s==='F'?'♀':'—'}</span>`;
  const isDead=x=>String(x||'').trim()==='사망';
  const deathName=(name,state)=>isDead(state)?`<span class="dead-text">${esc(name)}</span> <span class="death-mark">사망</span>`:esc(name);
  const status=(x,larval=false)=>`<span class="tag ${x==='보유'?'green':x==='분양'?'gold':''}">${isDead(x)&&larval?'<span class="death-mark" role="img" aria-label="사망">★</span>':esc(x)}</span>`;
  const fmtSize=(n)=>n===null||n===undefined||n===''?'—':`${esc(n)} mm`;
  