import zipfile,re,json
from pathlib import Path
with zipfile.ZipFile('app/src/main/assets/pvzge_web.zip') as z:
    for n in z.namelist():
        if not n.endswith('.js'): continue
        s=z.read(n).decode('utf-8',errors='replace')
        if not re.search(r'shovel|Shovel',s): continue
        print('GAME_SCRIPT',n,'bytes',len(s))
        matches=list(re.finditer(r'shovel|Shovel|TOUCH_START|TOUCH_END|MOUSE_DOWN',s))
        for m in matches[:40]:print('STATE_CONTEXT',json.dumps(s[max(0,m.start()-180):m.end()+250]))
        # Capture complete modules around the shovel rather than inferring from DOM mouse events.
        chunks=re.split(r'(?=System.register\()',s)
        for chunk in chunks:
            if re.search(r'shovel|Shovel',chunk):
                print('GAME_MODULE',chunk[:30000])

# Extract and execute the actual shipped lawn mouse handler with controlled dependencies.
import subprocess
with zipfile.ZipFile('app/src/main/assets/pvzge_web.zip') as z:
    source=z.read('assets/main/index.js').decode('utf-8')
chunk=next(x for x in re.split(r'(?=System.register\()',source) if x.startswith('System.register("chunks:///_virtual/LnC.ts"'))
start=chunk.index('r.onMouseDown=function(')+len('r.onMouseDown=')
brace=chunk.index('{',start); depth=0; end=None
for i in range(brace,len(chunk)):
    if chunk[i]=='{':depth+=1
    elif chunk[i]=='}':
        depth-=1
        if depth==0:end=i+1;break
fn=chunk[start:end]
script='const assert=require("node:assert/strict");let removed=0;const m={index:-2,component:{MouseListenOffThisTick:false}},q={gameStarted:true},h={BUTTON_LEFT:0},v={component:{readIndex(){}}};const fn=('+fn+');const cell={index:1,isInLawn(){return true},removePlant(){removed++}};fn.call(cell,{getButton(){return 0}},true);assert.equal(removed,1);assert.equal(cell.index,0);console.log("ACTUAL_GAME_TEST: shipped LnC.onMouseDown dispatches left-button shovel at index -2");'
subprocess.run(['node','-e',script],check=True)
