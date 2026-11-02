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
