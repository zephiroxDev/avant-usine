from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[2]
path = root / 'work/github-sync-import/audio-edits-19v06.js'
backup = root / 'outputs/20-0/avant-modification/work/github-sync-import/audio-edits-19v06.js'
backup.parent.mkdir(parents=True, exist_ok=True)
if not backup.exists():
    shutil.copy2(path, backup)
source = path.read_text(encoding='utf-8')
start, end = source.index('function editor('), source.index('\nconst api=')
replacement = (root / 'work/github-sync-import/audio-editor-20.js').read_text(encoding='utf-8')
path.write_text(source[:start] + replacement + source[end:], encoding='utf-8')
print('Visual audio editor connected to existing trim/fade engine, draft and publication flow.')
