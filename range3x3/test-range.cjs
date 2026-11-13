// Real GE damage/conversion/rectangle functions; fake enemies only record damage/effects.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {makeLibrary,objects}=require('./game-test-lib.cjs');
const main=fs.readFileSync(process.env.GE_GAME_MAIN,'utf8'),lib=makeLibrary(main);
const props=objects(JSON.parse(fs.readFileSync(path.join(process.env.GE_RESOURCE_ROOT,'assets/resources/import/e8/e8720a22-e52e-45f4-a860-df34a0f1c62e.json'),'utf8')));
const {fn,Rectangle,Vec,Damage,SplashDamage}=lib,SW=68,SH=80.77;
function run(alias,row=2,col=4,duplicate=false){
 const hits=[];
 function enemy(r,c,w=10){return {r,c,hp:10000,hits:[],chill:[],freeze:[],bodyRecReal:Rectangle.createRectangleCenter(new Vec(300+c*SW,500-r*SH),w,10),setChill(x){this.chill.push(x);},setFreeze(x){this.freeze.push(x);},dealDamage(d){this.hits.push(d.damage);this.hp-=d.damage;},isAlive(){return this.hp>0;}};}
 const enemies=Array.from({length:5},(_,r)=>Array.from({length:9},(_,c)=>enemy(r,c))).flat();
 // Ghost objects in a valid row pool but beyond the board prove edge clipping.
 const ghosts=[enemy(row,-1),enemy(row,9)];enemies.push(...ghosts);
 const wide=enemy(row,col,SW*2.6);enemies.push(wide);
 const lanes=Array.from({length:5},(_,r)=>({LaneIndex:r,midY:500-r*SH,zombiePool(){return enemies.filter(e=>e.r===r||duplicate&&e===wide);},hypnoZombiePool(){return[];},tombPool(){return[];}}));
 const square={SquareWidth:SW,SquareHeight:SH,MaxLaneIndex:4,MaxColumnIndex:8,getAllLane:()=>lanes,getSquareWorldPosition:(r,c)=>new Vec(300+c*SW,500-r*SH)};
 const shot={__geRange3x3:true,worldPositionX:300+col*SW,inLane:lanes[row],lIndex:row,objdataOwn:{IgnoreTombstones:false},damageScale:1,havePeaBuff:false,damage:1200,killedZombiesOneHit:[],dealsSplashToPlants:()=>false,onDamageOnZombie(){}};
 // v0.16.6 commonShot bindings: O=Rectangle, F=Square, E=ZombieDamageDetails, z=ZombieDamageType.
 const ctx={O:Rectangle,y:Vec,F:square,E:Damage,z:{fire:1},W:{kongfu_TNT:99}};
 shot.dealDamageToZombie=fn('commonShot','h.dealDamageToZombie=',ctx);
 shot.dealSplashDamageForEach=fn('commonShot','h.dealSplashDamageForEach=',ctx);
 shot.splashDamages=props.find(p=>p.aliases.includes(alias)).objdata.SplashDamage.map(p=>SplashDamage.fromPP(p));
 shot.defaultDealSplashDamage=fn('commonShot','h.defaultDealSplashDamage=',{L:{plant:1}});
 shot.defaultDealSplashDamage();
 return {enemies,wide,ghosts,shot};
}
for(const [alias,damage] of [['banana',1200],['banana1',2200],['banana2',3200],['missiletoe',1200],['missiletoe1',2200],['missiletoe2',3200]]){
 test(alias+' actual splash covers all nine cells with full original damage',()=>{const {enemies}=run(alias);for(const e of enemies.filter(e=>e.c>=0&&e.c<=8)){const inside=Math.abs(e.r-2)<=1&&Math.abs(e.c-4)<=1;if(e.c===4&&e.r===2&&e.bodyRecReal.prjX().y-e.bodyRecReal.prjX().x>20)continue;assert.deepEqual(e.hits,inside?[damage]:[],`cell ${e.c},${e.r}`);}});
 for(const [r,c] of [[0,0],[0,8],[4,0],[4,8]])test(alias+` corner ${c},${r} ignores outside board`,()=>{const {enemies,ghosts,wide}=run(alias,r,c);for(const e of enemies.filter(e=>e!==wide)){const inside=e.c>=0&&e.c<=8&&Math.abs(e.r-r)<=1&&Math.abs(e.c-c)<=1;assert.deepEqual(e.hits,inside?[damage]:[],`cell ${e.c},${e.r}`);}assert.ok(ghosts.every(e=>!e.hits.length));});
 test(alias+' multi-cell enemy repeated in lane pools receives damage once',()=>{const {wide}=run(alias,2,4,true);assert.deepEqual(wide.hits,[damage]);});
 if(alias.startsWith('missiletoe'))test(alias+' original freeze and chill remain on all nine cells',()=>{const {enemies}=run(alias);const duration=alias==='missiletoe'?5:alias==='missiletoe1'?10:15;for(const e of enemies.filter(e=>e.c>=0&&e.c<=8)){const inside=Math.abs(e.r-2)<=1&&Math.abs(e.c-4)<=1;assert.deepEqual(e.chill,inside?[duration]:[]);assert.deepEqual(e.freeze,inside?[duration]:[]);}});
}
