const {test}=require('node:test');
const assert=require('node:assert/strict');
const {env,one,tap,mouse}=require('./test-env.cjs');
test('active settings inside battle takes priority, including real Node _components',async()=>{
 const s=env('inGameScene',{settings:true,nativeScroll:true});await s.flush();tap(s);await s.flush();assert.equal(mouse(s).length,0);
});
test('native ScrollView single drag does not also receive a wheel scroll',async()=>{
 const s=env('worldMapScene',{settings:true,nativeScroll:true});await s.flush();
 s.fire('touchstart',one());s.fire('touchmove',one(50,110));s.fire('touchend',[],one(50,110));await s.flush();
 assert.equal(s.log.length,0);assert.equal(s.stops(),0);
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
