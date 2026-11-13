#!/usr/bin/env python3
from pathlib import Path
import sys
root=Path(sys.argv[1] if len(sys.argv)>1 else '.')
for rel,old,new in [('app/build.gradle.kts','applicationIdSuffix = ".nativev053"','applicationIdSuffix = ".test0166"'),('app/src/main/AndroidManifest.xml','GE 全场景触控测试 v0.5.3','GE v0.16.6 触控范围3x3测试')]:
 p=root/rel;s=p.read_text();assert s.count(old)==1,rel+' exact v053 identity required';p.write_text(s.replace(old,new,1))
