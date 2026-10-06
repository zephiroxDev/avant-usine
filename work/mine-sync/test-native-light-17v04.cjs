const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const web=path.resolve(__dirname,'../github-sync-import'),window={};
vm.runInNewContext(fs.readFileSync(path.join(web,'native-light-17v04.js'),'utf8'),{window,Math});
const {light,gain}=window.AU_NATIVE_LIGHT;
assert.equal(light(0),0);assert.equal(light(3),0);assert.equal(light(-3),0);
let up=0,down=0;for(let i=0;i<60;i++){up=light(200,up);down=light(-200,down);}
assert(Math.abs(up-6)<1e-8);assert(Math.abs(down+.92)<1e-8);
assert.deepEqual(Array.from(gain([50,100,200],0)),[50,100,200]);
assert.deepEqual(Array.from(gain([50,100,200],6)),[63.74999999999999,127.49999999999999,254.99999999999997]);
const lit=Array.from(gain([30,60,90],2));assert.equal(lit[1]/lit[0],2);assert.equal(lit[2]/lit[0],3);
assert(Array.from(gain([0,0,0],6)).every(v=>v===0));
assert(light(20)>0&&light(20)<6);assert(light(-20)<0&&light(-20)>-.92);
const html=fs.readFileSync(path.join(web,'index.html'),'utf8'),app=fs.readFileSync(path.join(web,'app-17v01.js'),'utf8');
assert(html.indexOf('native-light-17v04.js')<html.indexOf('app-17v01.js'));
assert(!app.includes('downloadMotion'));
assert(html.includes('https://mega.nz/file/YNM0VAJT#vSt4RvZygX6zH9S0jg6htKh5-mCsg-nyysKVWOrS7Qw'));
assert(html.includes('https://mega.nz/file/VN9wlAwY#ZLQni_ZMuq8ROXibMS-47kOb4j-AeMlB4T_POjPn7kU'));
console.log('Native lighting: HD colour ratios, clipping protection, smoothing, script order and stable MEGA links passed.');
