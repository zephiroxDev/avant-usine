from pathlib import Path
import urllib.request,json
r=Path(__file__).resolve().parents[2];o=r/'outputs/20v00-2'
def get(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Avant-usine-verification'}),timeout=60) as response:return json.load(response)
release=get('https://api.github.com/repos/zephiroxDev/avant-usine/releases/tags/ios-v2.0.2');assert not release['draft'];a=next(a for a in release['assets'] if a['name']=='Avant-Usine-iOS-2.0.2-non-signe.ipa');m=get('https://github.com/zephiroxDev/avant-usine/releases/download/ios-v2.0.2/livraison.json');assert a['digest']=='sha256:'+m['sha256'] and a['size']==m['bytes'];assert m['version']=='2.0.2';assert not any('betatesting' in f['name'] for f in release['assets']);(o/'ios-public-verification.json').write_text(json.dumps(m,indent=2));print('iOS 2.0.2 PUBLIC VERIFIED: '+str(m['bytes'])+' bytes; beta absent from public assets.')
