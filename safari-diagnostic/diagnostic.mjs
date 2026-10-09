import {client} from '../client-config.mjs?v=15ecd476f284';
const BUILD='pass24-3-2-model-01',rows=[],controllers=new Set();
const nativeFetch=globalThis.fetch.bind(globalThis);
let sdk,activeRun,loaderStarted=performance.now();
const signals=()=>({gpc:navigator.globalPrivacyControl===true,dnt:navigator.doNotTrack==='1'});
const allowed=()=>{try{return JSON.parse(localStorage.getItem('mandalaw.analytics.choice.v1'))?.state==='ACCEPTED'&&!signals().gpc&&!signals().dnt;}catch{return false;}};
const render=()=>{document.querySelector('#trace').textContent=JSON.stringify(rows,null,2);document.querySelector('#latest').textContent=rows.at(-1)?.stage||'ready';document.querySelector('#sdk-health').disabled=!allowed();document.querySelector('#direct-health').disabled=!allowed();};
const note=detail=>{if(detail.stage==='queued'&&!detail.count&&!detail.inflight)return;rows.push({at:new Date().toISOString(),ms:Math.round(performance.now()-loaderStarted),...detail});if(rows.length>250)rows.shift();render();};
document.addEventListener('diagnostic-trace',e=>note(e.detail));
document.addEventListener('securitypolicyviolation',e=>note({stage:'csp_violation',directive:e.effectiveDirective}));
document.addEventListener('visibilitychange',()=>note({stage:'visibility_changed',hidden:document.hidden,state:document.visibilityState}));
window.addEventListener('pageshow',e=>note({stage:'pageshow',persisted:e.persisted,hidden:document.hidden}));
window.addEventListener('pagehide',e=>note({stage:'pagehide',persisted:e.persisted}));
window.addEventListener('error',()=>note({stage:'diagnostic_error',category:'script-or-resource'}));
window.addEventListener('unhandledrejection',()=>note({stage:'diagnostic_error',category:'unhandled-promise'}));
new PerformanceObserver(list=>{for(const e of list.getEntries())if(e.name.startsWith(client.apiHost+'/'))note({stage:'resource_finished',endpoint:new URL(e.name).pathname,status:e.responseStatus||null,ms:Math.round(e.duration)});}).observe({type:'resource',buffered:true});
const snapshot=()=>{let choice,qa,browserPresent=false,sessionPresent=false,readable=false;try{choice=JSON.parse(localStorage.getItem('mandalaw.analytics.choice.v1'))?.state||'UNDECIDED';qa=sessionStorage.getItem('mandalaw.analytics.qa.v1')==='yes';browserPresent=!!localStorage.getItem('mandalaw.analytics.browser.v1');sessionPresent=!!sessionStorage.getItem('mandalaw.analytics.session.v2');readable=true;}catch{choice='STORAGE_UNAVAILABLE';}note({stage:'snapshot',build:BUILD,origin:location.origin,hidden:document.hidden,visibility:document.visibilityState,hasFocus:document.hasFocus(),...signals(),choice,qa,readable,browserIdPresent:browserPresent,sessionIdPresent:sessionPresent,sdkInitialized:!!sdk,sdkOptedOut:sdk?sdk.has_opted_out_capturing():null,productionUsesSDK:false});};
document.querySelector('#snapshot').onclick=snapshot;
document.querySelector('#clear-trace').onclick=()=>{rows.length=0;snapshot();};
document.querySelector('#save-trace').onclick=()=>{const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([JSON.stringify({build:BUILD,exportedAt:new Date().toISOString(),rows},null,2)],{type:'application/json'}));link.download='pass24-3-2-diagnostic-trace.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);};
const props=()=>({schema_version:4,environment:'safari-diagnostic',qa:true,probe_version:'24.3.2-sdk-v1',build_marker:BUILD,qa_run:activeRun,distinct_id:'synthetic-'+activeRun,$process_person_profile:false,$geoip_disable:true,$ip:null});
// Only diagnostic XHR observation. The production adapter's native fetch is untouched.
const xhrOpen=XMLHttpRequest.prototype.open,xhrSend=XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open=function(method,url,...rest){this.__diagVendor=String(url).startsWith(client.apiHost+'/');return xhrOpen.call(this,method,url,...rest);};
XMLHttpRequest.prototype.send=function(body){if(this.__diagVendor){note({stage:'sdk_transport_started',transport:'XHR',bodyBytes:typeof body==='string'?body.length:null});this.addEventListener('loadend',()=>note({stage:'sdk_transport_result',status:this.status,accepted:this.status>=200&&this.status<300,qa_run:activeRun}));}return xhrSend.call(this,body);};
document.querySelector('#sdk-health').onclick=async()=>{
 if(!allowed())return;activeRun=crypto.randomUUID();
 try{
  if(!sdk){note({stage:'sdk_load_start'});const {default:posthog}=await import('../posthog-sdk-1.438.3.mjs?v=b12c0a5b1ed5');note({stage:'sdk_loaded'});if(!allowed())return;note({stage:'init_called'});
   sdk=posthog.init(client.token,{api_host:client.apiHost,ui_host:'https://us.posthog.com',autocapture:false,capture_pageview:false,capture_pageleave:false,disable_session_recording:true,disable_surveys:true,disable_conversations:true,disable_product_tours:true,disable_external_dependency_loading:true,advanced_disable_flags:true,capture_dead_clicks:false,capture_exceptions:false,capture_performance:false,capture_heatmaps:false,enable_recording_console_log:false,rageclick:false,person_profiles:'never',persistence:'memory',disable_persistence:true,save_referrer:false,save_campaign_params:false,respect_dnt:true,ip:false,opt_out_capturing_by_default:true,opt_out_persistence_by_default:true,request_batching:false,disable_compression:true,api_transport:'XHR',before_send:e=>{note({stage:'sdk_default_property_names',keys:Object.keys(e.properties).sort()});if(!allowed()||e.event!=='analytics_healthcheck_safari')return null;e.properties={...props(),token:client.token};note({stage:'sdk_sanitized_property_names',keys:Object.keys(e.properties).sort()});return e;},loaded:()=>note({stage:'init_ready',project:client.projectId}),on_request_error:()=>note({stage:'sdk_request_failed'})});
  }
  sdk.opt_in_capturing({captureEventName:false});note({stage:'capture_allowed',allowed:allowed(),sdkOptedOut:sdk.has_opted_out_capturing()});if(!allowed())return;note({stage:'healthcheck_called',qa_run:activeRun});sdk.capture('analytics_healthcheck_safari',props(),{send_instantly:true});
 }catch(error){note({stage:'sdk_error',category:error?.name||'Error'});}
};
document.querySelector('#direct-health').onclick=async()=>{if(!allowed())return;activeRun=crypto.randomUUID();const c=new AbortController();controllers.add(c);try{note({stage:'direct_healthcheck_called',qa_run:activeRun});const p={...props(),probe_version:'24.3.2-direct-v1'};const r=await nativeFetch(client.apiHost+'/i/v0/e/',{method:'POST',mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:client.token,event:'analytics_healthcheck_safari',properties:p}),signal:c.signal});note({stage:'direct_transport_result',status:r.status,accepted:r.ok,qa_run:activeRun});}catch(error){note({stage:'direct_error',category:error?.name==='AbortError'?'aborted':'network-or-blocked'});}finally{controllers.delete(c);}};
document.addEventListener('diagnostic-trace',e=>{if(e.detail.stage==='consent_state'&&e.detail.state!=='ACCEPTED'){sdk?.opt_out_capturing();for(const c of controllers)c.abort();}});
snapshot();
note({stage:'loader_import_requested',build:BUILD});
import('./site.mjs?v=65ab8448412e').then(()=>note({stage:'loader_import_completed'})).catch(error=>note({stage:'loader_import_failed',category:error?.name||'Error'}));
