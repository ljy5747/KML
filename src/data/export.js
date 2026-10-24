const lineExcelDownloads=new Set();
function lineExcelData(line,list){
 const count=Math.max(5,...list.map(v=>larvaBottleRecords(v).length));
 if(count>60)throw Error('Excel 양식은 최대 60병까지 지원합니다.');
 if(list.length>500)throw Error('한 번에 내보낼 수 있는 유충은 최대 500개체입니다.');
 const headers=['라인명*','관리번호*','성별','상태',...Array.from({length:count},(_,i)=>[`${i+1}병 날짜`,`${i+1}병 먹이원`,`${i+1}병 용량(cc)`,`${i+1}병 무게(g)`]).flat(),'용화일','용화 무게(g)','우화일','체장(mm)','메모'];
 const rows=list.map(v=>{const records=larvaBottleRecords(v),source=v.sourceData||{},p=source.pupation||{};return[line.name,String(v.number??''),v.sex==='M'?'수컷':v.sex==='F'?'암컷':'미구분',source.status||'유충',...Array.from({length:count},(_,i)=>{const b=records[i]||{};return[b.date??'',b.feedBrand||b.feedType||'',b.bottleSize??'',b.weight??''];}).flat(),p.pupaDate??'',p.pupaWeight??'',v.emerged||source.eclosion?.date||'',v.size??'',source.memo??''];});
 return {headers,rows};
}
async function downloadLineExcel(id,button){
 const line=byId(db.lines,id);if(!line||!(mineLine(line)||isAdmin())||lineExcelDownloads.has(id))return;
 const user=db.currentUser;let worker,timer;const label=button?.innerHTML;
 lineExcelDownloads.add(id);if(button){button.disabled=true;button.textContent='Excel 준비 중…';}
 try{
  const data=lineExcelData(line,db.larvae.filter(v=>v.lineId===id));
  const controller=new AbortController(),fetchTimer=setTimeout(()=>controller.abort(),20000);let response;
  try{response=await fetch('assets/templates/KML_larvae_template.xlsx?v=scroll-fix-20261024',{signal:controller.signal});if(!response.ok)throw Error('엑셀 양식을 내려받지 못했습니다.');}finally{clearTimeout(fetchTimer);}
  const template=await response.arrayBuffer();
  const buffer=await new Promise((resolve,reject)=>{
   worker=new Worker('assets/excel-export-worker.js?v=line-export-20261024');
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
