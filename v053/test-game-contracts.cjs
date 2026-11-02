// Execute functions extracted from the actual shipped game, never rewritten copies.
// Scene services/animations are controlled dependencies: these are contract tests,
// not evidence of successful end-to-end Android play.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync(process.env.GE_GAME_MAIN||'game-main.js','utf8');
function chunk(name){const prefix='System.register("chunks:///_virtual/'+name+'.ts"';const a=source.indexOf(prefix);assert.ok(a>=0,name+' exists');const b=source.indexOf('System.register(',a+prefix.length);return source.slice(a,b<0?undefined:b);}
function fn(name,marker,context={}){
 const s=chunk(name),a=s.indexOf(marker);assert.ok(a>=0,marker+' exists in '+name);
 const start=a+marker.length,open=s.indexOf('{',start);let depth=0,end=0;
 for(let i=open;i<s.length;i++){if(s[i]==='{')depth++;if(s[i]==='}'&&--depth===0){end=i+1;break;}}
 assert.ok(end>start);return vm.runInNewContext('('+s.slice(start,end)+')',context);
}
test('actual worldMap MouseDown advances actual NPC flow step and dialogue action',()=>{
 const npc={CurrentFlow:[{Character:'Dave',Action:'TALK',Lines:'test line'}],CurrentFlowStep:0,npcs:[],DiscardOtherNPC(){}};
 let line=null;npc.npcs=[{NPC_Name:'Dave',enabled:true,node:{active:true},NPC_ReadAction(action){line=action.Lines;}}];
 npc.RunFlow=fn('NPC_Controller','c.RunFlow=',{P:{clearGameTips(){}}});
 const down=fn('worldMapScene','u.MouseDown=',{D:npc});down({});assert.equal(npc.CurrentFlowStep,1);assert.equal(line,'test line');
});
test('actual dialogue does not skip unskippable animation',()=>{
 const npc={CurrentFlow:[{Character:'Dave',Action:'TALK'}],CurrentFlowStep:0,CurrentNPC:{UnSkippable:true},npcs:[]};
 npc.RunFlow=fn('NPC_Controller','c.RunFlow=',{P:{clearGameTips(){}}});fn('worldMapScene','u.MouseDown=',{D:npc})({});assert.equal(npc.CurrentFlowStep,0);
});
for(const tool of ['shovel','glove','cart'])test('actual garden '+tool+' toggles original tool state and icon',()=>{
 const states={shovel:'isShoveling',glove:'isGloving',cart:'isCarting'};
 const garden={isShoveling:false,isGloving:false,isCarting:false,willMovePlantSlot:null,plantInCart:null,currentZen:{judgeSelection(){}},shovelUI:{select(){}},gloveUI:{select(){}},cartUI:{select(){}}};
 const ctx={N:{playShovelActive(){},playCardCancel(){},playCardChosen(){},playRightButtonCancel(){}}};
 for(const n of ['shovel','glove','cart','indexTo_1'])garden[n]=fn('zenGardenScene','u.'+n+'=',ctx);
 garden[tool]();assert.equal(garden[states[tool]],true);assert.equal(garden[tool+'UI'].index,1);
 garden[tool]();assert.equal(garden[states[tool]],false);assert.equal(garden[tool+'UI'].index,0);
});
test('actual lawn left press routes selected seed to placement',()=>{
 let planted=0;const ui={index:0,component:{MouseListenOffThisTick:false}},cell={index:1,isInLawn:()=>true,PlaceUIPlant(){planted++;}};
 fn('LnC','r.onMouseDown=',{m:ui,q:{gameStarted:true},h:{BUTTON_LEFT:0},v:{component:{readIndex(){}}}}).call(cell,{getButton:()=>0},true);
 assert.equal(planted,1);assert.equal(cell.index,0);
});
test('actual lawn left press routes original shovel selection to removal',()=>{
 let removed=0;const ui={index:-2,component:{MouseListenOffThisTick:false}},cell={index:1,isInLawn:()=>true,removePlant(){removed++;}};
 fn('LnC','r.onMouseDown=',{m:ui,q:{gameStarted:true},h:{BUTTON_LEFT:0},v:{component:{readIndex(){}}}}).call(cell,{getButton:()=>0},true);
 assert.equal(removed,1);assert.equal(cell.index,0);
});
test('actual world map native drag updates map offset through movement contract',()=>{
 let moved=null;const map={node:{worldScale:{x:1.5}},velocity:0,moveBy(x,y){moved=[x,y];}};
 fn('WorldMap','d.TouchMove=').call(map,{getDeltaX:()=>20});assert.equal(map.velocity,30);assert.deepEqual(moved,[30,0]);
});
test('actual setting scroll buttons use the ScrollView content offset',()=>{
 const offsets=[];const ctx={L:class{constructor(x,y){this.x=x;this.y=y;}}};
 const settings={scrollView:{getScrollOffset:()=>({y:500}),scrollToOffset(p,t){offsets.push([p.x,p.y,t]);}}};
 fn('SettingWindow','a.scrowUp=',ctx).call(settings);fn('SettingWindow','a.scrowDown=',ctx).call(settings);assert.deepEqual(offsets,[[0,100,.2],[0,900,.2]]);
});
