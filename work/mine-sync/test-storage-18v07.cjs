const test=require('node:test'),assert=require('node:assert/strict');
const api=require('../github-sync-import/local-storage-18v07.js');
test('Owned audio survives source removal, preserves exact bytes and nested assets',async()=>{
 const bytes=Uint8Array.from({length:api.CHUNK+17},(_,i)=>i%251),source=new File([bytes],'song.wav',{type:'audio/wav'});
 const record={id:'song',blob:source,cover:{blob:new Blob(['cover'],{type:'image/png'})},lyrics:{lines:['Une'],times:[1]},order:2};
 const saved=await api.encode(record);assert.equal(saved.blob.auOwnedBinary,1);assert.equal(saved.blob.chunks.length,2);assert.equal(api.needsMigration(saved),false);assert.equal(api.needsMigration(record),true);
 bytes.fill(0);const restored=await api.decode(structuredClone(saved));assert.equal(restored.blob.type,'audio/wav');assert.deepEqual(new Uint8Array(await restored.blob.arrayBuffer()),Uint8Array.from({length:api.CHUNK+17},(_,i)=>i%251));assert.equal(await restored.cover.blob.text(),'cover');assert.deepEqual(restored.lyrics,record.lyrics);
});
test('Corrupted, truncated or missing chunks are rejected',async()=>{
 const saved=await api.encode(new Blob(['original']));const corrupt=structuredClone(saved);new Uint8Array(corrupt.chunks[0])[0]^=1;await assert.rejects(api.decode(corrupt));
 await assert.rejects(api.decode({...saved,chunks:[]}));await assert.rejects(api.decode({...saved,size:100}));
});
test('Unreadable picker file fails before storage and can be retried',async()=>{
 class Broken extends Blob{slice(){return {arrayBuffer:async()=>{throw Error('source removed');}};}}
 const file=new Broken(['audio']);await assert.rejects(api.encode(file),/source removed/);await assert.rejects(api.encode(file),/source removed/);await assert.rejects(api.decode(file),/source removed/);
 const empty=await api.decode(await api.encode(new Blob([])));assert.equal(empty.size,0);
});
