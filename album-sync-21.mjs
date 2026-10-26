// Published timing remains in original-audio coordinates. Only exported copies
// use the new, zero-based audio clock. Overlapping voices stay independent.
const interpolate=(points,time)=>{
 if(time<=points[0][1])return points[0][0];
 for(let i=1;i<points.length;i++)if(time<=points[i][1]){const[a,t]=points[i-1],[b,u]=points[i];return u===t?b:a+(b-a)*(time-t)/(u-t);}
 return points.at(-1)[0];
};
export function exportSync(data,range){
 if(!data?.lines?.length)return null;
 const start=Number(range?.start)||0,end=Number(range?.end??data.duration??data.end_time);
 if(!Number.isFinite(end)||end<=start)throw Error('Durée du fichier exporté indisponible.');
 const out=structuredClone(data),rows=[];
 for(let i=0;i<data.lines.length;i++){
  const points=data.curves?.[i],from=data.times?.[i]??data.block_times?.[i]??points?.[0]?.[1];
  const until=data.line_ends?.[i]??points?.at(-1)?.[1]??data.times?.slice(i+1).find(t=>t>from)??data.end_time??end;
  if(!Number.isFinite(from)||!Number.isFinite(until)||until<=start||from>=end)continue;
  const begin=Math.max(from,start),finish=Math.min(until,end);if(finish<=begin)continue;
  let text=data.lines[i],curve=null;
  if(Array.isArray(points)&&points.length>=2){
   const chars=Array.from(text),left=begin>from?Math.floor(interpolate(points,begin)):0,right=finish<until?Math.ceil(interpolate(points,finish)):chars.length;
   text=chars.slice(left,right).join('');if(!text)continue;
   if(begin===from&&finish===until)curve=points.map(([x,t])=>[x,t-start]);
   else{curve=[[0,begin-start]];for(const[x,t]of points)if(t>begin&&t<finish&&x>left&&x<right)curve.push([x-left,t-start]);curve.push([right-left,finish-start]);}
  }
  rows.push({i,text,start:begin-start,end:finish-start,curve});
 }
 if(!rows.length)return null;
 const pick=key=>rows.map(r=>data[key]?.[r.i]);
 out.lines=rows.map(r=>r.text);out.times=rows.map(r=>r.start);out.line_ends=rows.map(r=>r.end);
 out.duration=end-start;out.end_time=Math.max(...out.line_ends);
 if(data.curves)out.curves=rows.map(r=>r.curve);
 if(data.block_times)out.block_times=[...out.times];
 if(data.line_tracks)out.line_tracks=pick('line_tracks');
 if(data.line_groups){const groups=new Map();out.line_groups=pick('line_groups').map(g=>{if(!groups.has(g))groups.set(g,groups.size);return groups.get(g);});}
 // An embedded studio project would otherwise retain the old audio clock.
 delete out.studio;delete out.project;
 out.timing_base='exported-audio';out.source_cut={start,end};
 return out;
}

export function syncLrc(data){
 if(!data||data.sync_mode==='highlight')return null;
 const stamp=time=>{const t=Math.round(time*100);return'['+String(Math.floor(t/6000)).padStart(2,'0')+':'+String(Math.floor(t/100)%60).padStart(2,'0')+'.'+String(t%100).padStart(2,'0')+']';};
 return data.lines.map((line,i)=>stamp(data.times[i])+line).join('\n');
}
