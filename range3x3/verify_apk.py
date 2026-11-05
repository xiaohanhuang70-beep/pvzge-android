"""Verify the complete packaged game against the build manifest, not filenames only."""
import hashlib,json,shutil,sys,zipfile
from pathlib import Path
apk,out,touch=map(Path,sys.argv[1:]);manifest=json.loads((out/'resource-manifest.json').read_text())
with zipfile.ZipFile(apk) as a:
 assert a.testzip() is None,'APK CRC failure'
 assert a.read('assets/ge-mobile-input.js')==touch.read_bytes(),'v053 touch script changed'
 with a.open('assets/pvzge_web.zip') as src,open('/tmp/ge-packaged-verify.zip','wb') as dst:shutil.copyfileobj(src,dst)
with zipfile.ZipFile('/tmp/ge-packaged-verify.zip') as z:
 assert set(z.namelist())==set(manifest),'resource names differ'
 for name,expected in manifest.items():
  digest=hashlib.sha256()
  with z.open(name) as f:
   while block:=f.read(1024*1024):digest.update(block)
  assert digest.hexdigest()==expected,'resource changed in APK: '+name
print(f'APK complete resource SHA256 verified: {len(manifest)} entries; v053 touch bytes unchanged')
(out/'apk-resource-verification.txt').write_text(f'PASS: all {len(manifest)} bundled entries SHA256 match; original v053 touch bytes match\n')
Path('/tmp/ge-packaged-verify.zip').unlink()
