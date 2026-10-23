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
  