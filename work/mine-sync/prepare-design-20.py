from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[2]
source = root / 'work/github-sync-import'
backup = root / 'outputs/20-0/avant-modification'


def edit(path, changes):
    text = path.read_text(encoding='utf-8')
    original = text
    for old, new in changes:
        if old not in text:
            if new in text:
                continue
            raise RuntimeError('Missing anchor in ' + str(path) + ': ' + old[:80])
        text = text.replace(old, new, 1)
    if text != original:
        saved = backup / path.relative_to(root)
        if not saved.exists():
            saved.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, saved)
        path.write_text(text, encoding='utf-8')


edit(source / 'index.html', [
    ('<link rel="stylesheet" href="./neon-industrial.css">', '<link rel="stylesheet" href="./neon-industrial.css">\n<link rel="stylesheet" href="./design-20.css">'),
    ('<script src="./interface-layout.js" defer></script>', '<script src="./interface-layout.js" defer></script>\n<script src="./design-20.js" defer></script>'),
])
edit(source / 'app-17v01.js', [
    ("function lyricsBackgroundVisibility(){try{const value=Number(localStorage.getItem('au-lyrics-background'));", "function lyricsBackgroundVisibility(){try{const stored=localStorage.getItem('au-lyrics-background');if(stored===null)return 42;const value=Number(stored);"),
    (" window.initAppImmersion({audio,track,getVolume:()=>COLLECTION[playingVolume],AU_GENIUS_SYNC,move,startPlayback,canvasFor,clock,AU_LYRICS,createPublicLyricsView,renderLyrics});", " window.AU_DESIGN_CONTEXT_20={audio,track,getVolume:()=>COLLECTION[playingVolume],canvasFor,applyCoverAtmosphere};window.dispatchEvent(new CustomEvent('au:design-ready',{detail:window.AU_DESIGN_CONTEXT_20}));\n window.initAppImmersion({audio,track,getVolume:()=>COLLECTION[playingVolume],AU_GENIUS_SYNC,move,startPlayback,canvasFor,clock,AU_LYRICS,createPublicLyricsView,renderLyrics,applyCoverAtmosphere});"),
])
edit(source / 'immersion-18v05-2.js', [
    ('clock,AU_LYRICS,createPublicLyricsView,renderLyrics})', 'clock,AU_LYRICS,createPublicLyricsView,renderLyrics,applyCoverAtmosphere})'),
    ('else if(s.cover){picture.append(canvasFor(s.cover,800));}', 'else if(s.cover){picture.append(canvasFor(s.cover,900));applyCoverAtmosphere?.(d,s.cover).then(()=>d.querySelector(\':scope > .au-cover-atmosphere\')?.classList.add(\'au20-immersion-backdrop\'));}'),
])
edit(source / 'sw.js', [
    ("const AU_CACHE='avant-usine-shell-19v06-r1-20261014';", "const AU_CACHE='avant-usine-shell-20-0-r1-20261015';"),
    ("const AU_ASSETS=['./audio-edits-19v06.js'", "const AU_ASSETS=['./design-20.css','./design-20.js','./audio-edits-19v06.js'"),
])
for platform in ['desktop', 'android']:
    edit(root / f'work/{platform}-app/scripts/prepare-site.cjs', [
        ('const allowed=/^(audio-edits-19v06', 'const allowed=/^(design-20\\.(?:css|js)|audio-edits-19v06'),
    ])
print('20.0 design connected to Web, Windows, Android and iOS preparation; original files backed up.')
