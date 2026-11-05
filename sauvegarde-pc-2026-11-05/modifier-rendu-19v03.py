from pathlib import Path
r=Path(__file__).parent/'projet/work/github-sync-import';p=r/'app-17v01.js';s=p.read_text(encoding='utf-8')
a="""function currentLyricLines(data,time){
 if(!Number.isFinite(time))return [];
 return data.lines.flatMap((_,i)=>{const start=data.times[i];let end;
 if(Number.isFinite(data.line_ends?.[i]))end=data.line_ends[i];
 else if(data.sync_mode!=='blocks'&&data.curves?.[i]?.length)end=data.curves[i].at(-1)[1];
 else {end=data.end_time??data.duration;for(let j=i+1;j<data.times.length;j++)if(data.times[j]>start){end=Math.min(end,data.times[j]);break;}}
 return Number.isFinite(start)&&Number.isFinite(end)&&time>=start&&time<end?[i]:[];});
}"""
b="""function lyricLineEnd(data,i){
 if(Number.isFinite(data.line_ends?.[i]))return data.line_ends[i];
 if(data.sync_mode!=='blocks'&&data.curves?.[i]?.length)return data.curves[i].at(-1)[1];
 let end=data.end_time??data.duration,start=data.times[i];
 for(let j=i+1;j<data.times.length;j++)if(data.times[j]>start){end=Math.min(end,data.times[j]);break;}
 return end;
}
function currentLyricLines(data,time){
 if(!Number.isFinite(time))return [];
 return data.lines.flatMap((_,i)=>Number.isFinite(data.times[i])&&Number.isFinite(lyricLineEnd(data,i))&&time>=data.times[i]&&time<lyricLineEnd(data,i)?[i]:[]);
}"""
assert a in s;s=s.replace(a,b)
# CSS is restricted to public views, not recording/correction controls.
a="AU_KARAOKE.text(row,line,true);row.onclick="
b="AU_KARAOKE.text(row,line,true);row.dataset.revealMode=data.sync_mode!=='blocks'&&data.curves?.[i]?'letters':'classic';row.style.setProperty('--reveal-edge','0%');row.onclick="
assert a in s;s=s.replace(a,b,1)
a="if(data.curves?.[i])AU_KARAOKE.paint(row,AU_KARAOKE.position(data.curves[i],time));"
b="if(row.dataset.revealMode==='letters')AU_KARAOKE.paint(row,AU_KARAOKE.position(data.curves[i],time));else{const end=lyricLineEnd(data,i),fraction=Math.max(0,Math.min(1,(time-data.times[i])/Math.max(.001,end-data.times[i])));row.style.setProperty('--reveal-edge',fraction===0?'0%':fraction===1?'110%':(fraction*110)+'%');}"
assert a in s;s=s.replace(a,b,1)
p.write_text(s,encoding='utf-8')
p=r/'styles-17v00.css';s=p.read_text(encoding='utf-8');s+='''
/* 19V03 : les paroles sont révélées, pas recouvertes d’un simple effet. */
.au-lyric-line[data-reveal-mode=letters] .karaoke-char{display:inline-block;clip-path:inset(0 calc(100% - var(--fill,0%)) 0 0)}
.au-lyric-line[data-reveal-mode=classic] .karaoke-main,.au-lyric-line[data-reveal-mode=classic] .karaoke-backs{mask-image:linear-gradient(to bottom,#000 calc(var(--reveal-edge,0%) - 10%),transparent var(--reveal-edge,0%));-webkit-mask-image:linear-gradient(to bottom,#000 calc(var(--reveal-edge,0%) - 10%),transparent var(--reveal-edge,0%))}
''';p.write_text(s,encoding='utf-8')
print('Révélation lettre par lettre et fondu classique intégrés')
