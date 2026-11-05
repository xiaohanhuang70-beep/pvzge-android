# Extend only the disposable CI test harness, leaving all v053 repository files intact.
from pathlib import Path
p=Path('/tmp/ge-v053/runtime-smoke.cjs');s=p.read_text();anchor='  report.completed=true;';assert s.count(anchor)==1
s=s.replace(anchor,"  await require('/tmp/ge-range/runtime-range.cjs')(page,out);\n"+anchor);p.write_text(s)
