const fs=require('node:fs'),path=require('node:path'),xcode=require('xcode'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),app=path.join(root,'ios/App/App'),projFile=path.join(root,'ios/App/App.xcodeproj/project.pbxproj');
const project=xcode.project(projFile);project.parseSync();
const group=project.findPBXGroupKey({name:'App'})||project.findPBXGroupKey({path:'App'});
if(!group)throw Error('App Xcode group missing');
// xcode's helpers expect these named groups even when the template has none.
if(!project.pbxGroupByName('Plugins'))project.addPbxGroup([],'Plugins','');
if(!project.pbxGroupByName('Resources'))project.addPbxGroup([],'Resources','');
for(const file of ['IOSUpdates.swift','ViewController.swift']){
 fs.copyFileSync(path.join(root,'native',file),path.join(app,file));
 project.addSourceFile(file,{},group);
}
project.addResourceFile('PrivacyInfo.xcprivacy',{},group);
project.updateBuildProperty('MARKETING_VERSION',require('../release.json').version);
project.updateBuildProperty('CURRENT_PROJECT_VERSION',String(require('../release.json').buildNumber));
project.updateBuildProperty('TARGETED_DEVICE_FAMILY','"1,2"');
fs.writeFileSync(projFile,project.writeSync());
const storyboard=path.join(app,'Base.lproj/Main.storyboard');
let xml=fs.readFileSync(storyboard,'utf8');
xml=xml.replace('customClass="CAPBridgeViewController" customModule="Capacitor"','customClass="ViewController" customModule="App" customModuleProvider="target"');
if(!xml.includes('customClass="ViewController"'))throw Error('Bridge storyboard was not adapted');
fs.writeFileSync(storyboard,xml);
cp.execFileSync('python',['scripts/configure-plist.py'],{cwd:root,stdio:'inherit'});
