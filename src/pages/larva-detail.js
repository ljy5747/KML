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
  return '<button type="button" class="backlink" data-nav="line/'+attr(line.id)+'">'+icon('back')+' '+esc(line.name)+' 라인으로</button>'+pageHead('LARVA DETAIL',esc(v.number),esc(line.name)+' · '+esc(line.generation||'')+' · '+(v.sex==='M'?'수컷':v.sex==='F'?'암컷':'성별 미구분'))+'<div class="detail-layout"><section class="panel"><div class="detail-card"><div class="detail-subhead">유충 기본 정보 '+status(s,true)+'</div><div class="detail-facts '+(isDead(s)?'dead-facts':'')+'">'+facts.map(([k,value])=>'<div class="fact"><small>'+k+'</small><strong>'+esc(value)+'</strong></div>').join('')+'<div class="fact"><small>브리더 / 라인 등록자</small><strong>'+pedigreeBreeder(line.createdBy)+'</strong></div></div></section>'+specimenTools('larva',v.id,larvaPedigree(v,line))+'</div><section class="panel larva-records"><div class="panel-head"><div class="panel-title">사육 기록</div><span class="tag">'+bottles.length+'병</span></div><div class="datatable-wrap"><table class="datatable"><thead><tr><th>병</th><th>날짜</th><th>먹이원</th><th>용량</th><th>무게</th></tr></thead><tbody>'+(rows||'<tr><td colspan="5" class="empty-table">사육 기록이 아직 없습니다.</td></tr>')+'</tbody></table></div></section>';
}
