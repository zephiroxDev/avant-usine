export async function jpegCover(blob){
 const bitmap=await createImageBitmap(blob),canvas=document.createElement('canvas');
 const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
 canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Pochette illisible.')),'image/jpeg',.95));
}
const delay=(ms,signal)=>new Promise((resolve,reject)=>{const stop=()=>{clearTimeout(timer);reject(signal.reason||Error('Préparation annulée.'));},timer=setTimeout(()=>{signal?.removeEventListener('abort',stop);resolve();},ms);signal?.addEventListener('abort',stop,{once:true});if(signal?.aborted)stop();});
export async function animatedCover(api,volume,host,{signal,onprogress=()=>{}}={}){
 signal?.throwIfAborted();const {CanvasSource,BufferTarget,canEncodeVideo,Output,Mp4OutputFormat}=await import('./mediabunny-1.62.1.mjs');signal?.throwIfAborted();
 const width=720,frames=72,fps=24;
 if(!await canEncodeVideo('avc',{width,height:width,bitrate:2200000}))throw Error('Export de la pochette animée indisponible sur cet appareil.');
 const canvas=api.canvasFor(volume,width);canvas.classList.add('au21-export-cover');host.append(canvas);
 let output;
 try{
  for(let i=0;i<100&&canvas.dataset.coverState!=='ready';i++){signal?.throwIfAborted();if(canvas.dataset.coverState==='error')throw Error('La pochette ne peut pas être chargée.');await delay(100,signal);}
  if(canvas.dataset.coverState!=='ready')throw Error('La pochette met trop de temps à charger.');
  const target=new BufferTarget();output=new Output({format:new Mp4OutputFormat({fastStart:'in-memory'}),target});
  const source=new CanvasSource(canvas,{codec:'avc',bitrate:2200000});output.addVideoTrack(source);await output.start();
  for(let i=0;i<frames;i++){signal?.throwIfAborted();await source.add(i/fps,1/fps);onprogress((i+1)/frames);await delay(1000/fps,signal);}
  source.close();await output.finalize();return new Blob([target.buffer],{type:'video/mp4'});
 }catch(error){await output?.cancel().catch(()=>{});throw error;}finally{canvas.remove();}
}
