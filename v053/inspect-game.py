from pathlib import Path
import zipfile,re,json,hashlib
bundle=Path('app/src/main/assets/pvzge_web.zip')
out=Path('v053-results');out.mkdir(exist_ok=True)
with zipfile.ZipFile(bundle) as z:
 source=z.read('assets/main/index.js')
 (out/'game-main.js').write_bytes(source)
 s=source.decode()
 audit=[]
 for chunk in re.split(r'(?=System.register\()',s):
  name=re.match(r'System.register\("([^"\n]+)"',chunk)
  if not name:continue
  events={n:chunk.count(n) for n in ['TOUCH_START','TOUCH_MOVE','TOUCH_END','TOUCH_CANCEL','MOUSE_DOWN','MOUSE_UP','MOUSE_MOVE','MOUSE_WHEEL'] if n in chunk}
  if events:audit.append({'module':name[1],'events':events})
 report={'main_sha256':hashlib.sha256(source).hexdigest(),'source_bytes':len(source),'input_modules':audit,'scope':'Static event audit. Counts do not prove gameplay correctness.'}
 (out/'input-audit.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
 print('ACTUAL_GAME_AUDIT',report['main_sha256'],len(audit),'modules')
 for r in audit:
  if any(n in r['module'] for n in ['worldMapScene','zenGardenScene','SettingWindow','UI.ts','LnC.ts','Mouse.ts','Store.ts','Almanac.ts','WorldMap.ts','ZenGarden.ts']):print(r)
