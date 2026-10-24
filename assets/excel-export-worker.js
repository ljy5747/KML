/* Fill the Artifact Tool template without rewriting its formatting/protection. */
importScripts('./vendor/xlsx-0.20.3.full.min.js','./excel-export-template.js');
self.onmessage=function(event){
 try{
  const {template,headers,rows}=event.data;
  const buffer=self.buildLineExcel(template,headers,rows);
  self.postMessage({buffer},[buffer]);
 }catch(error){self.postMessage({error:error.message||String(error)});}
};
