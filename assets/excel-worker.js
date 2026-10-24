/* SheetJS CE 0.20.3, vendored under Apache-2.0. Parsing stays off the UI thread. */
importScripts('./vendor/xlsx-0.20.3.full.min.js');
self.onmessage=function(event){
 try{
  const {buffer,kind}=event.data,book=XLSX.read(buffer,{type:'array',cellNF:true,cellText:true,raw:true,sheetRows:1005});
  const wanted=kind==='adults'?'성충':'유충';
  let name=book.SheetNames.find(n=>n.trim()===wanted);
  if(!name){const names=book.SheetNames.filter(n=>!/(예시|안내|도움말|설명)/.test(n));if(names.length!==1)throw Error(wanted+' 시트를 사용하거나 업로드할 시트 하나만 남겨 주세요.');name=names[0];}
  const sheet=book.Sheets[name],ref=sheet['!fullref']||sheet['!ref'];if(!ref)throw Error('빈 시트입니다.');
  const range=XLSX.utils.decode_range(ref);if(range.e.r>1003||range.e.c>400)throw Error('시트 범위가 너무 큽니다. 입력한 데이터만 새 파일로 복사해 주세요.');
  const date1904=!!book.Workbook?.WBProps?.date1904,rows=[];
  for(let r=0;r<=range.e.r;r++){
   const row=[];for(let c=0;c<=range.e.c;c++){
    const cell=sheet[XLSX.utils.encode_cell({r,c})];if(!cell){row.push('');continue;}
    if(cell.f)throw Error((r+1)+'행에 수식이 있습니다. 계산 결과를 값으로 붙여넣어 주세요.');
    if(cell.t==='e')throw Error((r+1)+'행에 엑셀 오류 값이 있습니다.');
    let value=cell.v??'';
    if(typeof value==='number'&&cell.z&&XLSX.SSF.is_date(cell.z)){
     const d=XLSX.SSF.parse_date_code(value,{date1904});value=d?String(d.y).padStart(4,'0')+'-'+String(d.m).padStart(2,'0')+'-'+String(d.d).padStart(2,'0'):'';
    }else if(typeof value==='number'&&/^0\d+$/.test(cell.w||''))value=cell.w;
    row.push(value);
   }rows.push(row);
  }
  self.postMessage({rows,date1904,sheet:name});
 }catch(error){self.postMessage({error:error.message||String(error)});}
};
