const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync(__dirname+'/../app.js','utf8').replace('  boot();','  globalThis.test={currentYear,yearBounds,yearOptions,yearPicker,datePicker,daysInMonth,syncDatePicker,stepYear};');
const element={style:{setProperty(){},removeProperty(){}},addEventListener(){}};
const sandbox={window:{addEventListener(){}},document:{getElementById:()=>element,addEventListener(){}},setInterval(){},setTimeout(){},clearTimeout(){},location:{hash:'#/dashboard'}};
vm.runInNewContext(code,sandbox);
const t=sandbox.test,year=t.currentYear(),bounds=t.yearBounds();
assert.equal(bounds.min,year-5);assert.equal(bounds.max,year+5);
const options=t.yearOptions();assert.equal((options.match(/<option /g)||[]).length,11);
assert.ok(options.includes('value="'+year+'" selected'));
assert.ok(t.yearOptions(year-8).includes('기존 값'));
assert.equal((t.yearPicker({name:'year',value:year-8}).match(/disabled/g)||[]).length,2);
assert.ok(t.yearPicker({name:'year',value:bounds.max}).includes('한 해 올리기" disabled'));
assert.ok(t.yearPicker({name:'year',value:bounds.min}).includes('한 해 내리기" disabled'));
assert.equal((t.yearPicker({name:'year'}).match(/type="button"/g)||[]).length,2);
assert.ok(t.datePicker({name:'emerged'}).includes('data-date-value value=""'));
const saved=t.datePicker({name:'emerged',value:'2024-02-29'});
assert.ok(saved.includes('value="2024-02-29"')&&saved.includes('value="02" selected')&&saved.includes('value="29" selected'));
assert.equal(t.daysInMonth(2024,2),29);assert.equal(t.daysInMonth(2025,2),28);

// Model native select option replacement, including clearing an invalid leap day.
function dateFixture(y,m,d){
  const year={value:String(y)},month={value:m},hidden={value:''};
  const day={value:d,dataset:{monthKey:y+'-'+m},setCustomValidity(v){this.error=v;},set innerHTML(html){const selected=html.match(/value="([^"]*)" selected/);this.value=selected?selected[1]:'';}};
  const nodes={'[data-date-year]':year,'[data-date-month]':month,'[data-date-day]':day,'[data-date-value]':hidden};
  return {year,month,day,hidden,picker:{dataset:{required:'false'},querySelector:key=>nodes[key]}};
}
let f=dateFixture(2024,'02','29');t.syncDatePicker(f.picker);assert.equal(f.hidden.value,'2024-02-29');
f.year.value='2025';t.syncDatePicker(f.picker);assert.equal(f.day.value,'');assert.equal(f.hidden.value,'');assert.ok(f.day.error);
f.day.value='28';t.syncDatePicker(f.picker);assert.equal(f.hidden.value,'2025-02-28');assert.equal(f.day.error,'');
f=dateFixture(year,'','');t.syncDatePicker(f.picker);assert.equal(f.hidden.value,'');assert.equal(f.day.required,false);assert.equal(f.day.disabled,true);

const up={disabled:false,dataset:{step:'1'}},down={disabled:false,dataset:{step:'-1'}};
const select={value:String(bounds.max-1),closest:selector=>selector==='.year-picker'?box:null};
const box={querySelector:selector=>selector==='[data-year-select]'?select:selector==='[data-step="1"]'?up:down};
up.closest=down.closest=()=>box;
t.stepYear(up);assert.equal(select.value,String(bounds.max));assert.equal(up.disabled,true);
t.stepYear(up);assert.equal(select.value,String(bounds.max));
select.value=String(bounds.min+1);t.stepYear(down);assert.equal(select.value,String(bounds.min));assert.equal(down.disabled,true);
console.log('PASS: current year ±5, historical values, non-submit controls, bounds, saved dates, blank optional dates and leap-day validation.');
