/* Counts played time, not seeks, buffering, pauses or background wall time. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AU_LISTENING_CLOCK=api;})(globalThis,function(){
 'use strict';
 class ListeningClock {
  constructor(){this.previous=null;this.coverage=[];this.seconds=0;}
  sample({position,wallTime,playing,trackKey,rate=1}){
   if(!Number.isFinite(position)||!Number.isFinite(wallTime)||!Number.isFinite(rate)||rate<=0){this.previous=null;return null;}
   const next={position,wallTime,playing:!!playing,trackKey,rate};const previous=this.previous;this.previous=next;
   if(!previous||!playing||!previous.playing||previous.trackKey!==trackKey)return null;
   const wall=(wallTime-previous.wallTime)/1000,advance=position-previous.position;
   if(wall<=0||wall>35||advance<=0||advance>wall*Math.max(rate,previous.rate)+0.5)return null;
   const seconds=Math.min(wall,advance/rate);
   this.seconds+=seconds;
   return {trackKey,seconds,startPosition:previous.position,endPosition:position,startedAt:previous.wallTime,endedAt:wallTime};
  }
  reset(){this.previous=null;}
 }
 function mergeCoverage(segments,duration){
  if(!Number.isFinite(duration)||duration<=0)return {playedSeconds:0,completion:null};
  const ranges=segments.filter(s=>Number.isFinite(s.startPosition)&&Number.isFinite(s.endPosition)&&s.endPosition>s.startPosition).map(s=>[Math.max(0,s.startPosition),Math.min(duration,s.endPosition)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
  let playedSeconds=0,start=null,end=null;
  for(const [a,b]of ranges){if(start===null){start=a;end=b;}else if(a<=end){end=Math.max(end,b);}else{playedSeconds+=end-start;start=a;end=b;}}
  if(start!==null)playedSeconds+=end-start;
  return {playedSeconds,completion:Math.min(1,playedSeconds/duration)};
 }
 return {ListeningClock,mergeCoverage};
});
