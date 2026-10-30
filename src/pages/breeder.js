// Member links expose only the nickname/photo and already-visible KML records.
function adultBreederName(a){return member(a?.breeder)?.nickname||a?.breederName||'외부 / 미등록';}
function adultBreederLink(a,className='breeder-link'){
  if(member(a?.breeder))return breederLink(a.breeder,className);
  return '<span class="breeder-link external-breeder '+className+'"><span class="mini-avatar external-breeder-mark" aria-hidden="true">'+beetleArt()+'</span><span class="breeder-link-name">'+esc(adultBreederName(a))+'</span></span>';
}
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
