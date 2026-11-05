// Run after existing touch smoke in the same real bundled Cocos application.
// A disposable battle fixture invokes real plant launch and projectile impact
// against actual spawned Zombie components. Impact is forced; flight timing and
// tap-to-aim are explicitly not an end-to-end device test.
const fs=require('node:fs');
module.exports=async function(page,out){
 const report={environment:'Actual packaged Cocos in Chromium; fresh CI storage; real Plant/Projectile/Zombie components; forced impact',checks:[],completed:false};
 try{
  await page.evaluate(()=>{window.__geRangeError=null;System.get('chunks:///_virtual/KeyListener.ts').KeyListener.goToLevel(['egypt10'],[],false).catch(e=>window.__geRangeError=String(e));});
  await page.waitForFunction(()=>{const s=System.get('chunks:///_virtual/Square.ts')?.Square;return window.__geRangeError||window.__GE_TEST_CC__.director.getScene()?.name==='inGameScene'&&s?.component&&s.getLnC(2,4)?.plantPoint;},{},{timeout:90000});
  const setup=await page.evaluate(()=>({error:window.__geRangeError,scene:window.__GE_TEST_CC__.director.getScene()?.name,lanes:System.get('chunks:///_virtual/Square.ts').Square.LaneCount}));
  if(setup.error)throw Error(setup.error);report.setup=setup;
  await page.waitForTimeout(1500);
  for(const alias of ['banana','missiletoe'])for(const [row,col] of [[2,4],[0,0]]){
   const result=await page.evaluate(async({alias,row,col})=>{
    const S=System.get('chunks:///_virtual/Square.ts').Square,
      ZE=System.get('chunks:///_virtual/Zombies.ts').ZombieEnum,
      style=System.get('chunks:///_virtual/LnC.ts').LnCSpawnZombieStyleEnum,
      P=System.get('chunks:///_virtual/Projectiles.ts').PrjFunctions;
    const coords=[];for(let r=0;r<5;r++)for(let c=0;c<9;c++)if(Math.abs(r-row)<=2&&Math.abs(c-col)<=2)coords.push([r,c]);
    const actors=[];
    for(const [r,c] of coords){const z=(await S.getLnC(r,c).SpawnZombie(ZE.tutorial,style.appear,false))[0];if(!z)throw Error('Zombie spawn failed');z.health=10000;z.isIdling=true;z._isWalking=false;z.invincible=false;z.freeze=z.chill=0;z.__rangeHits=[];const damage=z.dealDamage;z.dealDamage=function(d){this.__rangeHits.push(d.damage);return damage.call(this,d);};actors.push({r,c,z});}
    const plant=await S.getLnC(4,0).SpawnPlantByType(alias,false,false,false,false);
    if(!plant)throw Error('Plant spawn failed '+alias);
    let flightPromise;const launch=P.throwOneBananaOnNode;
    P.throwOneBananaOnNode=function(...args){return flightPromise=launch.apply(this,args);};
    let shot;
    try{plant.specialSniperPlantTrigger(S.getLnC(row,col));if(!flightPromise)throw Error('Real plant did not launch');shot=await flightPromise;}finally{P.throwOneBananaOnNode=launch;}
    const flight={height:shot.height,verticalVelocity:shot.bodyLinearVelocity,marker:shot.__geRange3x3,cooldown:plant.coolingdown,splashes:shot.splashDamages.map(s=>({damage:s.splashDamage,width:s.splashRange.width,height:s.splashRange.height,chill:s.chillDuration,freeze:s.freezeDuration}))};
    // The level is still in seed-selection mode. Its real bodyRecReal getter
    // intentionally hides every collider until gameStarted; activate this
    // disposable fixture through the original state setter, then let the real
    // objects calculate their own colliders and lane registration.
    const level=System.get('chunks:///_virtual/levelController.ts').LevelPlay;
    level.gameStarted=true;
    for(const {z} of actors){z.bodyRecHiddenCD=0;z.judgeInLnC();z.setBodyRec();}
    shot.judgeInLnC();
    const collision={gameStarted:level.gameStarted,lane:shot.lIndex,column:shot.cIndex,pools:S.getAllLane().map(l=>l.zombiePool().length),target:{x:shot.worldPositionX,y:shot.worldPositionY},boardFirst:S.getSquareWorldPosition(0,0),boardLast:S.getSquareWorldPosition(4,8)};
    // Actual floor collision entry point, not a substitute damage algorithm.
    shot.height=0;shot.hitFloor(0);
    const damageResult=actors.map(({r,c,z})=>({r,c,health:z.health,hits:z.__rangeHits.slice(),chill:z.chill,freeze:z.freeze,inside:Math.abs(r-row)<=1&&Math.abs(c-col)<=1}));
    actors.forEach(({z})=>z.node.destroy());plant.node.destroy();
    return {alias,row,col,flight,collision,actors:damageResult};
   },{alias,row,col});
   result.passed=result.flight.marker===true&&result.flight.height===1000&&result.flight.verticalVelocity===-12&&result.actors.every(z=>z.health===(z.inside?8800:10000)&&JSON.stringify(z.hits)===JSON.stringify(z.inside?[1200]:[])&&(alias!=='missiletoe'||(z.inside?z.freeze>=4.9&&z.chill>=4.9:z.freeze===0&&z.chill===0)));
   report.checks.push(result);console.log('RANGE_RUNTIME_CHECK',JSON.stringify(result));
   await page.waitForTimeout(100);
  }
  report.completed=true;
  await page.screenshot({path:out+'/range-runtime-battle.png'});
 }catch(e){report.failure=String(e);console.log('RANGE_RUNTIME_FAILURE',String(e));}
 finally{report.passed=report.completed&&report.checks.length===4&&report.checks.every(x=>x.passed);fs.writeFileSync(out+'/range-runtime-report.json',JSON.stringify(report,null,2));console.log('RANGE_RUNTIME_REPORT',JSON.stringify(report));}
 return report;
};
