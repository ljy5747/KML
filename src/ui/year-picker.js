const currentYear=()=>new Date().getFullYear();
  const yearBounds=()=>({min:currentYear()-5,max:currentYear()+5});
  const selectedYear=value=>/^\d{4}$/.test(String(value||''))?Number(value):currentYear();
  function yearOptions(value){
    const selected=selectedYear(value),{min,max}=yearBounds();
    const years=Array.from({length:11},(_,i)=>min+i);
    if(selected<min||selected>max)years.push(selected);
    return years.sort((a,b)=>a-b).map(year=>'<option value="'+year+'" '+(year===selected?'selected':'')+'>'+year+'년'+(year<min||year>max?' (기존 값)':'')+'</option>').join('');
  }
  function yearPicker({name,value,label='연도',datePart=false}){
    const selected=selectedYear(value),{min,max}=yearBounds(),outside=selected<min||selected>max;
    return '<div class="year-picker"><select name="'+attr(name)+'" data-year-select '+(datePart?'data-date-year':'')+' aria-label="'+attr(label)+'">'+yearOptions(selected)+'</select><div class="year-step-controls"><button type="button" class="year-step" data-action="year-step" data-step="1" aria-label="'+attr(label)+' 한 해 올리기" '+(outside||selected>=max?'disabled':'')+'>▲</button><button type="button" class="year-step" data-action="year-step" data-step="-1" aria-label="'+attr(label)+' 한 해 내리기" '+(outside||selected<=min?'disabled':'')+'>▼</button></div></div>';
  }
  const daysInMonth=(year,month)=>month?new Date(Number(year),Number(month),0).getDate():0;
  const padDate=n=>String(n).padStart(2,'0');
  function dayOptions(year,month,selected){
    return '<option value="">일</option>'+Array.from({length:daysInMonth(year,month)},(_,i)=>i+1).map(day=>'<option value="'+padDate(day)+'" '+(Number(selected)===day?'selected':'')+'>'+day+'일</option>').join('');
  }
  function datePicker({name,value='',label='날짜',required=false}){
    const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/),year=match?match[1]:currentYear(),month=match?match[2]:'',day=match?match[3]:'';
    return '<div class="date-picker" data-date-picker data-required="'+required+'"><input type="hidden" name="'+attr(name)+'" data-date-value value="'+attr(value)+'"/>'+yearPicker({name:name+'Year',value:year,label:label+' 연도',datePart:true})+'<div class="date-month-day"><select data-date-month aria-label="'+attr(label)+' 월" '+(required?'required':'')+'><option value="">월</option>'+Array.from({length:12},(_,i)=>i+1).map(m=>'<option value="'+padDate(m)+'" '+(Number(month)===m?'selected':'')+'>'+m+'월</option>').join('')+'</select><select data-date-day data-month-key="'+year+'-'+month+'" aria-label="'+attr(label)+' 일" '+(!month?'disabled':'')+' '+(required||month?'required':'')+'>'+dayOptions(year,month,day)+'</select></div></div>';
  }
  function updateYearButtons(select){
    const {min,max}=yearBounds(),value=Number(select.value),box=select.closest('.year-picker'),outside=value<min||value>max;
    box.querySelector('[data-step="1"]').disabled=outside||value>=max;
    box.querySelector('[data-step="-1"]').disabled=outside||value<=min;
  }
  function syncDatePicker(picker){
    const year=picker.querySelector('[data-date-year]'),month=picker.querySelector('[data-date-month]'),day=picker.querySelector('[data-date-day]'),hidden=picker.querySelector('[data-date-value]');
    const key=year.value+'-'+month.value;
    if(day.dataset.monthKey!==key){const previous=day.value;day.innerHTML=dayOptions(year.value,month.value,previous);day.dataset.monthKey=key;}
    day.disabled=!month.value;day.required=picker.dataset.required==='true'||!!month.value;
    hidden.value=month.value&&day.value?year.value+'-'+padDate(month.value)+'-'+padDate(day.value):'';
    day.setCustomValidity(month.value&&!day.value?'일을 선택하세요.':'');
  }
  function stepYear(button){
    if(button.disabled)return;
    const select=button.closest('.year-picker').querySelector('[data-year-select]'),{min,max}=yearBounds();
    select.value=String(Math.max(min,Math.min(max,Number(select.value)+Number(button.dataset.step))));
    updateYearButtons(select);
    const picker=select.closest('[data-date-picker]');if(picker)syncDatePicker(picker);
  }

  
