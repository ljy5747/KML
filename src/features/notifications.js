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
