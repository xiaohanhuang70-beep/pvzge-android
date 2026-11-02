const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync(__dirname + '/ge-mobile-input.js', 'utf8');
function setup(simulate = null) {
  const log = []; const listeners = {}; const frames = [];
  let nativeCalls = 0;
  const canvas = {style:{}, addEventListener(type, fn){ (listeners[type] ??= []).push(fn); },
    removeEventListener(type, fn) {listeners[type]=(listeners[type]||[]).filter(f=>f!==fn);},
    dispatchEvent(event){ log.push(event); if(simulate) simulate.event(event); return true; }};
  const win = {requestAnimationFrame(fn){frames.push(fn);}, System: simulate && {get:simulate.get}};
  const doc = {documentElement:{},getElementById(id){ return id === 'GameCanvas' ? canvas:null; }};
  function MouseEvent(type, options){Object.assign(this,options);this.type=type;}
  class MutationObserver { observe() {} }
  vm.runInNewContext(source,{window:win,document:doc,MouseEvent,MutationObserver,console});
  function fire(type, ids, changed) {
    const event={type,touches:ids.map(([id,x,y])=>({identifier:id,clientX:x,clientY:y,screenX:x,screenY:y})),
      changedTouches:changed.map(([id,x,y])=>({identifier:id,clientX:x,clientY:y,screenX:x,screenY:y})),
      cancelable:true,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){throw Error('must not suppress Cocos touch');}};
    for(const fn of listeners[type]||[])fn(event);
    nativeCalls++;return event;
  }
  async function flush(){for(let i=0;i<50;i++){await new Promise(setImmediate);while(frames.length) frames.shift()();} await new Promise(setImmediate);}
  return {log,fire,flush,canvas,nativeCalls:()=>nativeCalls};
}
test('one-finger fast tap: hover then down then release without right click',async()=>{
 const s=setup();s.fire('touchstart',[[0,120,95]],[[0,120,95]]);s.fire('touchend',[],[[0,120,95]]);await s.flush();
 assert.deepEqual(s.log.map(e=>e.type),['mousemove','mousedown','mousemove','mouseup']);
 assert.equal(s.log.find(e=>e.type==='mousedown').clientX,120);
 assert.equal(s.log.find(e=>e.type==='mouseup').clientY,95);
 assert.equal(s.canvas.style.touchAction,'none');
});
test('drag sends hover and pressed mouse movement to lawn position',async()=>{
 const s=setup();s.fire('touchstart',[[11,60,40]],[[11,60,40]]);s.fire('touchmove',[[11,340,250]],[[11,340,250]]);s.fire('touchend',[],[[11,370,260]]);await s.flush();
 assert.deepEqual(s.log.map(e=>e.type),['mousemove','mousedown','mousemove','mousemove','mouseup']);
 assert.equal(s.log.at(-1).clientX,370);
});
test('second finger never sends right click',async()=>{
 const s=setup();s.fire('touchstart',[[11,60,40]],[[11,60,40]]);s.fire('touchstart',[[11,60,40],[12,90,40]],[[12,90,40]]);s.fire('touchend',[[12,90,40]],[[11,65,40]]);await s.flush();
 assert.ok(s.log.every(e=>e.button===0));
});
test('touch event remains available to Cocos native event listeners',async()=>{
 const s=setup(); const e=s.fire('touchstart',[[1,23,77]],[[1,23,77]]);await s.flush();
 assert.equal(e.defaultPrevented,true); assert.equal(s.nativeCalls(),1);
 assert.ok(!s.log.some(x=>x.type==='contextmenu'));
});

function game() {
 const cell={plants:2,getAllPlants(){return Array(this.plants)}};
 const ui={index:-1,gameStarted:true,paused:false,tryChangingIndex(n){this.index=n}};
 const mouse={mouseInLnC:null}; let placements=0;
 return {ui,cell,mouse,placements:()=>placements,
 get(id){return id.endsWith('/UI.ts')?{UIInGame:{component:ui}}:{Mouse:mouse}},
 event(e){if(e.type==='mousemove')mouse.mouseInLnC=e.clientY>100?cell:null;
 if(e.type==='mousedown'){if(e.clientY<100)ui.index=0;else if(ui.index===-2)cell.plants--;else if(ui.index===0){placements++;ui.index=-1}}}};
}
test('engine-selected seed drag issues separate lawn placement',async()=>{
 const g=game(),s=setup(g);s.fire('touchstart',[[1,60,40]],[[1,60,40]]);s.fire('touchmove',[[1,300,250]],[[1,300,250]]);s.fire('touchend',[],[[1,300,250]]);await s.flush();assert.equal(g.placements(),1);
});
test('confirmed Cocos removal exits shovel; empty cell does not',async()=>{
 const g=game();g.ui.index=-2;const s=setup(g);s.fire('touchstart',[[1,300,250]],[[1,300,250]]);s.fire('touchend',[],[[1,300,250]]);await s.flush();assert.equal(g.cell.plants,1);assert.equal(g.ui.index,-1);
});
