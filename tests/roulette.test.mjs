import test from 'node:test';
import assert from 'node:assert/strict';
import { randomInt, shuffle } from '../src/engines/random.ts';
import { AMERICAN_WHEEL, EUROPEAN_WHEEL, betCatalog, sector, settle, spin, validateStakes, emptyStats, updateStats } from '../src/engines/roulette.ts';

test('wheels contain each pocket once and keep original sequence', () => {
  assert.equal(new Set(EUROPEAN_WHEEL).size,37);
  assert.equal(new Set(AMERICAN_WHEEL).size,38);
  assert.deepEqual([...EUROPEAN_WHEEL].sort((a,b)=>a-b),Array.from({length:37},(_,i)=>i));
  assert.deepEqual([...AMERICAN_WHEEL].sort((a,b)=>a-b),Array.from({length:38},(_,i)=>i));
  assert.deepEqual(EUROPEAN_WHEEL.slice(0,6),[0,32,15,19,4,21]);
  assert.equal(AMERICAN_WHEEL[19],37);
});

for (const variant of ['european','american','french']) {
  test(`${variant}: all catalog bets pay their stated inclusive return on every covered pocket`, () => {
    const catalog = betCatalog(variant);
    assert.equal(new Set(catalog.map(b=>b.id)).size,catalog.length);
    for (const bet of catalog) {
      assert.equal(new Set(bet.numbers).size,bet.numbers.length);
      for (const n of variant === 'american' ? AMERICAN_WHEEL : EUROPEAN_WHEEL) {
        const paid = settle(variant,[{id:bet.id,amount:10}],n);
        const expected = bet.numbers.includes(n) ? 10*bet.returnMultiplier : variant==='french' && n===0 && bet.partage ? 5 : 0;
        assert.equal(paid.returned,expected,`${bet.id}, pocket ${n}`);
        assert.equal(paid.net,expected-10);
      }
    }
  });
}

test('American first-five is 6:1 profit, not 36/5', () => {
  for (const n of [0,37,1,2,3]) assert.equal(settle('american',[{id:'basket:0,1,2,3,37',amount:10}],n).returned,70);
  assert.throws(()=>settle('european',[{id:'basket:0,1,2,3,37',amount:10}],0));
});
test('zero and double-zero never win even-money bets', () => {
  for (const n of [0,37]) for (const id of ['red','black','odd','even','low','high']) assert.equal(settle('american',[{id,amount:10}],n).returned,0);
});
test('La Partage returns exactly half only for eligible outside bets', () => {
  assert.equal(settle('french',[{id:'red',amount:1}],0).returned,0.5);
  assert.equal(settle('french',[{id:'dozen:1',amount:10}],0).returned,0);
  assert.equal(settle('french',[{id:'straight:0',amount:10}],0).returned,360);
  assert.equal(settle('european',[{id:'red',amount:10}],0).returned,0);
});
test('sectors expand to weighted standard bets, including overlapping Orphelins splits', () => {
  assert.equal(sector('voisins',10).reduce((n,b)=>n+b.amount,0),90);
  assert.equal(sector('tiers',10).reduce((n,b)=>n+b.amount,0),60);
  assert.equal(sector('orphelins',10).reduce((n,b)=>n+b.amount,0),50);
  assert.equal(settle('french',sector('voisins',10),0).returned,240);
  assert.equal(settle('french',sector('voisins',10),25).returned,180);
  assert.equal(settle('french',sector('orphelins',10),17).returned,360);
  for (const name of ['voisins','tiers','orphelins']) assert.doesNotThrow(()=>validateStakes('french',sector(name,10),1000));
});
test('reject impossible bets, negative amounts and overspending', () => {
  for (const amount of [NaN,Infinity,-1,0,0.5]) assert.throws(()=>validateStakes('european',[{id:'red',amount}],1000));
  assert.throws(()=>validateStakes('european',[{id:'split:1,36',amount:10}],1000));
  assert.throws(()=>validateStakes('european',[{id:'red',amount:11}],10));
  assert.throws(()=>validateStakes('european',[],1000));
  assert.throws(()=>settle('french',[{id:'red',amount:1}],37));
});
test('partial returns are losses; history remains bounded without losing aggregates', () => {
  let stats = emptyStats();
  for(let i=0;i<30;i++) stats = updateStats(stats,settle('french',[{id:'red',amount:10}],0));
  assert.equal(stats.spins,30);
  assert.equal(stats.recent.length,20);
  assert.equal(stats.losses,30);
  assert.equal(stats.wins,0);
  assert.equal(stats.net,-150);
  assert.equal(stats.wagered,300);
  assert.equal(updateStats(stats,settle('european',[{id:'red',amount:10},{id:'black',amount:10}],1)).wins,0);
});
test('unbiased RNG rejects the incomplete modulo tail', () => {
  let calls=0;
  const value=randomInt(37,buffer=>{buffer[0]= calls++ === 0 ? 0xffffffff : 38; return buffer;});
  assert.equal(calls,2);
  assert.equal(value,1);
  for(const bad of [0,-1,NaN,Infinity,2.5,0x100000001]) assert.throws(()=>randomInt(bad));
});
test('real crypto produces valid pockets and a complete shuffled deck', () => {
  for(const variant of ['european','american','french']) for(let i=0;i<50;i++) assert.ok((variant==='american'?AMERICAN_WHEEL:EUROPEAN_WHEEL).includes(spin(variant)));
  const deck=Array.from({length:52},(_,i)=>i);
  assert.deepEqual(shuffle(deck).sort((a,b)=>a-b),deck);
});

