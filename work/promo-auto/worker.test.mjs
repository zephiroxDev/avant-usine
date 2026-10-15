import test from 'node:test';
import assert from 'node:assert/strict';
import {BufferAPI, processPromos, receipt, captionOf, videoOf} from './worker.mjs';

const item = {id:'19v09-all',patch:'19V09',platforms:['Site','Android'],animation:'promo-19v09-anime.mp4'};
const post = (status='scheduled') => ({id:'p1',channelId:'channel',text:captionOf(item),status,
  sentAt:status==='sent'?'2026-10-16T12:00:00Z':null,externalLink:'https://www.tiktok.com/@avant.l.usine/video/123'});
function fixture() {
  const state={config:{enabled:true,channelId:'channel',handle:'avant.l.usine',excludedPatches:[]},items:{}};
  const saves=[],created=[];
  const api={remote:[],current:post(),fail:false,channelData:{id:'channel',name:'avant.l.usine',service:'tiktok',isDisconnected:false,isLocked:false,isQueuePaused:false},
    async channel(){return this.channelData;},async posts(){return this.remote;},async post(){return this.current;},
    async create(...args){created.push(args);if(this.fail)throw Error('timeout');return this.current;}};
  const args={state,manifest:{images:[item]},api,persist:async s=>saves.push(structuredClone(s)),mediaReady:async()=>true};
  return {state,api,args,saves,created,run:()=>processPromos(args)};
}
test('persist before transmission; pending is not published',async()=>{
  const f=fixture();await f.run();assert.equal(f.saves[0].items['19v09'].status,'submitting');
  assert.equal(f.state.items['19v09'].published,false);assert.equal(f.created.length,1);
});
test('no journal means no outbound publication',async()=>{
  const f=fixture();f.args.persist=async()=>{throw Error('db down');};
  await assert.rejects(f.run());assert.equal(f.created.length,0);
});
test('repeated runs only check receipt, then mark sent',async()=>{
  const f=fixture();await f.run();f.api.current=post('sent');await f.run();await f.run();
  assert.equal(f.created.length,1);assert.equal(f.state.items['19v09'].published,true);
});
test('timeout never blindly resends',async()=>{
  const f=fixture();f.api.fail=true;await f.run();const second=await f.run();
  assert.equal(f.created.length,1);assert.ok(second.errors.includes('19v09:submission_uncertain'));
});
test('timeout reconciles with remote receipt',async()=>{
  const f=fixture();f.api.fail=true;await f.run();f.api.remote=[post('sent')];await f.run();
  assert.equal(f.created.length,1);assert.equal(f.state.items['19v09'].published,true);
});
test('existing video adopted without new post',async()=>{
  const f=fixture();f.api.remote=[post('sent')];await f.run();assert.equal(f.created.length,0);
  assert.equal(f.state.items['19v09'].published,true);
});
test('excluded old patches make zero Buffer calls',async()=>{
  const f=fixture();f.state.config.excludedPatches=['19v09'];f.api.channel=()=>{throw Error('must not call');};
  assert.equal((await f.run()).idle,true);
});
test('disabled worker makes zero Buffer calls',async()=>{
  const f=fixture();f.state.config.enabled=false;f.api.channel=()=>{throw Error('must not call');};
  assert.equal((await f.run()).disabled,true);
});
test('same patch across platforms posts once',async()=>{
  const f=fixture();f.args.manifest.images.push({...item,id:'19v09-mobile'});await f.run();assert.equal(f.created.length,1);
});
test('wrong account, network, unavailable channel rejected',async()=>{
  for(const delta of [{name:'other'},{service:'instagram'},{isDisconnected:true},{isLocked:true},{isQueuePaused:true}]){
    const f=fixture();Object.assign(f.api.channelData,delta);await assert.rejects(f.run());assert.equal(f.created.length,0);
  }
});
test('media not deployed yet is retried later without intent',async()=>{
  const f=fixture();f.args.mediaReady=async()=>false;await f.run();assert.equal(f.created.length,0);assert.deepEqual(f.state.items,{});
});
test('accepted publication tracked after catalogue removal',async()=>{
  const f=fixture();await f.run();f.args.manifest.images=[];f.api.current=post('sent');await f.run();
  assert.equal(f.state.items['19v09'].published,true);
});
test('draft, errors and sending are never marked published',()=>{
  for(const status of ['draft','needs_approval','error','scheduled','sending']){
    const r={};receipt(r,post(status),'channel');assert.equal(r.published,false);
  }
  const r={};receipt(r,{...post('sent'),sentAt:null},'channel');assert.equal(r.published,false);
});
test('wrong channel receipt cannot mark publication',()=>{
  assert.throws(()=>receipt({},post('sent'),'other'));
});
test('external media and traversal paths rejected',()=>{
  for(const animation of ['https://bad.example/a.mp4','../private.mp4','promo-a.mp4?x=y'])assert.throws(()=>videoOf({...item,animation}));
});
test('Buffer mutation uses actual automatic video mode without retry',async()=>{
  let calls=0;const api=new BufferAPI('test-key',async(url,options)=>{
    calls++;assert.equal(url,'https://api.buffer.com');const {variables}=JSON.parse(options.body);
    assert.equal(variables.input.mode,'shareNow');assert.equal(variables.input.schedulingType,'automatic');
    assert.equal(variables.input.needsApproval,false);assert.ok(variables.input.assets[0].video.url);
    throw Error('timeout');
  });
  await assert.rejects(api.create('channel','caption',videoOf(item)));assert.equal(calls,1);
});
