import {config} from './config.mjs?v=1b9ed50b6359';
import {PrivacyState} from './privacy-state.mjs?v=2257ac6b2ab7';
import {Events,context,routeInfo,durationBucket,schema,pageContext} from './events.mjs?v=5ffbeca47f5e';
import {PostHogAdapter,endpointFor} from './posthog-adapter.mjs?v=b3ca1282c301';
import {InitialView} from './lifecycle.mjs?v=47ac8ed562f9';
import {ownerQA} from './owner-qa.mjs?v=c5d722286784';
const info={page:'home'}; // Isolated harness maps to the approved home context.
if(info)boot();
function boot(){
 let plannedQA=new URLSearchParams(location.search).get('analytics_qa')==='1',events,ui,lifecycle,qa,lastInput=-Infinity,last=performance.now(),engagedMs=0,runMs=0,running=false;
 const safeStore=name=>{try{return window[name];}catch{return{getItem:()=>null,setItem:()=>{throw Error();},removeItem:()=>{}};}};
 const privacy=new PrivacyState({storage:safeStore('localStorage'),session:safeStore('sessionStorage'),signals:()=>({gpc:navigator.globalPrivacyControl===true,dnt:navigator.doNotTrack==='1'}),changed:state=>{events?.synchronize();if(state!=='ACCEPTED')lifecycle?.cancel('privacy');update();}});
 plannedQA=plannedQA||privacy.qa();
 qa=ownerQA({enabled:plannedQA,build:new URL(import.meta.url).searchParams.get('v'),snapshot:()=>({consent:privacy.state,visible:!document.hidden,gpc:navigator.globalPrivacyControl===true,dnt:navigator.doNotTrack==='1',qa:privacy.qa(),sdk:'not-used-direct-fetch',ready:true,pending:lifecycle?.pending||false,recorded:lifecycle?.recorded.size||0})});
 const transport=new PostHogAdapter({config,origin:location.origin,qa});events=new Events({privacy,transport});
 const base={...pageContext(info),...context({ua:navigator.userAgent,width:innerWidth,referrer:document.referrer,search:location.search,origin:location.origin})};
 const initial=[{name:'page_view'}];
 const aliases={resume:'resume_page_viewed',devrun:'devrun_viewed',archive:'archive_opened'};
 if(aliases[info.page])initial.push({name:aliases[info.page]});
 if(info.project)initial.push({name:'project_case_study_opened',props:{project:info.project}});
 if(info.project==='original')initial.push({name:'archive_opened'});
 lifecycle=new InitialView({allowed:()=>events.synchronize(),visible:()=>!document.hidden,ready:()=>true,enabled:()=>!!endpointFor(config,location.origin),initial,emit:(name,props)=>events.emit(name,info.page,{...base,...props,source:'exposure'}),observe:qa.note});
 const entry=(reason='entry')=>{const before=events.queue.length,ok=lifecycle.reconcile(reason);if(events.queue.length>before)events.flush();return ok;};
 const emit=(name,props={},source='user')=>{if(!entry('event'))return false;if(name==='page_view')return false;const queued=events.emit(name,info.page,{...base,...props,source});qa.note('capture_called',{event:name,queued});return queued;};
 const project=value=>schema.contexts.project.includes(value)?value:null;
 const root=document.createElement('div');root.id='analytics-privacy';root.innerHTML='<button class="privacy-launch" type="button" aria-haspopup="dialog">◈ Privacy choices</button><dialog aria-labelledby="analytics-privacy-title"><h2 id="analytics-privacy-title">A little insight. Your choice.</h2><p>Optional analytics help me understand which projects, links and game paths are useful. They record selected page, project and game actions, broad device and referral categories, and a random browser identifier for return visits. No typed text or screen recording.</p><p>The portfolio and game work the same either way. No replay or account tracking is included.</p><p class="privacy-status" role="status"></p><div class="privacy-actions"><button data-choice="ACCEPTED" type="button">Allow analytics</button><button data-choice="DECLINED" type="button">No thanks</button><button data-choice="WITHDRAWN" type="button">Withdraw consent</button></div><p>Stopping collection does not erase data already delivered. Optional events go to PostHog only when enabled.</p><p><a href="/privacy/">Privacy details</a></p><details><summary>Testing this site?</summary><label><input id="analytics-qa" type="checkbox"> Mark this tab’s consented visits as test traffic</label><p>This does not grant consent. Decline analytics to exclude your browser entirely.</p></details><button class="privacy-close" type="button">Close</button></dialog>';
 const disclosure=document.createElement('p');disclosure.textContent=config.privacySummary||'Local review only. Collection is not activated on the public site.';root.querySelector('dialog').append(disclosure);(document.getElementById('game')||document.body).append(root);ui=root.querySelector('dialog');const open=root.querySelector('.privacy-launch');root.querySelector('#analytics-qa').onchange=e=>{plannedQA=e.target.checked;qa.enable(plannedQA);if(privacy.state==='ACCEPTED'){privacy.setQA(plannedQA);events.synchronize();entry();}update();};open.onclick=()=>{if(info.page==='devrun'){const pause=document.getElementById('pause');if(pause&&!pause.disabled)pause.click();}update();ui.showModal();root.querySelector('[data-choice="DECLINED"]').focus();};root.querySelector('.privacy-close').onclick=()=>ui.close();ui.addEventListener('close',()=>open.focus());
 root.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{privacy.choose(b.dataset.choice);if(b.dataset.choice==='ACCEPTED'&&plannedQA)privacy.setQA(true);if(b.dataset.choice!=='ACCEPTED')plannedQA=false;events.synchronize();update();entry();events.flush();});
 function update(){if(!ui)return;const states={UNDECIDED:'Optional analytics are off.',ACCEPTED:'Analytics allowed. You can withdraw at any time.',DECLINED:'Analytics declined.',WITHDRAWN:'Consent withdrawn. No new events will be sent.',PRIVACY_SIGNAL_SUPPRESSED:'Your browser privacy signal keeps analytics off.'};ui.querySelector('.privacy-status').textContent=states[privacy.state]+(!config.enabled?' Collection is not activated on this build.':config.localSimulation?' Local demonstration only; nothing goes to PostHog.':'');ui.querySelector('[data-choice="ACCEPTED"]').disabled=privacy.blocked();const qa=ui.querySelector('#analytics-qa');try{qa.checked=plannedQA||privacy.session.getItem('mandalaw.analytics.qa.v1')==='yes';}catch{qa.checked=plannedQA;}root.dataset.consent=privacy.state;}
 for(const type of ['pointerdown','keydown','wheel','touchstart'])document.addEventListener(type,e=>{if(e.isTrusted&&!e.target.closest?.('#analytics-privacy'))lastInput=performance.now();},{capture:true,passive:true});
 // Only committed deck changes following a recent trusted project intent count as an open.
 let projectIntent=null,detailProject=null;
 document.addEventListener('pointerdown',e=>{const el=e.target.closest?.('[data-project],a[href^="#project-"]');if(e.isTrusted&&el)projectIntent={at:performance.now(),project:project(el.dataset.project||el.getAttribute('href')?.replace('#project-',''))};},{capture:true,passive:true});
 document.addEventListener('keydown',e=>{if(e.isTrusted&&e.target.closest?.('.project-selector')&&['ArrowLeft','ArrowRight','Home','End','Enter',' '].includes(e.key))projectIntent={at:performance.now()};},{capture:true});
 document.addEventListener('deck-commit',e=>{const p=project(e.detail?.key);if(p&&projectIntent&&(e.detail?.historyMode==='push'||projectIntent.project===p)&&performance.now()-projectIntent.at<5000){emit('project_card_opened',{project:p});projectIntent=null;}});
 document.addEventListener('click',e=>{
  if(!e.isTrusted||e.target.closest?.('#analytics-privacy'))return;const el=e.target.closest?.('a,button');if(!el)return;
  if(el.dataset.scene||el.dataset.gameOpen||el.id==='scene-close')detailProject=null;
  if(el.dataset.projectDetail){const p=project(el.dataset.projectDetail);detailProject=p;if(p)emit('project_card_opened',{project:p});}
  if(el.matches('#guide-launcher,[data-guide-open]'))emit('guide_opened');
  if(el.dataset.guideTopic)emit('guide_question_selected',{topic:schema.contexts.topic.includes(el.dataset.guideTopic)?el.dataset.guideTopic:'other'});
  if(el.closest('#guide-actions')){const href=el.getAttribute('href')||'',action=href.includes('resume')?'resume':href.includes('contact')?'contact':href.startsWith('#project-')?'projects':'navigate';emit('guide_action_clicked',{action});}
  const world=el.dataset.entrySelect||el.dataset.guideWorld;if(['a','b','c'].includes(world))emit('home_world_selected',{world});
  if(el.id==='journey-link'&&el.getAttribute('href')?.includes('long-way'))emit('devrun_long_way_selected');
  if(!el.matches('a'))return;let u;try{u=new URL(el.href);}catch{return;}
  const target=u.protocol==='mailto:'?'email':u.hostname==='github.com'?'github':/(^|\.)linkedin.com$/.test(u.hostname)?'linkedin':u.hostname==='trustai.mandalawi.ca'?'trustai':'other';
  if(u.origin!==location.origin&&['https:','mailto:'].includes(u.protocol)){emit('outbound_link_clicked',{destination:target});const p=project(el.closest('[data-project]')?.dataset.project||info.project||(target==='trustai'?'trustai':el.closest('#scene-panel')?detailProject:null));if(p)emit('project_link_clicked',{project:p,destination:target});}
  if(target==='email')emit('contact_email_clicked');if(['email','linkedin','github'].includes(target)&&(target==='email'||el.closest('#contact,.contact-links,footer')))emit('contact_link_clicked',{destination:target});
  if(/\.pdf$/i.test(u.pathname)&&/resume/i.test(u.pathname))emit('resume_download_clicked',{document:'public-resume'});
  // Internal project source/case-study links have their own truthful click, not a delivery event.
  if(u.origin===location.origin&&u.pathname.includes('/case-studies/')){const p=routeInfo(u.pathname)?.project;if(p)emit('project_link_clicked',{project:p,destination:'other'});}
  events.flush();
 },{capture:true});
 document.addEventListener('change',e=>{if(e.isTrusted&&e.target.id==='toggle-dark-mode')emit('theme_changed',{theme:e.target.checked?'dark':'light'});});
 const observed=new Map();const observer=new IntersectionObserver(items=>{for(const x of items){const o=observed.get(x.target)||{dwell:0};o.visible=x.isIntersecting&&x.intersectionRect.height>=Math.min(x.boundingClientRect.height,innerHeight)*.5;o.dwell=o.visible?o.dwell:0;observed.set(x.target,o);}},{threshold:[0,.1,.25,.5,.75,1]});
 document.querySelectorAll('section[id],article.project-panel').forEach(el=>observer.observe(el));
 const tick=setInterval(()=>{const now=performance.now(),delta=Math.min(1000,now-last);last=now;events.synchronize();const active=!document.hidden&&now-lastInput<15000;if(active)engagedMs+=delta;if(running&&!document.hidden)runMs+=delta;
  for(const [el,o]of observed){const box=el.getBoundingClientRect(),visiblePixels=Math.max(0,Math.min(innerHeight,box.bottom)-Math.max(0,box.top));const visible=active&&visiblePixels>=Math.min(box.height,innerHeight)*.5&&!el.hidden&&!el.closest('[inert]')&&getComputedStyle(el).visibility!=='hidden';o.dwell=visible?o.dwell+delta:0;if(o.dwell<2000)continue;const p=project(el.dataset.project);if(p)emit('project_card_seen',{project:p},'exposure');else if(schema.contexts.section.includes(el.id))emit('section_engaged',{section:el.id},'exposure');}events.flush();},1000);
 window.addEventListener('portfolio-game',e=>{const d=e.detail;if(!d?.name||!d.props)return;if(d.name==='devrun_started'){events.startRun();running=true;runMs=0;}if(d.name==='devrun_paused')running=false;if(d.name==='devrun_resumed')running=true;if(['devrun_completed','devrun_exited'].includes(d.name)){emit('devrun_duration_bucket',{duration:durationBucket(runMs)},'engine');running=false;}emit(d.name,d.props,'engine');});
 let orientation=innerWidth>innerHeight?'landscape':'portrait';window.addEventListener('resize',()=>{const next=innerWidth>innerHeight?'landscape':'portrait';if(info.page==='devrun'&&next!==orientation){orientation=next;emit('devrun_orientation_changed',{orientation},'engine');}});
 document.addEventListener('visibilitychange',()=>{qa.note('lifecycle',{signal:'visibilitychange',visible:!document.hidden});entry('visibilitychange');});
 window.addEventListener('focus',()=>entry('focus'));
 window.addEventListener('blur',()=>qa.note('lifecycle',{signal:'blur',visible:!document.hidden}));
 document.addEventListener('DOMContentLoaded',()=>entry('dom-ready'),{once:true});
 window.addEventListener('load',()=>entry('load'),{once:true});
 window.addEventListener('pagehide',e=>{qa.note('lifecycle',{signal:'pagehide',persisted:e.persisted,visible:!document.hidden});if(e.persisted){events.flush();return;}if(events.playing){emit('devrun_duration_bucket',{duration:durationBucket(runMs)},'engine');emit('devrun_exited',{outcome:'abandoned'},'engine');}emit('page_leave',{duration:durationBucket(engagedMs)},'exposure');events.flush();clearInterval(tick);observer.disconnect();});
 window.addEventListener('pageshow',e=>{qa.note('lifecycle',{signal:'pageshow',persisted:e.persisted,visible:!document.hidden});events.synchronize();last=performance.now();entry('pageshow');});
 window.addEventListener('storage',e=>{if(e.key?.startsWith('mandalaw.analytics.')){events.synchronize();update();entry();}});
 window.addEventListener('error',e=>emit('error_occurred',{category:e.target&&e.target!==window?'resource':'script'},'exposure'),true);
 window.addEventListener('unhandledrejection',()=>emit('error_occurred',{category:'script'},'exposure'));
 entry('boot');update();
}
