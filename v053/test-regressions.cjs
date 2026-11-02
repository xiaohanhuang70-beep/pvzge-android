const {test}=require('node:test');
const assert=require('node:assert/strict');
const {env,one,tap,mouse}=require('./test-env.cjs');
test('active settings inside battle takes priority, including real Node _components',async()=>{
 const s=env('inGameScene',{settings:true,nativeScroll:true});await s.flush();tap(s);await s.flush();assert.equal(mouse(s).length,0);
});
test('settings swipe cancels native button stream and uses one wheel route',async()=>{
 const s=env('worldMapScene',{settings:true,nativeScroll:true});await s.flush();
 s.fire('touchstart',one());s.fire('touchmove',one(50,110));s.fire('touchend',[],one(50,110));await s.flush();
 assert.equal(mouse(s).length,0);assert.equal(s.log.filter(e=>e.type==='wheel').length,1);assert.equal(s.log.filter(e=>e.type==='touchcancel').length,1);assert.ok(s.stops()>0);
});
test('garden waits for actual hover update before plant slot press',async()=>{
 const s=env('zenGardenScene');await s.flush();tap(s);assert.equal(mouse(s).filter(e=>e.type==='mousedown').length,0);
 await s.flush();assert.deepEqual(mouse(s).map(e=>e.type),['mousemove','mousemove','mousedown','mouseup']);
});
test('map swipe cannot become a dialogue click',async()=>{
 const s=env();await s.flush();s.fire('touchstart',one());s.fire('touchmove',one(120,60));s.fire('touchend',[],one(120,60));await s.flush();
 assert.equal(mouse(s).filter(e=>e.type==='mousedown').length,0);
});
test('touchcancel invalidates pending battle press immediately',async()=>{
 const s=env('inGameScene');await s.flush();s.fire('touchstart',one());s.fire('touchcancel',[],one());await s.flush();
 assert.equal(mouse(s).filter(e=>e.type==='mousedown').length,0);
});
test('blur releases held battle button and cancels queued placement',async()=>{
 const s=env('inGameScene');await s.flush();s.fire('touchstart',one());await s.flush();s.signal('blur');await s.flush();
 assert.equal(mouse(s).at(-1).type,'mouseup');
});
test('changing scenes during a tap prevents a stale click in the new scene',async()=>{
 const s=env();await s.flush();s.fire('touchstart',one());s.scene.name='StoreScene';s.fire('touchend',[],one());await s.flush();assert.equal(mouse(s).filter(e=>e.type==='mousedown').length,0);
});
test('drag placement requires real seed selection transition',async()=>{
 const s=env('inGameScene',{onMouse(e,{ui}){if(e.type==='mousedown'&&e.clientX===50)ui.index=0;}});await s.flush();
 s.fire('touchstart',one());await s.flush();s.fire('touchmove',one(300,200));s.fire('touchend',[],one(300,200));await s.flush();
 assert.deepEqual(mouse(s).filter(e=>e.type==='mousedown').map(e=>e.clientX),[50,300]);
});
test('successful plant removal exits original shovel state',async()=>{
 const s=env('inGameScene',{onMouse(e,state){if(e.type==='mousedown')state.remove();}});s.ui.index=-2;await s.flush();tap(s);await s.flush();assert.equal(s.ui.index,-1);
});
test('empty shovel action does not claim or force a successful removal',async()=>{
 const s=env('inGameScene');s.ui.index=-2;await s.flush();tap(s);await s.flush();assert.equal(s.ui.index,-2);
});
test('second finger cancels native button stream before garden pan',async()=>{
 const s=env('zenGardenScene');await s.flush();s.fire('touchstart',one());s.fire('touchstart',[[1,50,60],[2,100,60]],[[2,100,60]]);
 assert.ok(s.log.some(e=>e.type==='touchcancel'));assert.ok(s.stops()>0);
});
test('physical mouse remains usable but browser touch-generated duplicate is suppressed',async()=>{
 const s=env();await s.flush();let prevented=0,stopped=0;
 for(const touch of [false,true]){const e={sourceCapabilities:{firesTouchEvents:touch},preventDefault(){prevented++;},stopImmediatePropagation(){stopped++;}};(s.events.mousedown||[]).forEach(f=>f(e));}
 assert.equal(prevented,1);assert.equal(stopped,1);
});

