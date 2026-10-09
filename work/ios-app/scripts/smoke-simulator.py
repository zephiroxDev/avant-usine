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
run('xcrun','simctl','launch',udid,'dev.zephirox.avantusine.ios')
for attempt in range(15):
    time.sleep(2)
    logs=run('xcrun','simctl','spawn',udid,'log','show','--last','2m','--style','compact','--predicate','eventMessage CONTAINS "AU_IOS_UPDATES_"')
    if 'AU_IOS_UPDATES_READY' in logs:print('SIMULATOR VERIFIED: custom scene starts native update service and exposes search/download to JavaScript');break
else:raise AssertionError('Native update service unavailable in running iOS simulator: '+logs)
run('xcrun','simctl','terminate',udid,'dev.zephirox.avantusine.ios')
run('xcrun','simctl','shutdown',udid)
