#!/usr/bin/env python3
"""Fail-closed incremental patch for the pinned GE v0.16.6 bundle only."""
import copy, hashlib, json, os, shutil, sys, zipfile
from pathlib import Path
MAIN='assets/main/index.js'
PROPS='assets/resources/import/e8/e8720a22-e52e-45f4-a860-df34a0f1c62e.json'
ALMANAC='assets/resources/import/79/7900744c-0325-4680-a641-811617384636.json'
PLANTS='assets/resources/import/07/076885ea-a5d2-4501-bd14-7c3f00e110c5.json'
TYPES='assets/resources/import/43/43ce6243-1dd7-4a2e-9f3a-576c4f4fa614.json'
# v0.16.6 app-release.apk. Projectile/almanac/plant/type JSON hashes match v0.16.1;
# assets/main/index.js was re-minified and is the only fingerprint that moved.
ORIGINAL_APK_SHA256='1d2dfeb835be404d39dd80835a5b5c0fc332e5a22efcf14b28209326667849ed'
HASHES={MAIN:'b5f3a24126c7753d2cb510bc625df8bf6f1cfe7aa5309a228e75127bf9e6c9d8',PROPS:'d656b8f20d9dbc8263ced607adf23d1fa10ed5d0a123d3b53f98ae610fd5d65a',ALMANAC:'9b9196a96b4b292f667d56d7d0521cc270bcada15b1e862c5f81c725e1c5c886',PLANTS:'b9075eb8c76b19cfaebd3f0c43c8226db7b18745850e2b38e4737d40a5e422f6',TYPES:'9054b4489445abd0a5d6bf9489569a6e65d2377d5d3bd9975f10b11e63d21c15'}
TARGETS={'banana':1200,'banana1':2200,'banana2':3200,'missiletoe':1200,'missiletoe1':2200,'missiletoe2':3200}
def sha(data):return hashlib.sha256(data).hexdigest()
def require(ok,msg):
 if not ok:raise ValueError('PATCH REFUSED: '+msg)
def objects(o):
 if isinstance(o,dict):
  if 'objclass' in o and 'aliases' in o:yield o
  for v in o.values():yield from objects(v)
 elif isinstance(o,list):
  for v in o:yield from objects(v)
def compact(o):return json.dumps(o,ensure_ascii=False,separators=(',',':'))
def replace_once(s,old,new,label):
 require(s.count(old)==1,f'{label}: expected exactly one anchor, found {s.count(old)}')
 return s.replace(old,new,1)
def patch_main(data):
 s=data.decode();start=s.index('System.register("chunks:///_virtual/Projectiles.ts"');end=s.index('System.register(',start+20)
 chunk=s[start:end]
 anchor='(_=e.sent).worldPosition=new c(t.x,t.y),_.height=a,p=0'
 changed=replace_once(chunk,anchor,'(_=e.sent).__geRange3x3=/^(banana|missiletoe)[12]?$/.test(o),_.worldPosition=new c(t.x,t.y),_.height=a,p=0','PrjFunctions.throwOneBananaOnPos')
 s=s[:start]+changed+s[end:]
 start=s.index('System.register("chunks:///_virtual/commonShot.ts"');end=s.index('System.register(',start+20);chunk=s[start:end]
 # v0.16.6 rebinds this function: rectangle is r via O.createRectangleCenter,
 # lane arrays start at l, and the board helper is F (Square), not I.
 anchor='e.splashRange.height*F.SquareHeight),l=[],h=[],c=[];F.getAllLane()'
 # Only these projectiles are clipped. Existing object de-duplication and all
 # damage/effect callbacks below remain byte-identical.
 new='''e.splashRange.height*F.SquareHeight),l=[],h=[],c=[];if(this.__geRange3x3){var geFirst=F.getSquareWorldPosition(0,0),geLast=F.getSquareWorldPosition(F.MaxLaneIndex,F.MaxColumnIndex),geLeft=Math.max(this.worldPositionX-e.splashRange.width*F.SquareWidth/2,geFirst.x-F.SquareWidth/2),geRight=Math.min(this.worldPositionX+e.splashRange.width*F.SquareWidth/2,geLast.x+F.SquareWidth/2),geBottom=Math.max(this.inLane.midY-e.splashRange.height*F.SquareHeight/2,geLast.y-F.SquareHeight/2),geTop=Math.min(this.inLane.midY+e.splashRange.height*F.SquareHeight/2,geFirst.y+F.SquareHeight/2);if(geRight<=geLeft||geTop<=geBottom)return;r=O.createRectangleCenter(new y((geLeft+geRight)/2,(geBottom+geTop)/2),geRight-geLeft,geTop-geBottom)}F.getAllLane()'''
 chunk=replace_once(chunk,anchor,new,'commonShot.dealSplashDamageForEach')
 return (s[:start]+chunk+s[end:]).encode()
