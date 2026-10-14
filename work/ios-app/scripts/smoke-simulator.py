import json,subprocess,time
from pathlib import Path
def run(*args):return subprocess.check_output(args,text=True)
devices=json.loads(run('xcrun','simctl','list','devices','available','-j'))['devices']
device=next(d for runtime,items in devices.items() if 'iOS' in runtime for d in items if 'iPhone' in d['name'] and d.get('isAvailable'))
udid=device['udid']
if device['state']!='Booted':run('xcrun','simctl','boot',udid)
run('xcrun','simctl','bootstatus',udid,'-b')
assert 'rootViewController = ViewController()' in Path('ios/App/App/SceneDelegate.swift').read_text()
subprocess.run(['xcodebuild','-project','ios/App/App.xcodeproj','-scheme','App','-configuration','Debug','-sdk','iphonesimulator','-destination','id='+udid,'-derivedDataPath','build-simulator','CODE_SIGNING_ALLOWED=NO','build'],stdout=Path('simulator-build.log').open('w'),stderr=subprocess.STDOUT,check=True)
run('xcrun','simctl','install',udid,'build-simulator/Build/Products/Debug-iphonesimulator/App.app')
container=Path(run('xcrun','simctl','get_app_container',udid,'dev.zephirox.avantusine.ios','data').strip())
probe=container/'Documents/au-debug-probe.json'
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
    print('SIMULATOR BACKGROUND VERIFIED '+phase+': '+json.dumps(samples))
    run('xcrun','simctl','terminate',udid,'dev.zephirox.avantusine.ios')
run('xcrun','simctl','shutdown',udid)
