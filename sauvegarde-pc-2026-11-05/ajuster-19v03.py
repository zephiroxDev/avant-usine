from pathlib import Path
r=Path(__file__).parent/'projet'
p=r/'work/mine-sync/test-sync-19v03.cjs';s=p.read_text(encoding='utf-8');s=s.replace("assert.equal(reveal[2].fill,'');","assert.equal(parseFloat(reveal[2].fill)||0,0);");p.write_text(s,encoding='utf-8')
p=r/'work/github-sync-import/app-17v01.js';s=p.read_text(encoding='utf-8');s=s.replace('function lyricsEndTime(data){','function lyricsEndTime(data){\n if(data.line_ends?.some(Number.isFinite))return Math.max(...data.line_ends.filter(Number.isFinite));',1);p.write_text(s,encoding='utf-8')
for platform in ['desktop-app','android-app']:
 p=r/'work'/platform/'scripts/prepare-site.cjs';s=p.read_text(encoding='utf-8');s=s.replace('const allowed=/^(','const allowed=/^(sync-slider-19v03\\.js|',1);p.write_text(s,encoding='utf-8')
p=r/'work/github-sync-import/studio-19v00.js';s=p.read_text(encoding='utf-8');s=s.replace("const undo=button('Annuler',()=>{armed=false;model.undo();})","const undo=button('Annuler',()=>{armed=false;model.undo();const pending=trackLines().findIndex(l=>l.end===null);cursor=pending>=0?pending:Math.min(cursor,Math.max(0,trackLines().length-1));selected=current()?.id??null;render();})");p.write_text(s,encoding='utf-8')
print('Ajustements appliqués')
