
export async function exportAudio(blob,{edit,tags={},cover,signal,onprogress=()=>{},format:requested='auto'}={}){
 if(!['auto','mp3','m4a','wav'].includes(requested))throw Error('Format audio non pris en charge.');
 signal?.throwIfAborted();const {AudioBufferSource,BufferTarget,canEncodeAudio,Output,Mp4OutputFormat,WavOutputFormat,Mp3OutputFormat}=await import('./mediabunny-1.62.1.mjs');signal?.throwIfAborted();const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
 if(!Context)throw Error('Cet appareil ne permet pas de préparer les fichiers audio.');
 const context=new Context();let decoded;
 try{decoded=await context.decodeAudioData(await blob.arrayBuffer());}finally{await context.close();}
 signal?.throwIfAborted();const normalized=globalThis.AU_AUDIO_EDITS_19.normalize(edit,decoded.duration);
 const e=normalized||{start:0,end:decoded.duration,length:decoded.duration,fadeIn:0,fadeOut:0};
 const channels=decoded.numberOfChannels,rate=decoded.sampleRate;
 const bitrate=channels===1?128000:256000;
 const aac=await canEncodeAudio('aac',{numberOfChannels:channels,sampleRate:rate,bitrate});
 if(requested==='mp3'&&!(await canEncodeAudio('mp3'))){const {registerMp3Encoder}=await import('./mediabunny-mp3-encoder-1.63.0.mjs');registerMp3Encoder();}
 if(requested==='m4a'&&!aac)throw Error('La conversion M4A n’est pas disponible sur cet appareil. Choisis MP3, WAV ou le format d’origine.');
 const choice=requested==='auto'?(aac?'m4a':'wav'):requested,codec=choice==='m4a'?'aac':choice==='mp3'?'mp3':'pcm-s16',format=choice==='m4a'?new Mp4OutputFormat({fastStart:'in-memory'}):choice==='mp3'?new Mp3OutputFormat():new WavOutputFormat();
 const target=new BufferTarget(),output=new Output({format,target});
 const source=new AudioBufferSource({codec,...(choice!=='wav'?{bitrate}:{})});output.addAudioTrack(source);
 const metadata=Object.fromEntries(['title','artist','album','genre','comment','lyrics','trackNumber'].filter(k=>tags[k]!==undefined&&tags[k]!=='').map(k=>[k,tags[k]]));if(tags.date instanceof Date)metadata.date=tags.date;else if(/^\d{4}$/.test(String(tags.year||'')))metadata.date=new Date(String(tags.year)+'-01-01T00:00:00Z');if(cover)metadata.images=[{data:new Uint8Array(await cover.arrayBuffer()),mimeType:cover.type,kind:'coverFront'}];
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
  return{blob:new Blob([target.buffer],{type:choice==='m4a'?'audio/mp4':choice==='mp3'?'audio/mpeg':'audio/wav'}),extension:choice,edit:e,duration:e.length,codec};
 }catch(error){await output.cancel().catch(()=>{});throw error;}
}
