from pathlib import Path
r=Path(__file__).resolve().parents[2];p=r/'work/github-sync-import/app-17v01.js';s=p.read_text(encoding='utf-8')
start=s.index("const synced=E('div','sync-player')");a=s[:start];b=s[start:];b=b.replace("follow.setAttribute('aria-pressed',String(automatic));});follow.setAttribute", "follow.setAttribute('aria-pressed',String(automatic));if(automatic)publicLyricsView?.returnToCurrent();});follow.setAttribute",1);p.write_text(a+b,encoding='utf-8')
p=r/'work/github-sync-import/immersion-18v05-2.js';s=p.read_text(encoding='utf-8').replace('automatic=!automatic;following();tick();','automatic=!automatic;following();if(automatic)view?.returnToCurrent();tick();',1);p.write_text(s,encoding='utf-8')
print('Existing follow controls also clear manual-scroll suspension.')
