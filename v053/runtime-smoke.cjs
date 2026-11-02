// Actual bundled game in Chromium touch emulation. Uses fresh, disposable
// browser storage. Scene setup uses real game APIs; gestures use CDP touches.
// This is not an Android WebView/device test.
const {chromium}=require('playwright');const fs=require('node:fs');const {spawn}=require('node:child_process');
(async()=>{
 const out=process.env.GE_RESULTS||'v053-results';fs.mkdirSync(out,{recursive:true});
 const report={environment:'Chromium touch emulation, fresh isolated browser storage; no Android device',checks:[],errors:[]};
 const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1','--directory','/tmp/ge-runtime'],{stdio:'ignore'});
 let browser,page;
 function check(name,passed,detail={}){report.checks.push({name,passed,...detail});console.log('RUNTIME_CHECK',JSON.stringify(report.checks.at(-1)));if(!passed)process.exitCode=1;}
 try{
  browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1280,height:720},hasTouch:true,isMobile:true});page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text().slice(0,400));});
  await page.addInitScript({path:__dirname+'/ge-mobile-input.js'});
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>!!window.System?.import&&!!document.getElementById('GameCanvas'),{},{timeout:150000});
  await page.evaluate(async()=>{window.__GE_TEST_CC__=await System.import('cc');});
  await page.waitForFunction(()=>window.__GE_TEST_CC__.director.getScene()?.name==='mainScene',{},{timeout:150000});
  check('Actual game mainScene boot',true);
  const cdp=await context.newCDPSession(page);
  async function gesture(points){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points[0].map(([x,y],id)=>({x,y,id}))});
   for(const step of points.slice(1)){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:step.map(([x,y],id)=>({x,y,id}))});await page.waitForTimeout(35);}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(400);
  }
  async function scene(name,api){
   await page.evaluate(async api=>{const k=System.get('chunks:///_virtual/KeyListener.ts').KeyListener;await k[api]();},api);
   await page.waitForFunction(name=>window.__GE_TEST_CC__.director.getScene()?.name===name,name,{timeout:90000});
  }
  // Translate actual UI world coordinates using Cocos view's own scale/viewport.
  async function location(kind){return page.evaluate(async kind=>{
   const cc=await System.import('cc');const garden=System.get('chunks:///_virtual/zenGardenScene.ts')?.zenGardenScene?.component;
   const world=System.get('chunks:///_virtual/worldMapScene.ts')?.worldMapScene?.component;
   const settings=world?.settingWindow?.getComponent(System.get('chunks:///_virtual/SettingWindow.ts').SettingWindow);
   const node=kind==='settings'?settings.scrollView.node:garden[kind+'UI'].node;
   const p=node.worldPosition,r=document.getElementById('GameCanvas').getBoundingClientRect(),canvas=document.getElementById('GameCanvas'),v=cc.view.getViewportRect();
   return {x:r.left+(p.x*cc.view.getScaleX()+v.x)/canvas.width*r.width,y:r.bottom-(p.y*cc.view.getScaleY()+v.y)/canvas.height*r.height};
  },kind);}
  await page.evaluate(async()=>{const cc=await System.import('cc');window.__geNativeTouchCount=0;cc.input.on(cc.Input.EventType.TOUCH_START,()=>window.__geNativeTouchCount++);});
  await page.touchscreen.tap(640,360);await page.waitForTimeout(300);
  const count=await page.evaluate(()=>window.__geNativeTouchCount);check('Native Cocos TOUCH_START from touchscreen',count>=1,{count});
  report.modules=await page.evaluate(()=>['UI','Mouse','worldMapScene','zenGardenScene','SettingWindow','NPC_Controller','KeyListener'].map(n=>({name:n,exports:Object.keys(System.get('chunks:///_virtual/'+n+'.ts')||{})})));
  await page.screenshot({path:out+'/runtime-main.png'});
  await scene('worldMapScene','GoToWorldmap');await page.waitForTimeout(2200);
  const npcState=()=>page.evaluate(()=>{const n=System.get('chunks:///_virtual/NPC_Controller.ts')?.npc_controller;return {step:n?.CurrentFlowStep,length:n?.CurrentFlow?.length,blocked:!!n?.CurrentNPC?.UnSkippable};});
  const before=await npcState();let after=before;
  if(before.length>0){for(let i=0;i<6;i++){await page.touchscreen.tap(640,400);await page.waitForTimeout(700);after=await npcState();if(after.step>before.step||after.length===0)break;}check('Actual Dave world-map dialogue advances by touch',after.step>before.step||after.length===0,{before,after});}
  else check('Actual Dave world-map dialogue advances by touch',false,{reason:'No initial tutorial flow available; cannot validate this scenario',before});
  await page.screenshot({path:out+'/runtime-world.png'});
  // End the tutorial only in this fresh CI fixture, to access settings/garden.
  await page.evaluate(()=>{const n=System.get('chunks:///_virtual/NPC_Controller.ts').npc_controller;n.CurrentFlow=[];n.npcs.forEach(x=>{x.node.active=false;});const w=System.get('chunks:///_virtual/worldMapScene.ts').worldMapScene.component;w.settingWindow.active=true;});
  await page.waitForTimeout(700);
  const getOffset=()=>page.evaluate(()=>{const w=System.get('chunks:///_virtual/worldMapScene.ts').worldMapScene.component;const s=w.settingWindow.getComponent(System.get('chunks:///_virtual/SettingWindow.ts').SettingWindow);return {y:s.scrollView.getScrollOffset().y,max:s.scrollView.getMaxScrollOffset().y};});
  const pos=await location('settings'),offsetBefore=await getOffset();
  await gesture(Array.from({length:10},(_,i)=>[[pos.x,pos.y+100-i*22]]));const offsetAfter=await getOffset();
  check('Actual SettingWindow ScrollView single finger scroll',Math.abs(offsetAfter.y-offsetBefore.y)>5,{offsetBefore,offsetAfter,pos});
  const twoBefore=await getOffset();await gesture(Array.from({length:8},(_,i)=>[[pos.x-40,pos.y+60-i*15],[pos.x+40,pos.y+60-i*15]]));const twoAfter=await getOffset();
  check('Actual SettingWindow two finger wheel compatibility',Math.abs(twoAfter.y-twoBefore.y)>5,{twoBefore,twoAfter});
  await page.screenshot({path:out+'/runtime-settings.png'});
  await page.evaluate(()=>{const a=System.get('chunks:///_virtual/PlayerProperties.ts').AllPlayerProperties;a.getTutorialProps().zengarden_intro=true;});
  await scene('zenGardenScene','GoToZenGarden');
  await page.waitForFunction(()=>{const cc=window.__GE_TEST_CC__,g=System.get('chunks:///_virtual/zenGardenScene.ts')?.zenGardenScene?.component;return g?.currentZen?.initialized&&g.shovelUI?.node?.hasEventListener(cc.Node.EventType.MOUSE_DOWN);},{},{timeout:90000});
  for(const tool of ['shovel','glove','cart']){
   const p=await location(tool);await page.touchscreen.tap(p.x,p.y);await page.waitForTimeout(400);
   const state=await page.evaluate(()=>{const g=System.get('chunks:///_virtual/zenGardenScene.ts').zenGardenScene.component;return {shovel:g.isShoveling,glove:g.isGloving,cart:g.isCarting};});
   check('Actual original garden '+tool+' button state by touch',!!state[tool],{state,p});
  }
  const camera=()=>page.evaluate(()=>{const g=System.get('chunks:///_virtual/zenGardenScene.ts').zenGardenScene.component;return {scale:g.scale,x:g.pos.x,y:g.pos.y};});
  const zoomBefore=await camera();await gesture(Array.from({length:10},(_,i)=>[[580-i*10,350],[700+i*10,350]]));const zoomAfter=await camera();
  check('Actual garden pinch changes camera scale',zoomAfter.scale>zoomBefore.scale,{zoomBefore,zoomAfter});
  const panBefore=await camera();await gesture(Array.from({length:10},(_,i)=>[[500+i*10,350+i*5],[650+i*10,350+i*5]]));const panAfter=await camera();
  check('Actual garden two finger pan changes camera position',Math.hypot(panAfter.x-panBefore.x,panAfter.y-panBefore.y)>1,{panBefore,panAfter});
  await page.screenshot({path:out+'/runtime-garden.png'});
  report.completed=true;
 }catch(e){report.completed=false;report.failure=String(e);process.exitCode=1;}
 finally{if(page){try{await page.screenshot({path:out+'/runtime-final.png'});report.finalScene=await page.evaluate(async()=>(await System.import('cc')).director.getScene()?.name);}catch(_){}}if(browser)await browser.close();server.kill();fs.writeFileSync(out+'/runtime-report.json',JSON.stringify(report,null,2));console.log('RUNTIME_REPORT',JSON.stringify(report));}
})();
