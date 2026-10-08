from pathlib import Path
p=Path(__file__).resolve().parents[1]/'web/android.js';s=p.read_text(encoding='utf-8');s=s.replace("if(!force&&localStorage.getItem('au-android-skip')===version)return;","if(localStorage.getItem('au-android-skip')===version){if(force)report('La version '+version+' a été ignorée. La suivante sera proposée.');return;}")
needle="modal.addEventListener('cancel',()=>";s=s.replace(needle,"modal.addEventListener('close',()=>{offered=false;modal.remove();});"+needle,1);p.write_bytes(s.encode())