def plan(data):
 for name,digest in HASHES.items():require(sha(data[name])==digest,name+' original SHA256 mismatch')
 result={MAIN:patch_main(data[MAIN])};s=data[PROPS].decode();allobjs=list(objects(json.loads(s)))
 for alias,damage in TARGETS.items():
  matches=[o for o in allobjs if alias in o['aliases'] and o['objclass']=='ProjectileProperties'];require(len(matches)==1,alias+' projectile identity')
  old=matches[0];new=copy.deepcopy(old);splashes=new['objdata']['SplashDamage'];require(splashes[0]=={'Damage':damage,'Range':{'w':3,'h':1}},alias+' damage/range signature')
  require(len(splashes)==(2 if alias.startswith('missiletoe') else 1),alias+' splash profile count')
  if alias.startswith('missiletoe'):
   duration=5*(1+(int(alias[-1]) if alias[-1].isdigit() else 0))
   require(splashes[1]=={'ChillDuration':duration,'FreezeDuration':duration,'Range':{'w':3,'h':3}},alias+' original status signature')
  splashes[0]['Range']['h']=3
  s=replace_once(s,compact(old),compact(new),alias+' exact JSON object')
 result[PROPS]=s.encode();s=data[ALMANAC].decode();allobjs=list(objects(json.loads(s)))
 for alias in ['banana','missiletoe']:
  matches=[o for o in allobjs if alias in o['aliases'] and o['objclass']=='PlantAlmanacProperties'];require(len(matches)==1,alias+' almanac identity')
  old=matches[0];new=copy.deepcopy(old);area=[o for o in new['objdata']['Elements'] if o['TYPE']=='AREA'];require(len(area)==1 and area[0]['SORT']=={'en':'1x3','zh':'1x3范围'},alias+' almanac AREA')
  area[0]['SORT']={'en':'3x3','zh':'3x3范围'};s=replace_once(s,compact(old),compact(new),alias+' almanac exact JSON object')
 result[ALMANAC]=s.encode();return result

def apply(bundle,out):
 bundle=Path(bundle);out=Path(out);out.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(bundle) as z:
  names=z.namelist();require(len(names)==len(set(names)),'duplicate ZIP entries')
  data={name:z.read(name) for name in HASHES};patched=plan(data)
  for name,value in data.items():
   path=out/'original'/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(value)
  report={'base_commit':'57086999f3d7a946ad6978cd6e2230b837ee4310','game_resources':'v0.16.6','original_apk_sha256':ORIGINAL_APK_SHA256,'changed':{name:{'before':sha(data[name]),'after':sha(value)} for name,value in patched.items()},'entry_count':len(names),'unchanged_entries_verified':0}
  temp=bundle.with_suffix('.range.tmp');manifest={}
  try:
   with zipfile.ZipFile(temp,'w') as dest:
    dest.comment=z.comment
    for info in z.infolist():
     digest=hashlib.sha256()
     with dest.open(copy.copy(info),'w') as target:
      if info.filename in patched:
       value=patched[info.filename];target.write(value);digest.update(value)
      else:
       with z.open(info) as source:
        while chunk:=source.read(1024*1024):target.write(chunk);digest.update(chunk)
       report['unchanged_entries_verified']+=1
     manifest[info.filename]=digest.hexdigest()
   with zipfile.ZipFile(temp) as check:require(check.testzip() is None,'patched ZIP CRC failure')
   os.replace(temp,bundle)
  finally:
   if temp.exists():temp.unlink()
 for name,value in patched.items():
  path=out/'patched'/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(value)
 (out/'resource-manifest.json').write_text(json.dumps(manifest,indent=2))
 (out/'range-patch-report.json').write_text(json.dumps(report,indent=2))
 print(json.dumps(report,indent=2))
if __name__=='__main__':apply(sys.argv[1],sys.argv[2] if len(sys.argv)>2 else 'v053-results')