test('world chooser horizontal swipe switches once and cancels native end activation',async()=>{
 const s=env('worldMapScene',{chooser:true});await s.flush();s.fire('touchstart',one(300,200));s.fire('touchmove',one(260,200));s.fire('touchmove',one(170,200));s.fire('touchend',[],one(170,200));await s.flush();
 assert.equal(s.log.filter(e=>e.type==='wheel').length,1);assert.equal(s.log.find(e=>e.type==='wheel').deltaY,120);assert.ok(s.log.some(e=>e.type==='touchcancel'));assert.equal(mouse(s).filter(e=>e.type==='mousedown').length,0);
});
test('desktop-only menu hover receives position without a premature press',async()=>{
 const s=env('StoreScene');await s.flush();s.fire('touchstart',one(100,90));s.fire('touchmove',one(140,90));assert.deepEqual(mouse(s).map(e=>[e.type,e.clientX]),[['mousemove',100],['mousemove',140]]);
});

test('unhandled dialogue tap advances actual controller state as a guarded fallback',async()=>{
 const npc={CurrentFlow:[{Action:'TALK'}],CurrentFlowStep:0,RunFlow(){this.CurrentFlowStep++;}};
 const s=env('worldMapScene',{npc});await s.flush();tap(s);await s.flush();assert.equal(npc.CurrentFlowStep,1);
});
test('native or mouse dialogue progression cannot be advanced a second time by fallback',async()=>{
 const npc={CurrentFlow:[{Action:'TALK'}],CurrentFlowStep:0,RunFlow(){this.CurrentFlowStep++;}};
 const s=env('worldMapScene',{npc,onMouse(e){if(e.type==='mousedown')npc.RunFlow();}});await s.flush();tap(s);await s.flush();assert.equal(npc.CurrentFlowStep,1);
});
test('world chooser falls back to its real movement API only if wheel leaves index unchanged',async()=>{
 const s=env('worldMapScene',{chooser:true});await s.flush();s.fire('touchstart',one(300,200));s.fire('touchmove',one(260,200));s.fire('touchend',[],one(200,200));await s.flush();assert.equal(s.chooser.currentI,1);
});
test('world chooser successful wheel route is never duplicated by state fallback',async()=>{
 const s=env('worldMapScene',{chooser:true,onMouse(e,{chooser}){if(e.type==='wheel')chooser.moveBy(1);}});await s.flush();s.fire('touchstart',one(300,200));s.fire('touchmove',one(260,200));s.fire('touchend',[],one(200,200));await s.flush();assert.equal(s.chooser.currentI,1);
});
test('world swipe does not switch during active narrative',async()=>{
 const npc={CurrentFlow:[{}],CurrentFlowStep:0,RunFlow(){throw Error('swipe must not progress narrative');}};
 const s=env('worldMapScene',{chooser:true,npc});await s.flush();s.fire('touchstart',one(300,200));s.fire('touchmove',one(260,200));s.fire('touchend',[],one(200,200));await s.flush();assert.equal(s.chooser.currentI,0);
});
test('visible narrative line cannot arm native or simulated world entry',async()=>{
 const npc={CurrentFlow:[{Lines:'a real line'},{Lines:'next'}],CurrentFlowStep:1,CurrentNPC:{},RunFlow(){this.CurrentFlowStep++;}};
 const s=env('worldMapScene',{chooser:true,npc,onMouse(e,{chooser}){if(e.type==='mouseup')chooser.entering=true;}});await s.flush();tap(s);await s.flush();
 assert.equal(npc.CurrentFlowStep,2);assert.equal(s.chooser.entering,false);assert.equal(mouse(s).filter(e=>e.type==='mousedown').length,0);assert.ok(s.stops()>0);
});
test('world swipe does not repeat a selection already changed by native start',async()=>{
 let initial=true;const s=env('worldMapScene',{chooser:true,onMouse(e,{chooser}){if(e.type==='mousemove'&&initial){initial=false;chooser.moveBy(1);}}});await s.flush();s.fire('touchstart',one(300,200));s.fire('touchmove',one(260,200));s.fire('touchend',[],one(200,200));await s.flush();assert.equal(s.chooser.currentI,1);
});
