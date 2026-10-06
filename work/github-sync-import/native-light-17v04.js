/* Original HD artwork supplies every detail; the video supplies only light changes. */
(() => {
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function light(delta,previous=0){const gate=clamp((Math.abs(delta)-3)/18,0,1);return previous+(((delta>=0?6:-.92)*Math.min(1,gate*5))-previous)*.35;}
 function gain(rgb,extra){const peak=Math.max(...rgb);if(extra>0&&peak)extra=Math.min(extra,(255-peak)/peak);return rgb.map(v=>clamp(v*(1+extra),0,255));}
 window.AU_NATIVE_LIGHT={light,gain};
 window.AU_INIT_NATIVE_LIGHTS=({getBitmap})=>{
  const entries=new Map(),sources=new Map(),titles=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let enabled=!reduced.matches,toggle,raf=0,last=0;
  try{const saved=localStorage.getItem('au-cover-motion');if(saved!==null)enabled=saved==='on';}catch{}
  const surface=document.createElement('canvas'),gl=surface.getContext('webgl',{alpha:false,preserveDrawingBuffer:true,antialias:false});
  let program,position,original,field;
  function shader(type,code){const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  try{if(gl){program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 uv;void main(){uv=vec2((p.x+1.0)*.5,(1.0-p.y)*.5);gl_Position=vec4(p,0,1);}'));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 uv;uniform sampler2D image;uniform sampler2D lighting;uniform float strength;void main(){vec3 c=texture2D(image,uv).rgb;float f=0.0;for(int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){f+=texture2D(lighting,uv+vec2(float(x),float(y))/384.0).r/9.0;}}float e=(f*6.92-.92)*strength;float peak=max(c.r,max(c.g,c.b));if(e>0.0&&peak>0.0)e=min(e,(1.0-peak)/peak);gl_FragColor=vec4(c*(1.0+e),1.0);}'));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Lighting shader link');gl.useProgram(program);position=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,position);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);original=gl.getUniformLocation(program,'image');field=gl.getUniformLocation(program,'lighting');}}
  catch(error){program=null;console.warn('Éclairage des pochettes : affichage HD fixe conservé.',error);}
  function texture(){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
  function source(v){const key=v.motion;let s=sources.get(key);if(s)return s;
   const video=document.createElement('video');video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.preload='none';video.setAttribute('muted','');video.setAttribute('playsinline','');
   const sample=document.createElement('canvas');sample.width=sample.height=192;
   s={video,key,sample,ctx:sample.getContext('2d',{willReadFrequently:true}),previous:new Float32Array(192*192),base:null,ready:false,failed:false,playing:false,texture:null,lighting:null,avg:0};sources.set(key,s);
   video.addEventListener('loadeddata',()=>{try{if(s.base)return;s.ctx.drawImage(video,0,0,192,192);const data=s.ctx.getImageData(0,0,192,192).data;s.base=new Float32Array(192*192);for(let i=0;i<s.base.length;i++){const j=i*4;s.base[i]=data[j]*.2126+data[j+1]*.7152+data[j+2]*.0722;}}catch{ s.failed=true;refresh();}});
   video.addEventListener('error',()=>{s.failed=true;refresh();});
   getBitmap(v.cover).then(bitmap=>{if(!program)return;s.texture=texture();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);s.lighting=texture();s.ready=true;}).catch(()=>{s.failed=true;});
   return s;
  }
  function active(){return enabled&&!reduced.matches&&!document.hidden&&document.documentElement.dataset.effects!=='off'&&!!program&&!gl.isContextLost();}
  function reset(e){getBitmap(e.volume.cover).then(b=>{if(entries.get(e.canvas)!==e)return;e.ctx.clearRect(0,0,e.canvas.width,e.canvas.height);e.ctx.drawImage(b,0,0,e.canvas.width,e.canvas.height);}).catch(()=>{});}
  function refresh(){
   const on=active();document.documentElement.dataset.motion=on?'on':'off';
   const used=new Set();entries.forEach((e,c)=>{if(!c.isConnected){observer.unobserve(c);entries.delete(c);}else{const run=on&&e.visible&&!e.source.failed;e.wrap.dataset.motionActive=String(run);if(run)used.add(e.source);else if(e.animated){e.animated=false;reset(e);}}});
   sources.forEach(s=>{if(used.has(s)){if(!s.video.hasAttribute('src'))s.video.src=s.key;if(!s.playing){s.playing=true;s.video.play().catch(()=>{s.playing=false;});}}else{s.playing=false;s.video.pause();}});
   titles.forEach((t,node)=>{if(!node.isConnected)titles.delete(node);else if(!on||!used.has(t.source))node.style.filter=t.filter;});
   if(toggle){toggle.textContent=enabled?'Animations : activées':'Animations : en pause';toggle.setAttribute('aria-pressed',String(enabled));}
   const frame=document.getElementById('lyricsFrame');if(frame?.contentWindow)frame.contentWindow.postMessage({type:'avant-usine-motion',request:frame.dataset.request,motion:enabled?'on':'off'},'*');
   if(used.size&&!raf)raf=requestAnimationFrame(tick);else if(!used.size&&raf){cancelAnimationFrame(raf);raf=0;}
  }
  function update(s){if(!s.ready||s.failed||s.video.readyState<2)return false;
   s.ctx.drawImage(s.video,0,0,192,192);const data=s.ctx.getImageData(0,0,192,192).data;
   if(!s.base){s.base=new Float32Array(192*192);for(let i=0;i<s.base.length;i++){const j=i*4;s.base[i]=data[j]*.2126+data[j+1]*.7152+data[j+2]*.0722;}}
   let sum=0,count=0;for(let i=0;i<s.previous.length;i++){const j=i*4,delta=data[j]*.2126+data[j+1]*.7152+data[j+2]*.0722-s.base[i];const e=s.previous[i]=light(delta,s.previous[i]);if(Math.abs(e)>.04){sum+=e;count++;}data[j]=data[j+1]=data[j+2]=Math.round((e+.92)/6.92*255);data[j+3]=255;}s.avg=count?sum/count:0;
   gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,s.lighting);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,192,192,0,gl.RGBA,gl.UNSIGNED_BYTE,data);return true;
  }
  function tick(time){raf=0;if(!active()){refresh();return;}const low=document.documentElement.dataset.effects==='reduced',interval=low?200:100;
   if(time-last>=interval){last=time;const updated=new Set();entries.forEach(e=>{if(!e.visible||e.source.failed)return;const s=e.source;try{if(!updated.has(s)){if(!update(s))return;updated.add(s);}const bounds=e.canvas.getBoundingClientRect(),size=Math.min(1080,Math.max(1,Math.round(bounds.width*(window.devicePixelRatio||1))));surface.width=surface.height=size;gl.viewport(0,0,size,size);gl.useProgram(program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,s.texture);gl.uniform1i(original,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,s.lighting);gl.uniform1i(field,1);gl.uniform1f(gl.getUniformLocation(program,'strength'),low?.3:1);gl.drawArrays(gl.TRIANGLES,0,6);if(e.canvas.width!==size)e.canvas.width=e.canvas.height=size;e.ctx.drawImage(surface,0,0);e.animated=true;}catch(error){s.failed=true;reset(e);refresh();}});
    titles.forEach((t,node)=>{if(updated.has(t.source)&&node.isConnected){const brightness=clamp(.62+t.source.avg*10,low?.6:.12,1);node.style.filter=`${t.filter} brightness(${brightness})`.trim();}});
   }if(active()&&Array.from(entries.values()).some(e=>e.visible&&!e.source.failed))raf=requestAnimationFrame(tick);
  }
  const observer=new IntersectionObserver(changes=>{changes.forEach(c=>{const e=entries.get(c.target);if(e)e.visible=c.isIntersecting;});refresh();},{threshold:.01});
  function attach(canvas,volume){if(!volume.motion||!canvas.isConnected)return;let e=entries.get(canvas);if(e){e.volume=volume;e.source=source(volume);e.animated=false;refresh();return;}const wrap=document.createElement('span');wrap.className='au-motion-cover';canvas.replaceWith(wrap);wrap.append(canvas);e={canvas,wrap,volume,source:source(volume),ctx:canvas.getContext('2d'),visible:false,animated:false};entries.set(canvas,e);observer.observe(canvas);}
  function bindTitle(node,volume){if(node&&volume?.motion){const filter=titles.get(node)?.filter??(node.style.filter||'');titles.set(node,{source:source(volume),filter});node.style.filter=filter;}return node;}
  function init(){toggle=document.createElement('button');toggle.type='button';toggle.className='text-button au-motion-toggle';toggle.setAttribute('aria-label','Activer ou mettre en pause les animations');toggle.addEventListener('click',()=>{enabled=!enabled;try{localStorage.setItem('au-cover-motion',enabled?'on':'off');}catch{}refresh();});document.querySelector('.footer')?.append(toggle);const player=document.getElementById('audio');const playback=()=>document.documentElement.classList.toggle('au-audio-playing',!!player&&!player.paused&&!player.ended);['playing','pause','ended','emptied'].forEach(name=>player?.addEventListener(name,playback));playback();refresh();}
  document.addEventListener('visibilitychange',refresh);window.addEventListener('au:routechange',refresh);window.addEventListener('au:effects-change',refresh);reduced.addEventListener('change',refresh);surface.addEventListener('webglcontextlost',event=>{event.preventDefault();program=null;refresh();});
  return {attach,bindTitle,init};
 };
})();
