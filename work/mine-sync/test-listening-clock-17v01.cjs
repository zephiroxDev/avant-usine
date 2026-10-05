const assert=require('node:assert/strict');
const {ListeningClock,mergeCoverage}=require('../github-sync-import/listening-clock-17v01.js');
const clock=new ListeningClock();
const sample=(position,wallTime,playing=true,trackKey='1:1')=>clock.sample({position,wallTime,playing,trackKey});
assert.equal(sample(0,0),null);
assert.equal(sample(10,10000).seconds,10);
assert.equal(sample(200,11000),null); // seek must not count 190 seconds
assert.equal(sample(201,12000).seconds,1);
assert.equal(sample(201,22000,false),null);
assert.equal(sample(201,32000,true),null);
assert.equal(sample(201,42000),null); // buffering
assert.equal(sample(202,43000).seconds,1);
assert.equal(sample(240,90000),null); // long suspension
assert.equal(sample(0,91000,true,'1:2'),null);
assert.equal(clock.seconds,12);
assert.deepEqual(mergeCoverage([{startPosition:0,endPosition:30},{startPosition:20,endPosition:40},{startPosition:80,endPosition:120}],100),{playedSeconds:60,completion:0.6});
assert.equal(mergeCoverage([],NaN).completion,null);
console.log('PASS: played time, pauses, buffering, seeks, suspension, track changes and unique completion coverage.');
