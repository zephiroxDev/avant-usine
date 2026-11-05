const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('node:path');
const fs=require('node:fs');
const temporary=path.resolve(__dirname,'../../../outputs/ps4/browser-tests');fs.mkdirSync(temporary,{recursive:true});
process.env.TEMP=temporary;process.env.TMP=temporary;process.env.TMPDIR=temporary;
const source=path.resolve(__dirname,'../../github-sync-import/release-download.js');
const {latestPS4,latest,latestMobile}=require(source);
const row=v=>({tag_name:'ps4-v'+v,assets:[{name:'Avant-Usine-PS4-'+v+'.pkg',state:'uploaded',browser_download_url:'https://github.com/zephiroxDev/avant-usine/releases/download/ps4-v'+v+'/Avant-Usine-PS4-'+v+'.pkg'}]});
assert.equal(latestPS4([row('0.1.0-test1'),row('0.1.0-test2')]).version,'0.1.0-test2');
assert.equal(latestPS4([row('0.1.0'),row('0.1.0-test2')]).version,'0.1.0');
assert.equal(latestPS4([{...row('0.2.0-test1'),draft:true},row('0.1.0-test1')]).version,'0.1.0-test1');
assert.equal(latestPS4([{...row('0.1.0-test1'),assets:[]}]),null);
const wrong=row('0.1.0-test1');wrong.assets[0].browser_download_url='https://other.example/fake.pkg';assert.equal(latestPS4([wrong]),null);
assert.equal(latest([row('0.1.0-test1')]),null);assert.equal(latestMobile([row('0.1.0-test1')],'ios'),null);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try {
  const page=await browser.newPage();let requests=0,destination='';
  await page.route('https://example.test/**',r=>r.fulfill({contentType:'text/html',body:'<div class="au-app-platforms"><section><a id="desktopDownload">Windows</a></section></div>'}));
  await page.route('https://api.github.com/**',r=>{requests++;return r.fulfill({json:[row(requests===1?'0.1.0-test1':'0.1.0-test2')]});});
  await page.route('https://github.com/**',r=>{destination=r.request().url();return r.abort();});
  await page.goto('https://example.test/');await page.addScriptTag({path:source});
  await page.locator('#ps4Download').waitFor();assert.equal(await page.locator('#ps4Download').count(),1);
  assert.match(await page.locator('#ps4Download').getAttribute('href'),/test1\.pkg$/);
  await page.locator('#ps4Download').click();await page.waitForTimeout(250);
  assert.equal(requests,2);assert.match(destination,/test2\.pkg$/);
  console.log('PASS: PS4 selection, draft/invalid rejection, platform isolation, DOM panel, latest version on click');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
