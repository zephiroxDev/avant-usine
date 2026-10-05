const REPO='https://github.com/zephiroxDev/avant-usine/releases/download/';
const API='https://api.github.com/repos/zephiroxDev/avant-usine/releases?per_page=100';
function compare(a,b){const parse=v=>/^v?(\d+)\.(\d+)\.(\d+)$/.exec(v);const x=parse(a),y=parse(b);if(!x||!y)return null;for(let i=1;i<=3;i++){const d=Number(x[i])-Number(y[i]);if(d)return Math.sign(d);}return 0;}
function published(releases){return Array.isArray(releases)?releases.filter(r=>!r.draft&&compare(r.tag_name,'0.0.0')!==null).sort((a,b)=>compare(b.tag_name,a.tag_name)):[];}
function asset(release,name){return release.assets?.find(a=>a.state==='uploaded'&&a.name===name&&a.browser_download_url===`${REPO}${release.tag_name}/${name}`);}
module.exports={API,REPO,compare,published,asset};
