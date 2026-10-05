/* Shared rules: summary year, access boundaries and calendar periods. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AU_SUMMARY_RULES=Object.freeze(api);})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const rarities=Object.freeze(['Minimal','Basique','Typique','Commun','Atypique','Rare','Très rare','Précieux','Extrêmement rare','Rarissime','Exotique','Extraordinairement rare']);
 const listeningHours=Object.freeze([1,5,15,30,60,120,250,500,900,1500,2200,3000]);
 const newYearMessage='Une nouvelle année commence ! Les compteurs de la nouvelle année repartent à zéro. Votre résumé, vos statistiques et vos trophées de l’année passée restent conservés dans votre historique.';
 function parisParts(instant){
  const d=new Date(instant);if(!Number.isFinite(d.getTime()))throw new RangeError('Date invalide');
  return Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(d).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
 }
 function parisMidnight(year,month=1,day=1){
  let value=Date.UTC(year,month-1,day);
  for(let i=0;i<3;i++){const p=parisParts(value);value+=Date.UTC(year,month-1,day)-Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);}
  return new Date(value).toISOString();
 }
 function annualPeriod(year){if(!Number.isInteger(year)||year<2026||year>9998)throw new RangeError('Année invalide');return Object.freeze({year,start:parisMidnight(year),end:parisMidnight(year+1),revealAt:parisMidnight(year+1)});}
 function publicEditionAllowed(year){return Number.isInteger(year)&&year>=2027;}
 function revealed(year,now=Date.now()){return new Date(now).getTime()>=Date.parse(annualPeriod(year).revealAt);}
 function trophyMayBeExhibited(trophy,now=Date.now()){return publicEditionAllowed(trophy.year)&&revealed(trophy.year,now)&&trophy.earned===true;}
 function calendarDate(value){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);if(!m)throw new RangeError('Date attendue au format AAAA-MM-JJ');
  const y=Number(m[1]),month=Number(m[2]),day=Number(m[3]);const date=new Date(Date.UTC(y,month-1,day));
  if(date.getUTCFullYear()!==y||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)throw new RangeError('Date inexistante');
  return {year:y,month,day,time:date.getTime()};
 }
 function addCalendarMonths(value,count){const p=calendarDate(value);const target=new Date(Date.UTC(p.year,p.month-1+count,1));const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();return new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth(),Math.min(p.day,last))).toISOString().slice(0,10);}
 function programmedPeriod(start,end,generateAt){
  const a=calendarDate(start),b=calendarDate(end),g=calendarDate(generateAt);
  // End is exclusive. A period from 1 January to 1 July covers six calendar months.
  if(b.time<=a.time||end>addCalendarMonths(start,6))throw new RangeError('La période doit être positive et ne pas dépasser six mois calendaires.');
  if(g.time<b.time)throw new RangeError('La génération doit avoir lieu après la période couverte.');
  return Object.freeze({start:parisMidnight(a.year,a.month,a.day),end:parisMidnight(b.year,b.month,b.day),generateAt:parisMidnight(g.year,g.month,g.day)});
 }
 function listeningTrophies(seconds,year,now=Date.now()){
  if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Durée invalide');
  return listeningHours.map((hours,index)=>Object.freeze({id:'listening-'+year+'-'+index,year,rarity:rarities[index],thresholdHours:hours,progress:Math.min(1,seconds/(hours*3600)),earned:revealed(year,now)&&seconds>=hours*3600,locked:!revealed(year,now),publicEligible:publicEditionAllowed(year)}));
 }
 function mayReadSummary({ownerId,viewerId,grant,summaryId}){return !!viewerId&&(viewerId===ownerId||!!(grant&&grant.summaryId===summaryId&&grant.viewerId===viewerId&&grant.ownerId===ownerId&&grant.accepted===true&&!grant.revoked));}
 return {rarities,listeningHours,newYearMessage,parisParts,parisMidnight,annualPeriod,publicEditionAllowed,revealed,trophyMayBeExhibited,addCalendarMonths,programmedPeriod,listeningTrophies,mayReadSummary};
});
