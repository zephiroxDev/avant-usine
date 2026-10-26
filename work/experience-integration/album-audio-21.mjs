import{AudioBufferSource,BufferTarget,canEncodeAudio,Output,Mp4OutputFormat,WavOutputFormat}from'./mediabunny-1.62.1.mjs';

export async function exportAudio(blob,{edit,tags={},cover,signal,onprogress=()=>{}}={}){
 signal?.throwIfAborted();const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
 if(!Context)throw Error('Cet appareil ne permet pas de préparer les fichiers audio.');
 const context=new Context();let decoded;
 try{decoded=await context.decodeAudioData(await blob.arrayBuffer());}finally{await context.close();}
 signal?.throwIfAborted();const normalized=globalThis.AU_AUDIO_EDITS_19.normalize(edit,decoded.duration);
 const e=normalized||{start:0,end:decoded.duration,length:decoded.duration,fadeIn:0,fadeOut:0};
 const channels=decoded.numberOfChannels,rate=decoded.sampleRate;
 const bitrate=channels===1?128000:256000;
 const aac=await canEncodeAudio('aac',{numberOfChannels:channels,sampleRate:rate,bitrate});
 const codec=aac?'aac':'pcm-s16',format=aac?new Mp4OutputFormat({fastStart:'in-memory'}):new WavOutputFormat();
 const target=new BufferTarget(),output=new Output({format,target});
 const source=new AudioBufferSource({codec,...(aac?{bitrate}:{})});output.addAudioTrack(source);
 const metadata={...tags};if(cover)metadata.images=[{data:new Uint8Array(await cover.arrayBuffer()),mimeType:cover.type,kind:'coverFront'}];
 output.setMetadataTags(metadata);await output.start();
 try{
  const start=Math.round(e.start*rate),end=Math.min(decoded.length,Math.round(e.end*rate));
  // Encode small consecutive windows; never allocate a second whole decoded track.
  for(let at=start;at<end;at+=rate){
   signal?.throwIfAborted();const length=Math.min(rate,end-at),buffer=new AudioBuffer({length,numberOfChannels:channels,sampleRate:rate});
   for(let c=0;c<channels;c++){
    const input=decoded.getChannelData(c),data=buffer.getChannelData(c);
    for(let i=0;i<length;i++){
     const time=(at+i)/rate,enter=e.fadeIn?Math.max(0,(time-e.start)/e.fadeIn):1,leave=e.fadeOut?Math.max(0,(e.end-time)/e.fadeOut):1;
     data[i]=input[at+i]*Math.min(1,enter,leave);
    }
   }
   await source.add(buffer);onprogress((at+length-start)/(end-start));
  }
  source.close();await output.finalize();
  return{blob:new Blob([target.buffer],{type:aac?'audio/mp4':'audio/wav'}),extension:aac?'m4a':'wav',edit:e,duration:e.length,codec};
 }catch(error){await output.cancel().catch(()=>{});throw error;}
}
