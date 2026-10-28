/* Native template filling: only sheet1.xml changes; all other ZIP parts survive. */
self.buildLineExcel=function(template,headers,rows){
 if(rows.length>500||headers.length>250)throw Error('Excel 내보내기 범위를 초과했습니다.');
 const CFB=XLSX.CFB,zip=CFB.read(new Uint8Array(template),{type:'buffer'}),path='/xl/worksheets/sheet1.xml',entry=CFB.find(zip,path);
 if(!entry)throw Error('엑셀 양식의 유충 시트를 찾을 수 없습니다.');
 const decoder=new TextDecoder(),encoder=new TextEncoder(),xml=decoder.decode(entry.content),prefix=xml.match(/<([\w]+:)worksheet\b/)?.[1]||'';
 const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
 const escape=value=>String(value??'').replace(/_x[\da-f]{4}_/gi,m=>'_x005F_'+m.slice(1)).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const rawRow=n=>xml.match(new RegExp('<'+prefix+'row\\b[^>]*\\br="'+n+'"[^>]*>[\\s\\S]*?</'+prefix+'row>'))?.[0];
 const cellMap=n=>new Map([...rawRow(n).matchAll(new RegExp('<'+prefix+'c\\b([^>]*?)(?:/>|>([\\s\\S]*?)</'+prefix+'c>)','g'))].map(m=>[m[1].match(/\br="([A-Z]+)\d+"/)[1],{xml:m[0],style:m[1].match(/\bs="(\d+)"/)?.[1]||'0'}]));
 const first=cellMap(1),example=cellMap(2),input=cellMap(3),bottom=cellMap(502),last=headers.length-5,originalLast=25;
 if(headers.length<30||(headers.length-10)%4!==0)throw Error('유충 엑셀 열 구성이 올바르지 않습니다.');
 const original=i=>i<5?i:i<last?5+(i-5)%4:originalLast+(i-last);
 function cell(value,index,row,style){
  const header=headers[index],r=col(index)+row;let number=null;
  if(/날짜|우화일|용화일/.test(header)&&/^\d{4}-\d{2}-\d{2}$/.test(String(value))){const d=Date.parse(value+'T00:00:00Z');if(Number.isFinite(d)&&new Date(d).toISOString().slice(0,10)===value)number=(d-Date.UTC(1899,11,30))/86400000;}
  else if(/무게|체장|용량|두폭/.test(header)&&value!==''&&value!==null&&value!==undefined&&Number.isFinite(Number(value)))number=Number(value);
  return '<'+prefix+'c r="'+r+'" s="'+style+'"'+(number===null?' t="inlineStr"><'+prefix+'is><'+prefix+'t xml:space="preserve">'+escape(value)+'</'+prefix+'t></'+prefix+'is>':('><'+prefix+'v>'+number+'</'+prefix+'v>'))+'</'+prefix+'c>';
 }
 const shift=(text,index,row)=>text.replace(/\br="[A-Z]+\d+"/,'r="'+col(index)+row+'"');
 const headerRow='<'+prefix+'row r="1" ht="36" customHeight="1">'+headers.map((v,i)=>cell(v,i,1,first.get(col(original(i))).style)).join('')+'</'+prefix+'row>';
 const exampleRow='<'+prefix+'row r="2" ht="42" customHeight="1">'+headers.map((_,i)=>{
  if(i<last&&i>=25)return cell('',i,2,example.get('F').style);
  // The first five bottles retain the original examples, including bottle 2.
  const source=i<last?i:originalLast+i-last;
  return shift(example.get(col(source)).xml,i,2);
 }).join('')+'</'+prefix+'row>';
 const body=Array.from({length:500},(_,i)=>'<'+prefix+'row r="'+(i+3)+'" ht="24" customHeight="1">'+headers.map((_,j)=>cell(rows[i]?.[j]??'',j,i+3,(i===499?bottom:input).get(col(original(j))).style)).join('')+'</'+prefix+'row>').join('');
 const sourceColumns=[...xml.matchAll(new RegExp('<'+prefix+'col\\b([^>]*?)/>','g'))].map(m=>({min:Number(m[1].match(/\bmin="(\d+)"/)[1]),max:Number(m[1].match(/\bmax="(\d+)"/)[1]),width:m[1].match(/\bwidth="([\d.]+)"/)[1]}));
 const width=i=>sourceColumns.find(c=>original(i)+1>=c.min&&original(i)+1<=c.max).width;
 const columns=headers.map((_,i)=>'<'+prefix+'col min="'+(i+1)+'" max="'+(i+1)+'" width="'+width(i)+'" customWidth="1" style="'+input.get(col(original(i))).style+'"/>').join('');
 let output=xml.replace(new RegExp('<'+prefix+'sheetData\\b[^>]*>[\\s\\S]*?</'+prefix+'sheetData>'),'<'+prefix+'sheetData>'+headerRow+exampleRow+body+'</'+prefix+'sheetData>');
 output=output.replace(new RegExp('<'+prefix+'cols>[\\s\\S]*?</'+prefix+'cols>'),'<'+prefix+'cols>'+columns+'</'+prefix+'cols>');
 output=output.replace(new RegExp('<'+prefix+'dimension\\b[^>]*/>'),'<'+prefix+'dimension ref="A1:'+col(headers.length-1)+'502"/>');
 CFB.utils.cfb_add(zip,path,encoder.encode(output));
 return new Uint8Array(CFB.write(zip,{fileType:'zip',compression:true})).buffer;
};
