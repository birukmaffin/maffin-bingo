const C=require(require('path').join(__dirname,'../js/core.js'));const assert=require('assert');
assert.strictEqual(C.sha256('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
assert.strictEqual(C.sha256(''),'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
assert.strictEqual(C.sha256('a'.repeat(100)),require('crypto').createHash('sha256').update('a'.repeat(100)).digest('hex'));
const sigs=new Set();
for(let k=0;k<20000;k++){const g=C.genCardNums();assert.strictEqual(g.length,25);assert.strictEqual(g[12],0);
 const nums=g.filter((_,i)=>i!==12);assert.strictEqual(new Set(nums).size,24);
 for(let i=0;i<25;i++){if(i===12)continue;const c=i%5;assert(g[i]>=C.RANGES[c][0]&&g[i]<=C.RANGES[c][1]);}
 sigs.add(g.join(','));}
console.log('distinct of 20000:',sigs.size);
const card=C.genCardNums();
for(const L of C.LINES){const called=new Set(L.cells.filter(i=>i!==12).map(i=>card[i]));assert(C.winningLines(card,called).some(x=>x.type===L.type&&x.idx===L.idx),L.type);}
assert.strictEqual(C.winningLines(card,new Set()).length,0);
const L0=C.LINES[0];const part=new Set(L0.cells.slice(0,4).map(i=>card[i]));assert.strictEqual(C.winningLines(card,part).length,0);
const seq=[...L0.cells.map(i=>card[i]).filter(Boolean)];assert.strictEqual(C.firstWinCall(card,[...seq]),seq.length);
const f=C.gameFinance({price:20,commission:20,sales:[{cardIds:Array.from({length:100},(_, i)=>i)}]});
assert.deepStrictEqual(f,{sold:100,revenue:2000,commission:400,prize:1600});
const cnt=new Array(75).fill(0);for(let i=0;i<150000;i++)cnt[C.rnd(75)]++;console.log('draw min/max',Math.min(...cnt),Math.max(...cnt),'expected 2000');
console.log([1,10,11,12,19,20,21,35,50,64,75].map(n=>n+':'+C.amNum(n)).join(' | '));
console.log(JSON.stringify(C.parseIds('5, 8-12 #20 x')));
for(let n=1;n<=75;n++)assert(C.amNum(n)&&!/^\d/.test(C.amNum(n)));
console.log('core OK');
