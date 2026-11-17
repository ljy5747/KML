let crossAppRefreshBusy=false;
  let crossAppRefreshLast=0;
  async function refreshLinkedRecords(){
    if(crossAppRefreshBusy||!allowed||ui.modal||social.open||document.querySelector('#comment-form textarea')?.value?.trim()||detailLabelState.saving||detailLabelState.editorOpen||document.hidden||
       Date.now()-crossAppRefreshLast<3000)return;
    const target=document.activeElement;
    if(target&&target.matches?.('input,select,textarea,[contenteditable="true"]'))return;
    crossAppRefreshBusy=true;
    crossAppRefreshLast=Date.now();
    try{const changed=await loadRemote();if(changed&&allowed&&!ui.modal)render();}
    catch(e){/* Retain the last rendered data while offline. */}
    finally{crossAppRefreshBusy=false;}
  }
  setInterval(()=>{refreshLinkedRecords();refreshSocial();refreshCommentReactions();},30000);
  window.addEventListener('focus',()=>{refreshLinkedRecords();refreshSocial();refreshCommentReactions();});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden){showStandaloneHome();refreshLinkedRecords();refreshSocial();refreshCommentReactions();}
  });
  window.addEventListener('pageshow',event=>{
    if(event.persisted)showStandaloneHome();
  });
  boot();
