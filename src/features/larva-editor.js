const canEditLarvaLine=line=>!!line&&(mineLine(line)||isAdmin());
const larvaEditorText=value=>value===null||value===undefined?'':String(value);
function larvaEditorField(name,label,value,type='text',extra=''){
 return '<label class="field"><span>'+label+'</span><input type="'+type+'" name="'+name+'" value="'+attr(larvaEditorText(value))+'" '+extra+'></label>';
}
function larvaEditorRow(record={},index=-1){
 const r=record;return '<fieldset class="larva-edit-record" data-larva-record data-original-index="'+index+'"><legend>교체 기록</legend><div class="form-grid">'+
 larvaEditorField('date','날짜',r.date,'date','required')+larvaEditorField('feedBrand','먹이원 · 제품명',r.feedBrand||r.feedType,'text','maxlength="160"')+
 larvaEditorField('feedType','먹이 종류',r.feedType,'text','maxlength="80"')+larvaEditorField('bottleSize','용량 (cc)',r.bottleSize,'text','maxlength="40"')+
 larvaEditorField('weight','무게 (g)',r.weight,'number','min="0" step="any"')+larvaEditorField('headWidth','두폭 (mm)',r.headWidth,'number','min="0" step="any"')+
 larvaEditorField('nextDate','다음 교체일',r.nextDate,'date')+larvaEditorField('instar','령수',r.instar,'text','maxlength="30"')+
 '<label class="field full"><span>기록 메모</span><textarea name="memo" maxlength="2000">'+esc(r.memo||'')+'</textarea></label></div><div class="helper-row"><label class="larva-pudding"><input type="checkbox" name="pudding" '+(labelIsPudding(r)?'checked':'')+'> 푸딩</label><button type="button" class="btn btn-red btn-sm" data-action="remove-larva-record">이 기록 제거</button></div></fieldset>';
}
function larvaModal(id){
 const v=byId(db.larvae,id),line=v&&byId(db.lines,v.lineId);if(!v||!canEditLarvaLine(line))return '';
 const source=v.sourceData||{},p=source.pupation||{},ec=source.eclosion||{};
 const states=[...new Set(['유충','용화','우화','분양','사망',source.status].filter(Boolean))];
 const body='<form id="larva-form"><input type="hidden" name="id" value="'+attr(id)+'"><input type="hidden" name="version" value="'+attr(v.updatedAt||'')+'"><div class="modal-content"><div class="form-grid">'+larvaEditorField('number','관리번호',v.number,'text','required maxlength="80"')+
 '<label class="field"><span>성별</span><select name="sex">'+[['U','미구분'],['M','♂ 수컷'],['F','♀ 암컷']].map(([key,label])=>'<option value="'+key+'" '+(v.sex===key?'selected':'')+'>'+label+'</option>').join('')+'</select></label><label class="field"><span>상태</span><select name="status">'+states.map(x=>'<option '+((source.status||'유충')===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label>'+larvaEditorField('specimenMemo','개체 메모',source.memo,'text','maxlength="2000"')+'</div><h3>병별 사육 기록</h3><div data-larva-records>'+larvaBottleRecords(v).map((r,i)=>larvaEditorRow(r,i)).join('')+'</div><button type="button" class="btn btn-light" data-action="add-larva-record">'+icon('plus')+' 교체 기록 추가</button><h3>용화 · 우화</h3><div class="form-grid">'+larvaEditorField('prepupaDate','전용 날짜',p.prepupaDate,'date')+larvaEditorField('pupaDate','용화일',p.pupaDate,'date')+larvaEditorField('pupaWeight','용화 무게 (g)',p.pupaWeight,'number','min="0" step="any"')+larvaEditorField('emerged','우화일',v.emerged||ec.date,'date')+larvaEditorField('size','체장 (mm)',v.size!==''?v.size:ec.totalLength,'number','min="0" max="200" step="any"')+'</div><p class="section-caption">'+(v.beetlelogId?'저장하면 같은 계정의 BeetleLog 원본에도 반영됩니다.':'KML에 등록된 유충 기록을 수정합니다.')+' 사진·표시 등 기존 추가 정보는 유지됩니다.</p><p data-larva-save-error class="larva-save-error" role="alert" hidden></p></div><div class="modal-actions"><button type="button" class="btn btn-light" data-action="close-modal">취소</button><button type="submit" class="btn btn-dark">변경사항 저장</button></div></form>';
 return modalFrame('유충 기록 수정',line.name+' · '+v.number,body);
}
function addLarvaEditorRow(){const host=document.querySelector('[data-larva-records]');if(host)host.insertAdjacentHTML('beforeend',larvaEditorRow({date:dateToday(),id:uid()},-1));}
function larvaEditorPayload(v,data,entries){
 const number=String(data.number||'').trim();if(!number||number.length>80)throw Error('관리번호를 입력하세요.');
 const source=JSON.parse(JSON.stringify(v.sourceData||{})),original=larvaBottleRecords(v);
 const bottles=entries.map(({index,values})=>{
   const r={...(index>=0?original[index]:{id:uid()})};
   for(const key of ['date','feedBrand','feedType','bottleSize','weight','headWidth','nextDate','instar','memo'])r[key]=larvaEditorText(values[key]).trim();
   if(!r.date||!validLarvaDate(r.date))throw Error('교체 날짜를 확인하세요.');
   if(r.nextDate&&!validLarvaDate(r.nextDate))throw Error('다음 교체일을 확인하세요.');
   for(const key of ['weight','headWidth'])if(r[key]!==''&&(!Number.isFinite(Number(r[key]))||Number(r[key])<0))throw Error('무게와 두폭은 0 이상의 숫자로 입력하세요.');
   r.id=r.id||uid();r.pudding=values.pudding===true;return r;
 });
 for(const key of ['prepupaDate','pupaDate','emerged'])if(data[key]&&!validLarvaDate(data[key]))throw Error('용화·우화 날짜를 확인하세요.');
 for(const key of ['pupaWeight','size'])if(data[key]!==''&&data[key]!=null&&(!Number.isFinite(Number(data[key]))||Number(data[key])<0||(key==='size'&&Number(data[key])>200)))throw Error('용화 무게와 체장을 확인하세요.');
 source.code=number;source.sex=data.sex==='M'?'수컷 ♂':data.sex==='F'?'암컷 ♀':'미구분';source.status=data.status;source.memo=String(data.specimenMemo||'');source.bottleRecords=bottles;
 source.pupation={...(source.pupation||{}),prepupaDate:data.prepupaDate||'',pupaDate:data.pupaDate||'',pupaWeight:larvaEditorText(data.pupaWeight)};
 source.eclosion={...(source.eclosion||{}),date:data.emerged||'',totalLength:larvaEditorText(data.size)};
 return {number,sex:['M','F'].includes(data.sex)?data.sex:'U',records:bottles.map(r=>[r.date,r.feedBrand||r.feedType,r.bottleSize,r.weight]),emerged:data.emerged||null,size:data.size===''||data.size==null?null:Number(data.size),source_data:source};
}
function validLarvaDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
async function saveLarvaEditor(form){
 if(form.dataset.saving==='true')return;
 const data=Object.fromEntries(new FormData(form)),v=byId(db.larvae,data.id),line=v&&byId(db.lines,v.lineId),errorBox=form.querySelector('[data-larva-save-error]');
 const fail=message=>{if(errorBox){errorBox.hidden=false;errorBox.textContent=message;}notify(message);};
 if(!v||!canEditLarvaLine(line))return fail('본인 라인의 유충만 수정할 수 있습니다.');
 if(!data.version||data.version!==v.updatedAt)return fail('기록이 변경됐습니다. 창을 닫고 최신 기록에서 다시 수정하세요.');
 const submit=form.querySelector('[type="submit"]');
 try{
   const entries=Array.from(form.querySelectorAll('[data-larva-record]')).map(row=>({index:Number(row.dataset.originalIndex),values:Object.fromEntries(Array.from(row.querySelectorAll('[name]')).map(input=>[input.name,input.type==='checkbox'?input.checked:input.value]))}));
   const payload=larvaEditorPayload(v,data,entries);
   if(db.larvae.some(x=>x.id!==v.id&&x.lineId===v.lineId&&x.number===payload.number))throw Error('같은 라인에 이미 있는 관리번호입니다.');
   form.dataset.saving='true';if(submit)submit.disabled=true;
   await persist('kml_larvae',v.id,payload,true);
   await loadRemote();closeModal();render();notify(v.beetlelogId?'유충 기록을 저장하고 BeetleLog에 반영했습니다.':'유충 기록을 저장했습니다.');
 }catch(error){fail('저장 실패: '+(error.message||String(error)));}
 finally{form.dataset.saving='false';if(submit)submit.disabled=false;}
}
