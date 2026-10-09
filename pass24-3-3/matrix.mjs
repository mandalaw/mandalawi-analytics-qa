import {config} from './assets/analytics/config.mjs?v=1b9ed50b6359';
import {PrivacyState} from './assets/analytics/privacy-state.mjs?v=2257ac6b2ab7';
import {Events,pageContext,context} from './assets/analytics/events.mjs?v=5ffbeca47f5e';
import {PostHogAdapter} from './assets/analytics/posthog-adapter.mjs?v=b3ca1282c301';
import {InitialView} from './assets/analytics/lifecycle.mjs?v=47ac8ed562f9';
const mem=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
const note=x=>{const p=document.createElement('p');p.textContent='MATRIX '+JSON.stringify({at:new Date().toISOString(),...x});document.querySelector('#result').append(p);};
const cases=['visible-accept','hidden-accept-visible','hidden-during-ready','hidden-after-ready','visible-hide-visible','hidden-withdraw-visible','hidden-decline-visible','GPC-recovery','DNT-recovery','bfcache-return','tab-restore','focus-blur-loop','new-document'];
document.querySelector('#run').onclick=async()=>{
 document.querySelector('#run').disabled=true;let passed=0;
 for(const name of cases){
  let visible=true,ready=true,signals={};const run=crypto.randomUUID();let starts=0,responses=0,queued=0;
  const qa={active:true,properties:()=>({qa:true,qa_run:run,build_marker:'pass24-3-3-matrix'}),note:(stage,data)=>{if(stage==='transport_started')starts++;if(stage==='transport_result'&&data.ok)responses++;}};
  const privacy=new PrivacyState({storage:mem(),session:mem(),signals:()=>({...signals,gpc:signals.gpc||navigator.globalPrivacyControl===true,dnt:signals.dnt||navigator.doNotTrack==='1'})});
  const transport=new PostHogAdapter({config,origin:location.origin,qa}),events=new Events({privacy,transport});
  const view=new InitialView({allowed:()=>events.synchronize(),visible:()=>visible,ready:()=>ready,enabled:()=>true,initial:[{name:'page_view'}],emit:()=>{const ok=events.emit('page_view','home',{...pageContext({page:'home'}),...context(),source:'exposure'});if(ok)queued++;return ok;}});
  const step=(why)=>{view.reconcile(why);};let pendingBefore=null,expected=1;
  if(name.startsWith('hidden')||name.includes('recovery'))visible=false;
  if(name==='hidden-during-ready')ready=false;
  privacy.choose(name==='hidden-decline-visible'?'DECLINED':'ACCEPTED');step('consent');pendingBefore=view.pending;
  if(name==='hidden-after-ready'){ready=false;step('loading');ready=true;step('ready');}
  if(name==='hidden-during-ready'){ready=true;step('ready-hidden');}
  if(name==='hidden-withdraw-visible'){privacy.choose('WITHDRAWN');view.cancel('withdraw');expected=0;}
  if(name==='hidden-decline-visible')expected=0;
  if(name==='GPC-recovery'||name==='DNT-recovery'){signals=name[0]==='G'?{gpc:true}:{dnt:true};step('signal');expected=0;}
  visible=true;step('visible');
  for(const why of ['focus','pageshow','ready','load','dom-ready','focus'])step(why);
  visible=false;step('pagehide');visible=true;step('pageshow-persisted');
  for(let i=0;i<10;i++)step('focus');
  const sent=await events.flush();const pass=queued===expected&&sent===expected&&starts===expected&&responses===expected&&!view.pending;
  if(pass)passed++;note({case:name,qa_run:run,expected,queued,sent,starts,responses,pendingBefore,pass});
 }
 document.querySelector('#status').textContent=`Lifecycle fixtures: ${passed}/${cases.length} passed`;
};
