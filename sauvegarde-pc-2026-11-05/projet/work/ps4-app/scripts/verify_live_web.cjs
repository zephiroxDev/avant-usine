const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../../../outputs/ps4');
const temporary=path.join(root,'browser-tests');fs.mkdirSync(temporary,{recursive:true});
process.env.TEMP=temporary;process.env.TMP=temporary;process.env.TMPDIR=temporary;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--mute-audio']});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('https://zephiroxdev.github.io/avant-usine/',{waitUntil:'domcontentloaded',timeout:60000});
  const link=page.locator('#ps4Download');await link.waitFor({timeout:45000});
  const href=await link.getAttribute('href');if(!href.endsWith('/Avant-Usine-PS4-0.1.0-test1.pkg'))throw Error('Wrong PKG destination: '+href);
  await link.scrollIntoViewIfNeeded();await page.locator('.au-app-platforms').screenshot({path:path.join(root,'site-downloads-desktop.png')});
  await page.setViewportSize({width:375,height:812});await link.scrollIntoViewIfNeeded();
  const geometry=await link.evaluate(el=>{const b=el.getBoundingClientRect();return {left:b.left,right:b.right,width:innerWidth};});
  if(geometry.left<0||geometry.right>geometry.width)throw Error('Download button overflows mobile viewport');
  await page.locator('.au-app-platforms').screenshot({path:path.join(root,'site-downloads-mobile.png')});
  const result={url:page.url(),href,mobile:geometry,pageErrors:errors};fs.writeFileSync(path.join(root,'live-web-check.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
