import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const out=process.argv[2]||'assets/templates';
const previewDir=process.env.KML_TEMPLATE_PREVIEW_DIR||'/tmp/kml-excel-template-previews';
await fs.mkdir(previewDir,{recursive:true});
const letters=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
const adult=['관리번호*','혈통*','누대수','성별*','체장(mm)','우화일','브리더 닉네임','부 관리번호','모 관리번호','입수 경로','보유 상태','메모'];
const larvae=['라인명*','관리번호*','성별','상태',...Array.from({length:5},(_,i)=>[`${i+1}병 날짜`,`${i+1}병 먹이원`,`${i+1}병 용량(cc)`,`${i+1}병 무게(g)`]).flat(),'용화일','용화 무게(g)','우화일','체장(mm)','메모'];
await fs.mkdir(out,{recursive:true});
for(const [kind,headers]of [['adults',adult],['larvae',larvae]]){
 const wb=Workbook.create(),name=kind==='adults'?'성충':'유충',main=wb.worksheets.add(name),sample=wb.worksheets.add('예시'),guide=wb.worksheets.add('안내');
 for(const sheet of [main,sample]){
  sheet.showGridLines=false;const end=letters(headers.length-1);sheet.getRange(`A1:${end}502`).format.font={name:'Noto Serif KR',size:11,color:'#302D27'};
  sheet.getRange(`A1:${end}1`).values=[headers];sheet.getRange(`A1:${end}1`).format={fill:'#4A4031',font:{name:'Noto Serif KR',size:11,bold:true,color:'#FFFFFF'},rowHeight:36,wrapText:true,horizontalAlignment:'center',verticalAlignment:'center'};
  sheet.getRange(`A2:${end}502`).format.rowHeight=24;sheet.getRange(`A2:${end}502`).format.verticalAlignment='center';sheet.getRange(`A2:${end}502`).format.fill='#FFFDF6';sheet.getRange(`A1:${end}502`).format.columnWidth=18;
  sheet.freezePanes.unfreeze();
  headers.forEach((header,i)=>{
   const column=letters(i);if(/번호|혈통|누대수|닉네임|메모|라인명|먹이원/.test(header))sheet.getRange(`${column}2:${column}502`).setNumberFormat('@');
   if(/날짜|우화일|용화일/.test(header))sheet.getRange(`${column}2:${column}502`).setNumberFormat('yyyy-mm-dd');
   if(/무게|체장/.test(header))sheet.getRange(`${column}2:${column}502`).setNumberFormat('0.0');
   if(header==='메모')sheet.getRange(`${column}1:${column}502`).format.columnWidth=32;
  });
  const sex=kind==='adults'?'D':'C';sheet.getRange(`${sex}2:${sex}502`).dataValidation={rule:{type:'list',values:kind==='adults'?['수컷','암컷']:['미구분','수컷','암컷']}};
  const status=kind==='adults'?'K':'D';sheet.getRange(`${status}2:${status}502`).dataValidation={rule:{type:'list',values:kind==='adults'?['보유','분양','사망']:['유충','용화','우화','분양','사망']}};
  if(kind==='adults')sheet.getRange('J2:J502').dataValidation={rule:{type:'list',values:['우화','입양','채집']}};
 }
 const end=letters(headers.length-1);
 const fixed=sample.getRange(`A2:${end}2`);
 main.tabColor='#B5945C';sample.tabColor='#D4C6AD';guide.tabColor='#8B8B82';
 if(kind==='adults')sample.getRange('A2:L3').values=[['EX-M001','꼴통A','F3','수컷',84.2,new Date('2026-06-15T00:00:00Z'),'','','','우화','보유','사육 메모 예시'],['EX-F001','Wild','WD','암컷',50.1,null,'','','','채집','보유','']];
 else {const row=Array(headers.length).fill('');row[0]='내 라인명';row[1]='001';row[2]='미구분';row[3]='유충';row[4]=new Date('2026-07-01T00:00:00Z');row[5]='먹이원 A';row[6]=800;row[7]=0;row[8]=new Date('2026-09-01T00:00:00Z');row[9]='먹이원 B';row[10]=1400;row[11]=22.5;sample.getRange(`A2:${letters(headers.length-1)}2`).values=[row];}
 const example=fixed.values[0];
 example[kind==='adults'?0:1]=kind==='adults'?'[고정 예시] EX-M001':'[고정 예시] 001';
 example[headers.length-1]='KML 고정 예시 · 3행부터 입력';
 main.getRange(`A2:${end}2`).values=[example];
 main.getRange(`A2:${end}2`).format={fill:'#EAE2D2',font:{name:'Noto Serif KR',size:11,color:'#635744',italic:true},rowHeight:42,wrapText:true,verticalAlignment:'center'};
 main.freezePanes.unfreeze();
 guide.showGridLines=false;guide.getRange('A1:B9').format.font={name:'Noto Serif KR',size:11,color:'#302D27'};guide.getRange('A1:B1').values=[['항목','입력 안내']];guide.getRange('A1:B1').format={fill:'#4A4031',font:{bold:true,color:'#FFFFFF'},rowHeight:30};guide.getRange('A1:A9').format.columnWidth=20;guide.getRange('B1:B9').format.columnWidth=82;guide.getRange('A2:B9').format.rowHeight=40;guide.getRange('A2:B9').format.wrapText=true;guide.getRange('A2:B9').format.verticalAlignment='center';
 const tips=[['입력 위치',`${name} 시트 3행부터 작성합니다. 2행은 수정·삭제할 수 없는 고정 예시이며 업로드에서 자동 제외됩니다.`],['필수 항목',kind==='adults'?'신규 성충은 관리번호, 혈통, 성별이 필요합니다. 보유자는 로그인한 본인입니다.':'라인을 먼저 등록합니다. 라인명과 관리번호로 유충을 구분합니다.'],['기존 기록','관리번호가 같은 기록은 기본적으로 건너뜁니다. 수정하려면 업로드 화면에서 기존 개체도 수정을 체크하세요.'],['빈칸','기존 값은 유지됩니다. 선택 항목을 지우려면 [비우기]를 입력합니다. 관리번호·혈통·성별 등 필수 값은 비울 수 없습니다.'],['날짜·숫자','날짜는 YYYY-MM-DD, 무게는 g, 체장은 mm, 용량은 cc입니다. 무게 0은 빈칸과 다릅니다.'],['번호','001처럼 앞자리 0이 필요하면 문자 형식으로 입력합니다. 번호 변경은 개체 수정 화면을 사용하세요.'],['사육 기록',kind==='larvae'?'병 기록은 앞 번호부터 날짜와 함께 입력합니다. 없는 병이나 빈칸은 기존 기록을 삭제하지 않습니다.':'부·모 관리번호는 등록된 성충 또는 같은 파일의 성충을 지정할 수 있습니다.'],['저장','최대 500개체·5MB입니다. 미리보기와 오류를 확인한 뒤 저장합니다. 수식은 계산 결과를 값으로 붙여넣어 주세요.']];guide.getRange('A2:B9').values=tips;
 wb.recalculate();
 console.log((await wb.inspect({kind:'table',range:`${name}!A1:F3`,include:'values',tableMaxRows:3,tableMaxCols:6,maxChars:1600})).ndjson);
 if(!process.env.KML_SKIP_TEMPLATE_PREVIEW){ for(const [sheet,range]of [[name,'A1:F5'],['예시','A1:G4'],['안내','A1:B9']]){const png=await wb.render({sheetName:sheet,range,scale:1.4,format:'png'});await fs.writeFile(`${previewDir}/${kind}-${sheet}.png`,new Uint8Array(await png.arrayBuffer()));}}
 console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!',options:{useRegex:true,maxResults:20},maxChars:1000})).ndjson);
 await(await SpreadsheetFile.exportXlsx(wb)).save(`${out}/KML_${kind}_template.xlsx`);
 await fs.rm(`${out}/KML_${kind}_template.xlsx.inspect.ndjson`,{force:true});
 // The authoring API has no sheet protection surface. Add only native OOXML
 // protection/locked styles after Artifact Tool exports the values and formatting.
 execFileSync('python3',[fileURLToPath(new URL('./protect-excel-templates.py',import.meta.url)),`${out}/KML_${kind}_template.xlsx`],{stdio:'inherit'});
}
