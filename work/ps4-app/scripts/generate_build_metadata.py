from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[1]
release=json.loads((root/'release.json').read_text())
version=release['version'].split('-',1)[0]
assert re.fullmatch(r'(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)',version)
target=root/'build/alus_build_version.h';target.parent.mkdir(parents=True,exist_ok=True)
target.write_text('#pragma once\n#define ALUS_VERSION '+json.dumps(version)+'\n')
