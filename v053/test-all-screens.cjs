const {test}=require('node:test');
const assert=require('node:assert/strict');
const {env,one,tap,mouse}=require('./test-env.cjs');
for(const name of ['worldMapScene','zenGardenScene','StoreScene','AlmanacScene','mainScene','awardScene']){
 test(name+' completed single tap supplies exactly one left press',async()=>{
  const s=env(name);await s.flush();tap(s,120,90);await s.flush();
  assert.equal(mouse(s).filter(e=>e.type==='mousedown').length,1);
  assert.equal(mouse(s).filter(e=>e.type==='mouseup').length,1);
  assert.ok(mouse(s).every(e=>e.button===0));assert.equal(s.stops(),0);
 });
}
test('battle fast tap keeps hover before frame before press and release',async()=>{
 const s=env('inGameScene');await s.flush();tap(s);assert.equal(s.log.length,0);await s.flush();
 assert.deepEqual(mouse(s).map(e=>e.type),['mousemove','mousedown','mousemove','mouseup']);
});
test('battle motion without card state transition cannot double-plant',async()=>{
 const s=env('inGameScene');await s.flush();s.fire('touchstart',one());s.fire('touchmove',one(300,200));s.fire('touchend',[],one(300,200));await s.flush();
 assert.equal(mouse(s).filter(e=>e.type==='mousedown').length,1);
});
test('settings fallback without native ScrollView receives single finger wheel',async()=>{
 const s=env('mainScene',{settings:true});await s.flush();s.fire('touchstart',one());s.fire('touchmove',one(50,20));s.fire('touchend',[],one(50,20));await s.flush();
 assert.equal(mouse(s).length,0);assert.equal(s.log[0].type,'wheel');assert.equal(s.log[0].deltaY,80);
});
test('settings button tap receives no duplicate synthetic mouse',async()=>{
 const s=env('mainScene',{settings:true,nativeScroll:true});await s.flush();tap(s);await s.flush();assert.equal(s.log.length,0);assert.equal(s.stops(),0);
});
test('hidden settings does not suppress map tap',async()=>{
 const s=env('worldMapScene',{settings:true});s.scene.children[0].active=false;await s.flush();tap(s);await s.flush();assert.equal(mouse(s).filter(e=>e.type==='mousedown').length,1);
});
test('two finger menu scrolling keeps wheel compatibility',async()=>{
 const s=env();await s.flush();s.fire('touchstart',[[1,100,100],[2,200,100]]);s.fire('touchmove',[[1,100,160],[2,200,160]]);s.fire('touchend',[],[[1,100,160],[2,200,160]]);await s.flush();
 assert.equal(s.log.filter(e=>e.type==='wheel')[0].deltaY,-120);assert.equal(mouse(s).length,0);
});
test('garden two finger camera pan uses middle button and releases it',async()=>{
 const s=env('zenGardenScene');await s.flush();s.fire('touchstart',[[1,100,100],[2,200,100]]);s.fire('touchmove',[[1,120,110],[2,220,110]]);s.fire('touchend',[],[[1,120,110],[2,220,110]]);await s.flush();
 assert.deepEqual(mouse(s).map(e=>[e.type,e.button,e.buttons]),[['mousemove',1,0],['mousedown',1,4],['mousemove',1,4],['mouseup',1,0]]);
});
test('garden pinch emits zoom wheel and no right button',async()=>{
 const s=env('zenGardenScene');await s.flush();s.fire('touchstart',[[1,100,100],[2,200,100]]);s.fire('touchmove',[[1,80,100],[2,220,100]]);s.fire('touchend',[],[[1,80,100],[2,220,100]]);await s.flush();
 assert.equal(s.log.filter(e=>e.type==='wheel')[0].deltaY,-120);assert.ok(mouse(s).every(e=>e.button!==2));
});
test('remaining finger after multi cannot click but fresh tap works',async()=>{
 const s=env('zenGardenScene');await s.flush();s.fire('touchstart',[[1,10,10],[2,40,10]]);s.fire('touchend',one(10,10),[[2,40,10]]);s.fire('touchmove',one(15,10));s.fire('touchend',[],one(15,10));await s.flush();s.log.length=0;tap(s);await s.flush();assert.equal(mouse(s).filter(e=>e.type==='mousedown').length,1);
});
