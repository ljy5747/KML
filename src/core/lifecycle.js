let crossAppRefreshBusy=false;
  let crossAppRefreshLast=0;
  async function refreshLinkedRecords(){
    if(crossAppRefreshBusy||!allowed||ui.modal||document.hidden||
       Date.now()-crossAppRefreshLast<3000)return;
    const target=document.activeElement;
    if(target&&target.matches?.('input,select,textarea,[contenteditable="true"]'))return;
    crossAppRefreshBusy=true;
    crossAppRefreshLast=Date.now();
    try{const old=JSON.stringify(db);await loadRemote();if(allowed&&!ui.modal&&JSON.stringify(db)!==old)render();}
    catch(e){/* Retain the last rendered data while offline. */}
    finally{crossAppRefreshBusy=false;}
  }
  setInterval(refreshLinkedRecords,8000);
  window.addEventListener('focus',refreshLinkedRecords);
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden){showStandaloneHome();refreshLinkedRecords();}
  });
  window.addEventListener('pageshow',event=>{
    if(event.persisted)showStandaloneHome();
  });
  boot();
