import copy, json, os, unittest
from pathlib import Path
from apply_range import HASHES, MAIN, PROPS, ALMANAC, TARGETS, objects, plan
class PatchTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  root=Path(os.environ['GE_BASE_ROOT']);cls.data={n:(root/n).read_bytes() for n in HASHES}
 def test_exact_changes_only(self):
  result=plan(self.data)
  self.assertEqual(set(result),{MAIN,PROPS,ALMANAC})
  old=list(objects(json.loads(self.data[PROPS])));new=list(objects(json.loads(result[PROPS])))
  self.assertEqual(len(old),len(new))
  for before,after in zip(old,new):
   expected=copy.deepcopy(before)
   if before['aliases'][0] in TARGETS:expected['objdata']['SplashDamage'][0]['Range']['h']=3
   self.assertEqual(after,expected)
  old=list(objects(json.loads(self.data[ALMANAC])));new=list(objects(json.loads(result[ALMANAC])))
  for before,after in zip(old,new):
   expected=copy.deepcopy(before)
   if before['aliases'][0] in ['banana','missiletoe']:
    for e in expected['objdata']['Elements']:
     if e['TYPE']=='AREA':e['SORT']={'en':'3x3','zh':'3x3范围'}
   self.assertEqual(after,expected)
 def test_all_fingerprints_fail_closed(self):
  for name in HASHES:
   with self.subTest(name=name):
    bad=self.data.copy();bad[name]+=b' '
    with self.assertRaisesRegex(ValueError,'SHA256 mismatch'):plan(bad)
 def test_unexpected_or_repeated_patch_refused(self):
  bad=self.data|plan(self.data)
  with self.assertRaisesRegex(ValueError,'SHA256 mismatch'):plan(bad)
 def test_other_modules_identical(self):
  before=self.data[MAIN].decode();after=plan(self.data)[MAIN].decode()
  def chunks(s):return {c.split('\"',1)[0]:c for c in s.split('System.register("')[1:]}
  a,b=chunks(before),chunks(after);self.assertEqual(set(a),set(b))
  changed={k for k in a if a[k]!=b[k]}
  self.assertEqual(changed,{'chunks:///_virtual/Projectiles.ts','chunks:///_virtual/commonShot.ts'})
if __name__=='__main__':unittest.main(verbosity=2)
