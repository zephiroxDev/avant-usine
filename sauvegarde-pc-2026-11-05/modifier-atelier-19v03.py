from pathlib import Path
r=Path(__file__).parent/'projet/work/github-sync-import'
p=r/'studio-19v00.js';s=p.read_text(encoding='utf-8')
def swap(a,b):
 global s
 assert a in s,a[:100]
 s=s.replace(a,b,1)
swap("captureMode='phrases'","captureMode=initial?.captureMode||'glide'")
swap("const buttons=[];let moreCommands=null;","const buttons=[];let moreCommands=null,glide=null;")
swap("try{await fn();}","try{glide?.flush();await fn();}")
swap("[['phrases','Phrases'],['words','Mot par mot']]","[['glide','Highlight · barre glissante'],['phrases','Classique · début et fin'],['words','Correction mot par mot']]")
swap("modeSelect.append(option);}","if(value==='words')option.hidden=true;modeSelect.append(option);}modeSelect.value=captureMode;")
swap("const overlapLabel=","glide=window.AU_SYNC_SLIDER_19V03.create({host:focus,phrase,audio,status,onCapture:(id,points,complete)=>model.capture(id,points,complete),onAdvance:()=>{cursor++;wordIndex=0;selected=current()?.id??null;render();}});\n const overlapLabel=")
swap("function move(delta){cursor=","function move(delta){glide?.flush();cursor=")
swap("if(disposed)return;if(audio.paused){await play();status.textContent='La musique joue. Tape au début de la phrase ou du mot.';return;}","if(disposed)return;if(captureMode==='glide'){status.textContent='Fais glisser la barre pour synchroniser le Highlight.';return;}if(audio.paused)await play();")
swap("phrase.replaceChildren();", "phrase.replaceChildren();phrase.classList.toggle('studio19-glide-phrase',captureMode==='glide');glide.element.hidden=captureMode!=='glide';")
swap("hint.textContent=captureMode==='words'?", "hint.textContent=captureMode==='glide'?'Lance la musique. Maintiens la barre et fais-la glisser au rythme du chant ; ramène-la au début pour la phrase suivante.':captureMode==='words'?")
swap("if(currentLine){\n   const tokens=", "if(captureMode==='glide'){glide.render(currentLine);}else if(currentLine){\n   const tokens=")
swap("trackSelect.onchange=()=>{voicePositions", "trackSelect.onchange=()=>{glide.flush();voicePositions")
swap("modeSelect.onchange=()=>{captureMode=modeSelect.value;wordIndex=0;armed=false;cursor=0;render();};", "modeSelect.onchange=()=>{glide.flush();captureMode=modeSelect.value;wordIndex=0;armed=false;model.session({captureMode});render();};")
swap("if(e.code!=='Space'", "if(captureMode==='glide'&&e.code==='Space'){if(e.target.closest('[role=slider]')){e.preventDefault();status.textContent='Utilise les flèches droites pour avancer le surlignage, ou fais glisser la barre.';}return;}if(e.code!=='Space'")
swap("if(disposed)return;model.session({position:","if(disposed)return;glide?.flush();model.session({captureMode,position:")
swap("session();disposed=true;audio.playbackRate", "session();disposed=true;glide.dispose();audio.playbackRate")
# Exports follow the mode and avoid presenting a long list in the main stage.
swap("button('Exporter JSON Highlight',", "const highlightExport=button('Exporter JSON Highlight',")
swap("button('Exporter JSON simple',", "const classicExport=button('Exporter JSON simple',")
swap("button('Exporter LRC simple',", "const lrcExport=button('Exporter LRC simple',")
swap("undo.disabled=!model.canUndo;", "highlightExport.hidden=captureMode==='phrases';classicExport.hidden=captureMode!=='phrases';lrcExport.hidden=captureMode!=='phrases';undo.disabled=!model.canUndo;")
p.write_text(s,encoding='utf-8')
p=r/'studio-19v00-model.js';s=p.read_text(encoding='utf-8').replace("session({position,rate,duration}={}){","session({position,rate,duration,captureMode}={}){if(['glide','phrases','words'].includes(captureMode))p.captureMode=captureMode;")
p.write_text(s,encoding='utf-8')
p=r/'index.html';s=p.read_text(encoding='utf-8');assert './sync-slider-19v03.js' not in s;s=s.replace('<script src="./studio-19v00.js">','<script src="./sync-slider-19v03.js"></script>\n<script src="./studio-19v00.js">');p.write_text(s,encoding='utf-8')
p=r/'sw.js';s=p.read_text(encoding='utf-8').replace('19v02-r1-20261012','19v03-r1-20261013').replace("const AU_ASSETS=[","const AU_ASSETS=['./sync-slider-19v03.js',");p.write_text(s,encoding='utf-8')
print('Atelier et chargement du slider modifiés')
