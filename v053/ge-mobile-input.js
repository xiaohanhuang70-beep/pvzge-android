/* GE v0.5.3 cross-scene input adapter, based on the uploaded experiment.
 * Native Cocos single touches remain available to Buttons/ScrollViews/map.
 * Desktop-only interactions receive one ordered LEFT mouse stream; garden
 * two-finger gestures use its existing MIDDLE pan/wheel zoom. No overlay.
 * Engine selection and plant counts gate battle drag placement/shovel exit.
 * This is an experimental compatibility layer, not gameplay certification.
 */
(() => {
 'use strict';
 if(window.__GE_TOUCH_V053__)return;
 window.__GE_TOUCH_V053__=true;
 let canvas=null,cc=null,connecting=false,primary=null,multi=false;
 let held=false,middleHeld=false,heldPoint=null,lastMid=null,lastDistance=0;
 let generation=0,queue=Promise.resolve(),sendingCancel=false,lastTouches=[];
 const types=['touchstart','touchmove','touchend','touchcancel'];
 const raf=window.requestAnimationFrame?.bind(window)|| (f=>Promise.resolve().then(f));
 async function frame(){await new Promise(r=>raf(r));await new Promise(r=>raf(r));}
 const point=t=>({x:t.clientX,y:t.clientY,sx:t.screenX,sy:t.screenY});
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function connect(){
  if(cc||connecting||!window.System?.import)return;
  connecting=true;
  Promise.resolve(window.System.import('cc')).then(v=>{cc=v;})
   .catch(e=>console.warn('[GE v053] engine import unavailable',e)).finally(()=>{connecting=false;});
 }
 function module(name){try{return window.System?.get?.('chunks:///_virtual/'+name+'.ts');}catch(_){return null;}}
 function active(node){for(let n=node;n;n=n.parent)if(n.active===false||n.activeInHierarchy===false)return false;return true;}
 function components(node){return node.components||node._components||node.getComponents?.(cc.Component)||[];}
 function findComponent(scene,pattern){
  const nodes=[scene];let count=0;
  while(nodes.length&&count++<4000){const node=nodes.shift();if(!node||!active(node))continue;
   for(const comp of components(node)){
    const name=cc?.js?.getClassName?.(comp)||comp.constructor?.name||'';
    if(comp.enabled!==false&&pattern.test(name))return comp;
   }
   if(node.children)nodes.push(...node.children);
  }
  return null;
 }
 function mode(){
  connect();const scene=cc?.director?.getScene?.(),name=String(scene?.name||'');
  // Overlays take precedence even when paused over an inGameScene.
  const settings=scene&&findComponent(scene,/^SettingWindow$/i);
  if(settings)return {kind:'settings',scene,name,nativeScroll:!!settings.scrollView&&settings.scrollView.enabled!==false};
  if(/^worldMapScene$/i.test(name)&&findComponent(scene,/^WorldMapChooser$/i))return {kind:'chooser',scene,name};
  return {kind:/^inGameScene$/i.test(name)?'battle':/^zenGardenScene$/i.test(name)?'garden':'other',scene,name};
 }
 function sameScene(s){const now=mode();return s.scene===now.scene&&s.name===now.name&&s.kind===now.kind;}
 function engine(){
  const ui=module('UI')?.UIInGame?.component,cell=module('Mouse')?.Mouse?.mouseInLnC;
  if(!ui||!ui.gameStarted||ui.paused)return null;
  return {ui,cell,index:ui.index,count:cell?.getAllPlants?.().length??null};
 }
 function mouse(type,p,button=0,buttons=0){
  if(!canvas||!p)return;
  canvas.dispatchEvent(new MouseEvent(type,{view:window,bubbles:true,cancelable:true,clientX:p.x,clientY:p.y,screenX:p.sx,screenY:p.sy,button,buttons}));
 }
 function wheel(p,dx,dy){if(canvas&&p&&(Math.abs(dx)>=.5||Math.abs(dy)>=.5))canvas.dispatchEvent(new WheelEvent('wheel',{view:window,bubbles:true,cancelable:true,clientX:p.x,clientY:p.y,deltaX:dx,deltaY:dy,deltaMode:0}));}
 function later(action,delay=false){const token=generation;queue=queue.then(async()=>{if(token!==generation)return;if(delay)await frame();if(token===generation)await action(token);}).catch(e=>console.warn('[GE v053] dispatch',e));}
 function release(){if(held)mouse('mouseup',heldPoint,0,0);if(middleHeld)mouse('mouseup',lastMid,1,0);held=false;middleHeld=false;}
 function abort(){generation++;queue=Promise.resolve();release();primary=null;multi=false;lastMid=null;lastDistance=0;heldPoint=null;}
 function cancelNative(touches){
  if(!canvas||!touches.length||typeof TouchEvent==='undefined')return;
  sendingCancel=true;
  try{canvas.dispatchEvent(new TouchEvent('touchcancel',{bubbles:true,cancelable:true,touches:[],targetTouches:[],changedTouches:Array.from(touches)}));}
  catch(e){console.warn('[GE v053] native cancel unavailable',e);}
  finally{sendingCancel=false;}
 }
 async function inspect(before,s,token){
  await frame();if(token!==generation||!sameScene(s))return null;
  const after=engine();
  if(before&&after&&before.ui===after.ui&&before.index===-2&&after.index===-2&&before.cell&&before.cell===after.cell&&before.count!==null&&after.count<before.count){
   after.ui.tryChangingIndex(-1);console.info('[GE v053] confirmed shovel removal; exited selection');
  }
  return after;
 }
 function changed(e,id){for(const t of Array.from(e.changedTouches||[]))if(t.identifier===id)return point(t);return null;}
 function pair(touches){const a=point(touches[0]),b=point(touches[1]);return {mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2,sx:(a.sx+b.sx)/2,sy:(a.sy+b.sy)/2},distance:distance(a,b)};}
 function startMulti(e){
  // A gesture cannot also finish a pressed native Button/ScrollView child.
  cancelNative(e.touches);generation++;queue=Promise.resolve();release();primary=null;multi=true;
  const info=pair(e.touches);lastMid=info.mid;lastDistance=info.distance;
  if(mode().kind==='garden'){mouse('mousemove',lastMid,1,0);mouse('mousedown',lastMid,1,4);middleHeld=true;}
 }
 function moveMulti(e){
  if(e.touches.length<2)return;
  const info=pair(e.touches),p=info.mid;
  if(!lastMid){lastMid=p;lastDistance=info.distance;return;}
  if(middleHeld){mouse('mousemove',p,1,4);const pinch=info.distance-lastDistance;if(Math.abs(pinch)>.8)wheel(p,0,-pinch*3);}
  else wheel(p,(lastMid.x-p.x)*2,(lastMid.y-p.y)*2);
  lastMid=p;lastDistance=info.distance;
 }
 function touch(e){
  if(sendingCancel)return;
  if(e.cancelable)e.preventDefault();
  const type=e.type;lastTouches=Array.from(e.touches||[]);
  if(type==='touchcancel'){abort();return;}
  if(type==='touchstart'&&e.touches.length>=2){e.stopPropagation?.();if(!multi)startMulti(e);return;}
  if(multi){e.stopPropagation?.();if(type==='touchmove')moveMulti(e);if(type==='touchend'&&e.touches.length===0)abort();return;}
  if(type==='touchstart'){
   if(primary||e.touches.length!==1)return;
   const t=e.changedTouches[0],p=point(t),s={...mode(),id:t.identifier,first:p,last:p,moved:false,before:null,selected:null};primary=s;
   // Menus use a completed tap: a swipe/multi-touch must not trigger NPC or tools.
   // Battle starts on press to retain card selection and pointer following.
   if(s.kind==='battle'){
    later(()=>{if(sameScene(s))mouse('mousemove',p);});
    later(async token=>{if(!sameScene(s))return;s.before=engine();held=true;heldPoint=p;mouse('mousedown',p,0,1);s.selected=await inspect(s.before,s,token);},true);
   }else if(s.kind!=='settings')mouse('mousemove',p);
   return;
  }
  if(!primary)return;
  const s=primary,p=changed(e,s.id);if(!p)return;
  if(!sameScene(s)){abort();return;}
  const prev=s.last;s.last=p;s.moved=s.moved||distance(s.first,p)>=12;
  if(s.consumeNative)e.stopPropagation?.();
  if(type==='touchmove'){
   if(s.kind==='chooser'&&Math.abs(p.x-s.first.x)>=24){
    if(!s.consumeNative){cancelNative(e.touches);s.consumeNative=true;}
    e.stopPropagation?.();mouse('mousemove',p);
   }else if(s.kind==='settings'){
    // In the shipped settings, native drag did not change ScrollView offset.
    // Once vertical intent is clear, cancel native UI press before wheel fallback.
    const dy=p.y-s.first.y,dx=p.x-s.first.x;
    if(s.scrolling||(Math.abs(dy)>=12&&Math.abs(dy)>Math.abs(dx)*1.2)){
     if(!s.scrolling){cancelNative(e.touches);s.scrolling=true;s.consumeNative=true;}
     e.stopPropagation?.();wheel(p,0,(prev.y-p.y)*2);
    }
   }else if(s.kind==='battle')later(()=>{if(sameScene(s)){heldPoint=p;mouse('mousemove',p,0,held?1:0);}});
   else mouse('mousemove',p);
   return;
  }
  if(type==='touchend'){
   if(s.kind==='battle'){
    later(()=>{if(sameScene(s)){heldPoint=p;mouse('mousemove',p,0,held?1:0);}});
    later(async token=>{
     if(!sameScene(s))return;
     mouse('mouseup',p);held=false;heldPoint=null;
     const current=engine();
     if(s.moved&&s.before&&s.selected&&current&&current.ui===s.before.ui&&s.before.index!==s.selected.index&&s.selected.index>=0&&s.selected.index<=8&&current.index===s.selected.index&&current.cell){
      await frame();if(token!==generation||!sameScene(s))return;
      const before=engine();held=true;heldPoint=p;mouse('mousedown',p,0,1);await inspect(before,s,token);
      if(token===generation){mouse('mouseup',p);held=false;heldPoint=null;}
     }
    },true);
   }else if(s.kind==='chooser'&&s.consumeNative){
    // WorldMapChooser listens only to wheel and changes one world per event.
    wheel(p,0,-Math.sign(p.x-s.first.x)*120);
   }else if(s.kind!=='settings'&&!s.moved){
    later(()=>{if(sameScene(s))mouse('mousemove',p);});
    later(()=>{if(sameScene(s)){held=true;heldPoint=p;mouse('mousedown',p,0,1);}},true);
    later(()=>{if(sameScene(s)){mouse('mouseup',p);held=false;heldPoint=null;}},true);
   }
   primary=null;
  }
 }
 function nativeMouse(e){if(e.sourceCapabilities?.firesTouchEvents){e.preventDefault();e.stopImmediatePropagation();}}
 function install(target){
  if(!target||canvas===target)return;
  if(canvas){types.forEach(t=>canvas.removeEventListener(t,touch,true));['mousemove','mousedown','mouseup'].forEach(t=>canvas.removeEventListener(t,nativeMouse,true));}
  abort();canvas=target;canvas.style.touchAction='none';
  types.forEach(t=>canvas.addEventListener(t,touch,{capture:true,passive:false}));
  ['mousemove','mousedown','mouseup'].forEach(t=>canvas.addEventListener(t,nativeMouse,true));
  console.info('[GE v053] native touch + scene/state-aware compatibility installed');
 }
 function find(){const t=document.getElementById('GameCanvas');if(t)install(t);}
 function suspend(){cancelNative(lastTouches);lastTouches=[];abort();}
 window.addEventListener?.('blur',suspend);window.addEventListener?.('pagehide',suspend);
 document.addEventListener?.('visibilitychange',()=>{if(document.hidden)suspend();});
 connect();find();
 if(window.setInterval){let attempts=0;const timer=window.setInterval(()=>{connect();if(cc||++attempts>=120)window.clearInterval(timer);},200);}
 if(typeof MutationObserver!=='undefined')new MutationObserver(find).observe(document.documentElement||document,{childList:true,subtree:true});
})();
