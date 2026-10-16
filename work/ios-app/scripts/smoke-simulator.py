import json,subprocess,time
from pathlib import Path
from PIL import Image
def run(*args):return subprocess.check_output(args,text=True)
devices=json.loads(run('xcrun','simctl','list','devices','available','-j'))['devices']
device=next(d for runtime,items in devices.items() if 'iOS' in runtime for d in items if 'iPhone' in d['name'] and 'Pro' in d['name'] and d.get('isAvailable'))
print('Dynamic Island simulator: '+device['name'])
udid=device['udid']
if device['state']!='Booted':run('xcrun','simctl','boot',udid)
run('xcrun','simctl','bootstatus',udid,'-b')
assert 'rootViewController = ViewController()' in Path('ios/App/App/SceneDelegate.swift').read_text()
subprocess.run(['xcodebuild','-project','ios/App/App.xcodeproj','-scheme','App','-configuration','Debug','-sdk','iphonesimulator','-destination','id='+udid,'-derivedDataPath','build-simulator','CODE_SIGNING_ALLOWED=NO','build'],stdout=Path('simulator-build.log').open('w'),stderr=subprocess.STDOUT,check=True)
run('xcrun','simctl','install',udid,'build-simulator/Build/Products/Debug-iphonesimulator/App.app')
container=Path(run('xcrun','simctl','get_app_container',udid,'dev.zephirox.avantusine.ios','data').strip())
probe=container/'Documents/au-debug-probe.json'
# Warm Settings before starting the test audio: first launch can be slow.
run('xcrun','simctl','launch',udid,'com.apple.Preferences')
for phase in ['nativeSeed','nativeVerified']:
    probe.unlink(missing_ok=True)
    run('xcrun','simctl','launch',udid,'dev.zephirox.avantusine.ios')
    state={}
    for attempt in range(65):
        time.sleep(2)
        if probe.exists():
            state=json.loads(probe.read_text())
            if state.get('nativeError'):raise AssertionError(state['nativeError'])
            if state.get('ready'):
                assert all(state.get(key) is True for key in ['updates','download','crypto','backup','force','lyrics','lyricsActivity','nativeRelay',phase])
                print('SIMULATOR VERIFIED '+phase+': '+json.dumps(state));break
    else:raise AssertionError('iOS readiness probe did not pass: '+json.dumps(state))
    # Launch Settings to genuinely put the music application in background.
    background_probe=container/'Documents/au-debug-background-lyrics.json'
    run('xcrun','simctl','launch',udid,'com.apple.Preferences')
    samples=[]
    for step in range(10):
        time.sleep(5)
        assert background_probe.exists(), 'Native background probe missing'
        sample=json.loads(background_probe.read_text());samples.append(sample)
        assert sample['playing'] and sample['nativeAudio'] and sample['background'], sample
        assert sample['highlight']==(phase=='nativeVerified'), sample
        if len(samples)>1:assert sample['position']>samples[-2]['position']+2, 'Native playback clock froze'
    assert samples[-1]['updates']>samples[0]['updates']+2, 'Lyrics activity updates stopped'
    assert len({x['phrase'] for x in samples})>=4, 'Phrases did not follow the audio'
    # Preserve the actual system presentation, not only ActivityKit update counters.
    captures=Path('build/simulator-captures');captures.mkdir(parents=True,exist_ok=True)
    run('xcrun','simctl','io',udid,'screenshot',str(captures/(phase+'-island.png')))
    image=Image.open(captures/(phase+'-island.png')).convert('RGB')
    # The compact leading music note is pink even in classic mode. Search only
    # the central status area, excluding Settings content and the side clock.
    width,height=image.size
    crop=image.crop((int(width*.08),0,int(width*.92),int(height*.075)))
    visible=sum(1 for red,green,blue in crop.getdata() if red>160 and blue>65 and red>green+45 and blue>green+10)
    # Inspect text inside the central, opaque part of the capsule as well. White
    # Settings background is outside its vertical bounds and must not count.
    band=image.crop((int(width*.25),0,int(width*.75),int(height*.075)))
    dark=[y for y in range(band.height) if sum(1 for x in range(band.width) if max(band.getpixel((x,y)))<45)>band.width*.6]
    assert dark, 'No Dynamic Island capsule visible'
    inner=band.crop((0,min(dark)+8,band.width,max(dark)-8))
    letters=sum(1 for red,green,blue in inner.getdata() if min(red,green,blue)>170)
    assert visible>=5, 'Dynamic Island has no visible native widget pixels: '+str(visible)
    assert letters>=10, 'Dynamic Island capsule contains no visible text: '+str(letters)
    print('SIMULATOR DISPLAY VERIFIED '+phase+': '+str(visible)+' pink pixels; '+str(letters)+' text pixels')
    logs=run('xcrun','simctl','spawn',udid,'log','show','--last','2m','--style','compact','--predicate','process == "LyricsIsland" OR process == "liveactivitiesd"')
    (captures/(phase+'-system.log')).write_text(logs)
    print('SIMULATOR BACKGROUND VERIFIED '+phase+': '+json.dumps(samples))
    run('xcrun','simctl','terminate',udid,'dev.zephirox.avantusine.ios')
run('xcrun','simctl','shutdown',udid)
