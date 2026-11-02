// Actual bundled Cocos/WebGL boot + native DOM touch smoke in Chromium.
// Does not certify Android WebView or all gameplay scenes.
const {chromium}=require('playwright');
const fs=require('node:fs');const {spawn}=require('node:child_process');const assert=require('node:assert/strict');
(async()=>{
 const out=process.env.GE_RESULTS||'v053-results';fs.mkdirSync(out,{recursive:true});
 const report={environment:'Desktop Chromium with touch emulation; no Android device',checks:[],errors:[]};
 const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1','--directory','/tmp/ge-runtime'],{stdio:'ignore'});
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1280,height:720},hasTouch:true,isMobile:true});const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text().slice(0,400));});
  await page.addInitScript({path:__dirname+'/ge-mobile-input.js'});
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(async()=>{try{const cc=await window.System?.import('cc');return !!cc?.director?.getScene?.();}catch(_){return false;}},{},{timeout:150000});
  report.checks.push({name:'Actual bundled Cocos scene boot',passed:true,scene:await page.evaluate(async()=>{const cc=await System.import('cc');return cc.director.getScene().name;})});
  // Observe native engine touch input from a real browser touchscreen event.
  await page.evaluate(async()=>{const cc=await System.import('cc');window.__geNativeTouchCount=0;cc.input.on(cc.Input.EventType.TOUCH_START,()=>window.__geNativeTouchCount++);});
  await page.touchscreen.tap(640,360);await page.waitForTimeout(200);
  const count=await page.evaluate(()=>window.__geNativeTouchCount);
  assert.ok(count>=1,'Cocos receives native touch');report.checks.push({name:'Native Cocos TOUCH_START from browser touchscreen',passed:true,count});
  report.modules=await page.evaluate(()=>['UI','Mouse','worldMapScene','zenGardenScene','SettingWindow','NPC_Controller'].map(n=>({name:n,exports:Object.keys(System.get('chunks:///_virtual/'+n+'.ts')||{})})));
  await page.screenshot({path:out+'/runtime-boot.png'});
  report.completed=true;
 }catch(e){report.completed=false;report.failure=String(e);process.exitCode=1;}
 finally{if(browser)await browser.close();server.kill();fs.writeFileSync(out+'/runtime-report.json',JSON.stringify(report,null,2));console.log('RUNTIME_REPORT',JSON.stringify(report));}
})();
