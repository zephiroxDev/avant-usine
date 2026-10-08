from pathlib import Path
import base64,json,sys
r=Path(__file__).resolve().parents[3];p=r/'outputs/application-android/Avant-Usine-Android-0.1.0.apk';s=base64.b64encode(p.read_bytes()).decode();i=int(sys.argv[1]) if len(sys.argv)>1 else None
print(json.dumps({'parts':(len(s)+119999)//120000,'bytes':p.stat().st_size}) if i is None else json.dumps(s[i*120000:(i+1)*120000]))
