const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'outputs/20-0');process.env.TEMP=process.env.TMP=out;
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true,args:['--mute-audio']});try{
 const p=await browser.newPage({viewport:{width:640,height:220},reducedMotion:'no-preference'});
 await p.route('**/design-20.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'work/github-sync-import/design-20.js'),'utf8')}));
 await p.setContent('<style>body{background:#211c23;--ink:white;--au20-cover-accent:#be82b5}.au20-volume{position:relative;display:inline-block;width:350px;height:100px;margin:40px}.au20-volume canvas{width:100%;height:100%}.au20-volume input{position:absolute;inset:0;width:100%;height:100%;opacity:.001}.au20-volume output{position:absolute;right:10px;top:45px;color:white}</style><input id=volume type=range min=0 max=1 step=.01 value=.55>');
 await p.addScriptTag({url:'http://127.0.0.1:8805/design-20.js'});await p.waitForTimeout(600);
 const surface=p.locator('.au20-volume'),canvas=surface.locator('canvas'),before=await canvas.evaluate(n=>n.toDataURL());await surface.screenshot({path:path.join(out,'volume-repos.png')});
 const input=p.locator('#volume'),rect=await input.boundingBox();await p.mouse.move(rect.x+rect.width*.55,rect.y+rect.height*.5);await p.mouse.down();await p.waitForTimeout(500);
 const lifted=await canvas.evaluate(n=>n.toDataURL());assert.notEqual(lifted,before,'Ribbon did not rise during press');await surface.screenshot({path:path.join(out,'volume-glissement.png')});
 await p.mouse.move(rect.x+rect.width*.8,rect.y-50);await p.mouse.up();await p.waitForTimeout(700);const settled=await canvas.evaluate(n=>n.toDataURL());assert.notEqual(settled,lifted,'Ribbon did not settle after outside release');
 await input.focus();const value=await input.inputValue();await p.keyboard.press('ArrowRight');assert(Number(await input.inputValue())>Number(value),'Keyboard no longer works');
 await p.emulateMedia({reducedMotion:'reduce'});await input.dispatchEvent('pointerdown');await p.waitForTimeout(300);await input.dispatchEvent('pointerup');
 console.log('PASS: volume ribbon lift, outside release, spring return, native keyboard and reduced motion.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
