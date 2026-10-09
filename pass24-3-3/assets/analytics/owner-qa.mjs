// Explicit local certification only. No observer, UI, run ID or log for ordinary visits.
const stages=new Set(['loader_ready','snapshot','initial_cancelled','initial_gate','initial_capture','initial_recorded','capture_called','transport_started','transport_result','lifecycle']);
const fields=new Set(['reason','allowed','enabled','visible','ready','pending','recorded','event','queued','count','consent','gpc','dnt','qa','sdk','status','ok','method','persisted','signal','nativeFetchBound']);
export function ownerQA({enabled=false,build='unknown',snapshot=()=>({})}={}){
 let active=false,run=null,root=null,output=null;const rows=[];
 const marker=/^[a-f0-9]{12}$/.test(build)?'pass24-3-3-'+build:'pass24-3-3-unversioned';
 function note(stage,values={}){
  if(!active||!stages.has(stage))return;
  const safe={};for(const [k,v]of Object.entries(values))if(fields.has(k)&&(typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v)||typeof v==='string'&&/^[a-zA-Z0-9_ .:-]{1,80}$/.test(v)))safe[k]=v;
  const row={at:new Date().toISOString(),stage,build:marker,qa_run:run,...safe};rows.push(row);if(rows.length>120)rows.shift();
  if(output){const p=document.createElement('p');p.textContent='QA '+JSON.stringify(row);output.append(p);while(output.children.length>120)output.firstChild.remove();}
 }
 function enable(value){
  if(!value||active)return;active=true;run=crypto.randomUUID();
  root=document.createElement('details');root.id='analytics-owner-qa';root.className='analytics-owner-qa';
  const title=document.createElement('summary');title.textContent='Owner QA · '+marker;root.append(title);
  const status=document.createElement('p');status.textContent='Local diagnostic trace. This mode does not grant consent. QA run '+run;root.append(status);
  const button=document.createElement('button');button.type='button';button.textContent='Capture QA state';button.onclick=()=>note('snapshot',snapshot());root.append(button);
  output=document.createElement('div');root.append(output);document.body.append(root);note('loader_ready',{sdk:'not-used-direct-fetch',ready:true});note('snapshot',snapshot());
 }
 function properties(){return active?{qa:true,qa_run:run,build_marker:marker}:{};}
 enable(enabled);return{note,enable,properties,get active(){return active;}};
}
