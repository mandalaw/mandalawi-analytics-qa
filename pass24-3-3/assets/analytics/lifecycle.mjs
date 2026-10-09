// One document is one semantic initial view. A bfcache return keeps this instance;
// a real navigation/reload creates a new instance. No identifier is persisted here.
export class InitialView {
 constructor({allowed,visible,ready,enabled,initial,emit,observe=()=>{}}){
  Object.assign(this,{allowed,visible,ready,enabled,initial,emit,observe});
  this.recorded=new Set();this.pending=false;this.busy=false;
 }
 cancel(reason='privacy'){
  this.pending=false;this.observe('initial_cancelled',{reason});
 }
 reconcile(reason='entry'){
  if(this.busy)return this.recorded.size===this.initial.length;
  this.busy=true;
  try{
   const allowed=this.allowed(),enabled=this.enabled(),visible=this.visible(),ready=this.ready();
   if(!allowed||!enabled){this.pending=false;this.observe('initial_gate',{reason,allowed,enabled,visible,ready,pending:false,recorded:this.recorded.size});return false;}
   if(this.recorded.size===this.initial.length){this.pending=false;return true;}
   this.pending=true;
   this.observe('initial_gate',{reason,allowed,enabled,visible,ready,pending:true,recorded:this.recorded.size});
   if(!visible||!ready)return false;
   for(const item of this.initial){
    if(this.recorded.has(item.name))continue;
    // Recheck between aliases: withdrawal or a visibility change wins.
    if(!this.allowed()||!this.enabled()){this.pending=false;return false;}
    if(!this.visible()||!this.ready())return false;
    const queued=this.emit(item.name,item.props||{});
    this.observe('initial_capture',{event:item.name,queued});
    if(!queued)return false;
    this.recorded.add(item.name);
   }
   this.pending=false;
   this.observe('initial_recorded',{count:this.recorded.size});
   return true;
  }finally{this.busy=false;}
 }
}
