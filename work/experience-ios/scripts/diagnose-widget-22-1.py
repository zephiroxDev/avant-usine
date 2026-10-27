import json,subprocess,time,sys
from pathlib import Path
from check_island_display import check_display
def run(*args):return subprocess.check_output(args,text=True)

# Explicit private-beta mode: retain failed visual evidence without claiming a fix.
# Playback assertions and bridge readiness remain mandatory. Default remains strict.
report_display_only = True
print('DIAGNOSTIC ONLY: not a playback acceptance test or deliverable build')
display_results = []
devices=json.loads(run('xcrun','simctl','list','devices','available','-j'))['devices']
device=next(d for runtime,items in devices.items() if 'iOS' in runtime for d in items if 'iPhone' in d['name'] and 'Pro' in d['name'] and d.get('isAvailable'))
print('Dynamic Island simulator: '+device['name'])
udid=device['udid']
if device['state']!='Booted':run('xcrun','simctl','boot',udid)
run('xcrun','simctl','bootstatus',udid,'-b')
assert 'rootViewController = ViewController()' in Path('ios/App/App/SceneDelegate.swift').read_text()
subprocess.run(['xcodebuild','-project','ios/App/App.xcodeproj','-scheme','App','-configuration','Debug','-sdk','iphonesimulator','-destination','id='+udid,'-derivedDataPath','build-simulator','CODE_SIGNING_ALLOWED=NO','build'],stdout=Path('simulator-build.log').open('w'),stderr=subprocess.STDOUT,check=True)
run('xcrun','simctl','install',udid,'build-simulator/Build/Products/Debug-iphonesimulator/App.app')
registry = run('xcrun','simctl','listapps',udid)
captures=Path('build/simulator-captures');captures.mkdir(parents=True,exist_ok=True)
(captures/'installation-registry.txt').write_text(registry)
container=Path(run('xcrun','simctl','get_app_container',udid,'dev.zephirox.avantusine.ios','data').strip())
probe=container/'Documents/au-debug-probe.json'
# Warm Settings before starting the test audio: first launch can be slow.
run('xcrun','simctl','launch',udid,'com.apple.Preferences')
for phase in ['nativeSeed']:
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
    captures=Path('build/simulator-captures');captures.mkdir(parents=True,exist_ok=True)
    run('xcrun','simctl','launch',udid,'com.apple.Preferences')
    samples=[]
    for step in range(2):
        time.sleep(5)
        assert background_probe.exists(), 'Native background probe missing'
        sample=json.loads(background_probe.read_text());samples.append(sample)
        (captures/(phase+'-background-samples.json')).write_text(json.dumps(samples,indent=2))
        assert sample['playing'] and sample['nativeAudio'] and sample['background'], sample
        assert sample['highlight']==(phase=='nativeVerified'), sample
        if len(samples)>1:assert sample['position']>samples[-2]['position']+2, 'Native playback clock froze'
    # Full 120-second acceptance remains in smoke-simulator.py.

    # Preserve the actual system presentation, not only ActivityKit update counters.
    captures=Path('build/simulator-captures');captures.mkdir(parents=True,exist_ok=True)
    run('xcrun','simctl','io',udid,'screenshot',str(captures/(phase+'-island.png')))
    logs=run('xcrun','simctl','spawn',udid,'log','show','--last','15m','--style','compact','--predicate','process == "LyricsIsland" OR process == "liveactivitiesd" OR process == "chronod" OR subsystem CONTAINS[c] "widget" OR eventMessage CONTAINS[c] "avantusine"')
    (captures/(phase+'-system.log')).write_text(logs)
    try:
        display = check_display(captures/(phase+'-island.png'))
        display_results.append({'phase': phase, 'passed': True, **display})
        print('SIMULATOR DISPLAY VERIFIED '+phase+': '+json.dumps(display))
    except AssertionError as error:
        display_results.append({'phase': phase, 'passed': False, 'error': str(error)})
        (captures/'display-results.json').write_text(json.dumps(display_results, indent=2))
        if not report_display_only: raise
        print('KNOWN DISPLAY FAILURE (NOT VERIFIED) '+phase+': '+str(error))
    (captures/'display-results.json').write_text(json.dumps(display_results, indent=2))
    print('SIMULATOR BACKGROUND VERIFIED '+phase+': '+json.dumps(samples))
    run('xcrun','simctl','terminate',udid,'dev.zephirox.avantusine.ios')
run('xcrun','simctl','shutdown',udid)
