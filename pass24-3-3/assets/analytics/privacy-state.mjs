export const STATES=Object.freeze(['UNDECIDED','ACCEPTED','DECLINED','WITHDRAWN','PRIVACY_SIGNAL_SUPPRESSED']);
export const CHOICE_KEY='mandalaw.analytics.choice.v1',SESSION_KEY='mandalaw.analytics.session.v2',BROWSER_KEY='mandalaw.analytics.browser.v1',QA_KEY='mandalaw.analytics.qa.v1';
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const idleLimit=30*60*1000,sessionLimit=24*60*60*1000,choiceLimit=180*86400000;
// PostHog session aggregation requires UUIDv7. Random bits come only from crypto.
export function sessionUUID(now,random=crypto.randomUUID()){
 const time=Math.floor(now).toString(16).padStart(12,'0');
 return `${time.slice(0,8)}-${time.slice(8)}-7${random.slice(15,18)}-${random.slice(19)}`;
}
export class PrivacyState {
 constructor({storage,session,signals=()=>({}),clock=()=>Date.now(),uuid=()=>crypto.randomUUID(),changed=()=>{}}={}){
  Object.assign(this,{storage,session,signals,clock,uuid,changed});this.state='UNDECIDED';this.epoch=0;this.id=null;this.last=0;this.started=0;this.revision=0;this.initial=true;this.sequence=0;this.refresh();this.initial=false;
 }
 read(){try{const c=JSON.parse(this.storage.getItem(CHOICE_KEY));return c&&['ACCEPTED','DECLINED','WITHDRAWN'].includes(c.state)&&Number.isFinite(c.at)&&this.clock()-c.at<choiceLimit&&this.clock()>=c.at?c:null;}catch{return null;}}
 blocked(){const s=this.signals();return !!(s.gpc||s.dnt);}
 refresh(){
  if(this.id&&(this.clock()-this.last>=idleLimit||this.clock()-this.started>=sessionLimit||this.clock()<this.last)){this.epoch++;this.clearSession();this.changed(this.state);}
  const c=this.read(),next=this.failedChoice?'UNDECIDED':this.blocked()?'PRIVACY_SIGNAL_SUPPRESSED':c?.state||'UNDECIDED',revision=c?.at||0;
  if(next!==this.state||revision!==this.revision){this.state=next;this.revision=revision;this.epoch++;if(!(this.initial&&next==='ACCEPTED'))this.clearSession();this.changed(next);}
  if(next!=='ACCEPTED')this.clearIdentifiers();
  if(next==='PRIVACY_SIGNAL_SUPPRESSED'&&c?.state==='ACCEPTED')this.write('WITHDRAWN');
  return this.state;
 }
 write(state){try{this.storage.setItem(CHOICE_KEY,JSON.stringify({state,at:this.clock()}));return true;}catch{return false;}}
 choose(state){if(!['ACCEPTED','DECLINED','WITHDRAWN'].includes(state))return false;if(!this.write(state)){this.failedChoice=true;this.state='UNDECIDED';this.epoch++;this.clearIdentifiers();this.changed(this.state);return false;}this.failedChoice=false;this.refresh();return this.state==='ACCEPTED';}
 clearSession(){this.id=null;this.last=0;this.started=0;this.sequence=0;try{this.session.removeItem(SESSION_KEY);this.session.removeItem('mandalaw.analytics.session.v1');}catch{}}
 clearIdentifiers(){this.clearSession();try{this.storage.removeItem(BROWSER_KEY);this.session.removeItem(QA_KEY);}catch{}}
 allowed(){return this.refresh()==='ACCEPTED';}
 browserId(){
  if(!this.allowed())return null;
  try{const saved=JSON.parse(this.storage.getItem(BROWSER_KEY));if(saved?.revision===this.revision&&uuidPattern.test(saved.id))return saved.id;
   const id=this.uuid();this.storage.setItem(BROWSER_KEY,JSON.stringify({id,revision:this.revision}));return id;
  }catch{return this.sessionId();}
 }
 sessionId(){
  if(!this.allowed())return null;const now=this.clock();
  if(!this.id){try{const s=JSON.parse(this.session.getItem(SESSION_KEY));if(s?.revision===this.revision&&uuidPattern.test(s.id)&&s.id[14]==='7'&&now-s.at<idleLimit&&now>=s.at&&Number.isFinite(s.started)&&now-s.started<sessionLimit&&now>=s.started){this.id=s.id;this.last=s.at;this.started=s.started;this.sequence=Number.isInteger(s.sequence)?s.sequence:0;}}catch{}}
  if(!this.id){this.id=sessionUUID(now,this.uuid());this.started=now;this.sequence=0;}this.last=now;
  try{this.session.setItem(SESSION_KEY,JSON.stringify({id:this.id,at:now,started:this.started,revision:this.revision,sequence:this.sequence}));}catch{}return this.id;
 }
 nextSequence(){this.sequence++;this.sessionId();return this.sequence;}
 qa(){try{return this.allowed()&&this.session.getItem(QA_KEY)==='yes';}catch{return false;}}
 setQA(value){if(!this.allowed())return false;try{if(value)this.session.setItem(QA_KEY,'yes');else this.session.removeItem(QA_KEY);this.epoch++;this.clearSession();this.changed(this.state);return true;}catch{return false;}}
}
