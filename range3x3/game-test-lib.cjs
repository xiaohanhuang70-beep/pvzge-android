// Calls extracted shipped functions, with controlled scene services for Node tests.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function makeLibrary(source){
 function chunk(name){const a=source.indexOf('System.register("chunks:///_virtual/'+name+'.ts"');assert.ok(a>=0,name);const b=source.indexOf('System.register(',a+20);return source.slice(a,b<0?undefined:b);}
 function expr(name,marker){const s=chunk(name),a=s.indexOf(marker);assert.ok(a>=0,marker);const start=a+marker.length,open=s.indexOf('{',start);let depth=0;for(let i=open;i<s.length;i++){if(s[i]==='{')depth++;if(s[i]==='}'&&--depth===0)return s.slice(start,i+1);}throw Error('Unclosed function');}
 function fn(name,marker,ctx={},named=false){return vm.runInNewContext('('+(named?'function':'')+expr(name,marker)+')',ctx);}
 class Vec{constructor(x=0,y=0){this.x=x;this.y=y;}}
 class Size{constructor(width=0,height=0){this.width=width;this.height=height;}}
 const D=fn('CharacterManager','function D',{},true);
 const Rectangle=fn('CharacterManager','t("Rectangle",',{h:Vec,D})();
 class Damage{constructor(damage){this.damage=damage;}}
 class Poison{constructor(DPS=0,duration=0){this.DPS=DPS;this.duration=duration;}isValid(){return this.DPS>0&&this.duration>0;}}
 const SplashDamage=fn('commonShot','ve=e("SplashDamage",',{d:Size,R:Poison})();
 return {chunk,fn,Rectangle,Vec,Size,Damage,Poison,SplashDamage};
}
function objects(tree,result=[]){if(tree&&typeof tree==='object'){if(tree.objclass&&tree.aliases)result.push(tree);Object.values(tree).forEach(x=>objects(x,result));}return result;}
module.exports={makeLibrary,objects};
