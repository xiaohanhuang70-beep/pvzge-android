const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function env(name='worldMapScene',options={}) {
 const events={},winEvents={},frames=[],log=[];let stops=0;
 const scene={name,active:true,_components:[],children:[]};
 if(options.settings){const node={parent:scene,active:true,activeInHierarchy:true,children:[],_components:[]};
 node._components.push({_class:'SettingWindow',enabled:true,node,scrollView:options.nativeScroll?{enabled:true}:null});scene.children.push(node);}
 if(options.chooser)scene._components.push({_class:'WorldMapChooser',enabled:true,node:scene});
 const ui={index:-1,gameStarted:true,paused:false,tryChangingIndex(i){this.index=i;}};
 let plants=[{}];const cell={getAllPlants:()=>plants};
 const cc={director:{getScene:()=>scene},js:{getClassName:c=>c._class||''}};
 const canvas={style:{},addEventListener(t,fn){(events[t]??=[]).push(fn);},removeEventListener(){},dispatchEvent(e){log.push(e);options.onMouse?.(e,{ui,cell,remove(){plants=[];}});return true;}};
 class MouseEvent{constructor(type,o){this.type=type;Object.assign(this,o);}}
 class TouchEvent extends MouseEvent{}
 const window={requestAnimationFrame(fn){frames.push(fn);},addEventListener(t,fn){(winEvents[t]??=[]).push(fn);},
 System:{import:async()=>cc,get(m){return m.endsWith('/UI.ts')?{UIInGame:{component:ui}}:m.endsWith('/Mouse.ts')?{Mouse:{mouseInLnC:cell}}:undefined;}}};
 const document={hidden:false,documentElement:{},getElementById:()=>canvas,addEventListener(t,fn){(winEvents[t]??=[]).push(fn);}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/ge-mobile-input.js','utf8'),{window,document,MouseEvent,WheelEvent:MouseEvent,TouchEvent,console,MutationObserver:class{observe(){}}});
 const point=([identifier,clientX,clientY])=>({identifier,clientX,clientY,screenX:clientX,screenY:clientY});
 function fire(type,touches,changed=touches){const e={type,touches:touches.map(point),changedTouches:changed.map(point),cancelable:true,preventDefault(){},stopPropagation(){stops++;},stopImmediatePropagation(){stops++;}};(events[type]||[]).forEach(f=>f(e));return e;}
 async function flush(){for(let i=0;i<80;i++){await new Promise(setImmediate);frames.splice(0).forEach(f=>f());}}
 return {scene,ui,cell,log,fire,flush,canvas,events,stops:()=>stops,signal(t){(winEvents[t]||[]).forEach(f=>f());}};
}
const one=(x=50,y=60)=>[[1,x,y]];
function tap(s,x=50,y=60){s.fire('touchstart',one(x,y));s.fire('touchend',[],one(x,y));}
const mouse=s=>s.log.filter(e=>/mouse/.test(e.type));

module.exports={env,one,tap,mouse};
