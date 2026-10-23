function downloadCSV(id){const l=byId(db.lines,id);if(!l)return;
    const list=db.larvae.filter(v=>v.lineId===id),bottles=Array.from({length:Math.max(3,...list.map(v=>v.records.length))},(_,i)=>i);
    const rows=[['라인명',l.name],[],['관리번호','성별','상태',...bottles.flatMap(i=>[`${i+1}병 날짜`,`${i+1}병 균사`,`${i+1}병 용량(cc)`,`${i+1}병 체중(g)`]),'우화일','체장(mm)'],
      ...list.map(v=>[v.number,v.sex==='M'?'♂':v.sex==='F'?'♀':'미구분',v.sourceData?.status||'',...bottles.flatMap(i=>v.records[i]?v.records[i].slice(0,4):['','','','']),v.emerged,v.size])];
    const content='\uFEFF'+rows.map(a=>a.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
    const obj=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=obj;a.download=`KML_${l.name.replace(/[\\/:*?"<>|]/g,'_')}_유충기록.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(obj),500);
  }
  