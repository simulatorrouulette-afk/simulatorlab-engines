// Built from the owner's playable poker state-machine design; evaluator/cards are
// retained from PokerLab. Betting, pots, bot boundary and statistics are revised.
import { shuffle, randomInt } from '../random.ts';
import { evaluateBestHand, compareScores } from './evaluator.ts';
import { getRank, getSuit } from './cards.ts';

export type Profile = 'careful' | 'balanced' | 'aggressive';
export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type Player = { id:number; stack:number; cards:number[]; folded:boolean; streetBet:number; invested:number; actedAt:number|null; last:string; profile:Profile };
export type Action = {type:'fold'|'check'|'call'} | {type:'raise';target:number};
export type Pot = {amount:number; eligible:number[]; winners:number[]; refund:boolean};
export type Game = {players:Player[]; board:number[]; deck:number[]; dealer:number; sb:number; bb:number; actor:number|null; currentBet:number; minRaise:number; street:Street; phase:'playing'|'finished'; hand:number; initial:number; topUps?:number; smallBlind:number; bigBlind:number; result:null|{pots:Pot[]; awards:number[]; heroHand:string|null}; stats:{hands:number;wins:number;biggestPot:number;lastHand:string|null} };
const active = (p:Player) => !p.folded && p.stack>0;
const needs = (p:Player, g:Game) => active(p) && (p.actedAt===null || p.streetBet<g.currentBet);
const chips = (n:number) => Number.isSafeInteger(n) && n>=0 && n<=1_000_000;
const next = (g:Game, from:number, predicate:(p:Player)=>boolean):number|null => {
  for(let offset=1;offset<=g.players.length;offset++) { const i=(from+offset+g.players.length)%g.players.length; if(predicate(g.players[i])) return i; }
  return null;
};
function pay(p:Player,n:number) { const amount=Math.min(p.stack,n); p.stack-=amount; p.streetBet+=amount; p.invested+=amount; }
export const potSize = (g:Game) => g.players.reduce((n,p)=>n+p.invested,0);

export function createGame(opponents=3, initial=1000, smallBlind=5, bigBlind=10):Game {
  if(!Number.isInteger(opponents)||opponents<1||opponents>5||!chips(initial)||initial<bigBlind*2||!chips(smallBlind)||smallBlind<1||!chips(bigBlind)||bigBlind<=smallBlind) throw new Error('INVALID_SETUP');
  const g:Game={players:Array.from({length:opponents+1},(_,id)=>({id,stack:initial,cards:[],folded:false,streetBet:0,invested:0,actedAt:null,last:'',profile:(['balanced','careful','aggressive'] as Profile[])[id%3]})),board:[],deck:[],dealer:-1,sb:0,bb:1,actor:null,currentBet:0,minRaise:bigBlind,street:'preflop',phase:'finished',hand:0,initial,smallBlind,bigBlind,result:null,stats:{hands:0,wins:0,biggestPot:0,lastHand:null}};
  return nextHand(g);
}
export function nextHand(previous:Game):Game {
  if(previous.phase!=='finished') throw new Error('HAND_IN_PROGRESS');
  const g=structuredClone(previous);
  if(g.players.filter(p=>p.stack>0).length<2 || g.players[0].stack===0) return g;
  g.players.forEach(p=>{p.folded=p.stack===0;p.cards=[];p.streetBet=0;p.invested=0;p.actedAt=null;p.last='';});
  g.deck=shuffle(Array.from({length:52},(_,i)=>i));g.board=[];g.hand++;g.result=null;g.phase='playing';g.street='preflop';g.currentBet=g.bigBlind;g.minRaise=g.bigBlind;
  g.dealer=next(g,g.dealer,p=>p.stack>0)!;
  const headsup=g.players.filter(p=>p.stack>0).length===2;
  g.sb=headsup?g.dealer:next(g,g.dealer,p=>p.stack>0)!;
  g.bb=next(g,g.sb,p=>p.stack>0)!;
  for(let round=0;round<2;round++) for(let offset=1;offset<=g.players.length;offset++) {
    const p=g.players[(g.dealer+offset)%g.players.length]; if(!p.folded) p.cards.push(g.deck.shift()!);
  }
  pay(g.players[g.sb],g.smallBlind);pay(g.players[g.bb],g.bigBlind);
  g.players[g.sb].last='sb';g.players[g.bb].last='bb';
  g.actor=next(g,g.bb,active);
  return resolve(g,g.bb);
}

/** Independently settle each contribution layer; folded chips remain in pots. */
export function distributePots(players:Player[],board:number[],dealer:number):{pots:Pot[];awards:number[]} {
  const levels=[...new Set(players.map(p=>p.invested).filter(n=>n>0))].sort((a,b)=>a-b);
  const awards=players.map(()=>0),pots:Pot[]=[];
  let previous=0;
  for(const level of levels) {
    const contributors=players.map((p,i)=>({p,i})).filter(({p})=>p.invested>=level);
    const amount=(level-previous)*contributors.length;previous=level;
    const eligible=contributors.filter(({p})=>!p.folded).map(({i})=>i);
    let winners:number[]=[];
    if(contributors.length===1) winners=[contributors[0].i]; // uncalled excess is returned
    else if(eligible.length===1) winners=[eligible[0]];
    else if(eligible.length>1) {
      let best:readonly number[]=[];
      for(const i of eligible) {
        const score=evaluateBestHand([...players[i].cards,...board]).score;
        const comparison=compareScores(score,best);
        if(comparison>0) {best=score;winners=[i];} else if(comparison===0) winners.push(i);
      }
    } else throw new Error('INVALID_POT');
    winners.sort((a,b)=>((a-dealer-1+players.length)%players.length)-((b-dealer-1+players.length)%players.length));
    const share=Math.floor(amount/winners.length),remainder=amount%winners.length;
    winners.forEach((i,k)=>awards[i]+=share+Number(k<remainder));
    pots.push({amount,eligible,winners,refund:contributors.length===1});
  }
  return {pots,awards};
}
function finish(g:Game):Game {
  const live=g.players.filter(p=>!p.folded);
  if(live.length>1) while(g.board.length<5) g.board.push(g.deck.shift()!);
  const result=distributePots(g.players,g.board,g.dealer);
  const hero=g.players[0];
  const heroHand=!hero.folded&&g.board.length===5 ? evaluateBestHand([...hero.cards,...g.board]) : null;
  const handKey=heroHand?.isRoyalFlush?'royal-flush':heroHand?.category??null;
  const wonPots=result.pots.filter(p=>p.winners.includes(0)&&!p.refund);
  // A fold win still counts, but an unmatched return alone does not.
  const won=wonPots.length>0;
  g.stats.hands++;g.stats.wins+=Number(won);
  if(won) {g.stats.biggestPot=Math.max(g.stats.biggestPot,wonPots.reduce((sum,p)=>sum+p.amount,0));if(handKey) g.stats.lastHand=handKey;}
  g.players.forEach((p,i)=>p.stack+=result.awards[i]);
  g.result={...result,heroHand:handKey};g.phase='finished';g.actor=null;
  return g;
}
function resolve(g:Game,from:number):Game {
  if(g.players.filter(p=>!p.folded).length===1) return finish(g);
  const actors=g.players.filter(active);
  if(actors.length===0 || (actors.length===1 && actors[0].streetBet>=g.currentBet)) return finish(g);
  const actor=next(g,from,p=>needs(p,g));
  if(actor!==null) {g.actor=actor;return g;}
  if(g.street==='river') return finish(g);
  const count=g.street==='preflop'?3:1;
  g.street=g.street==='preflop'?'flop':g.street==='flop'?'turn':'river';
  g.deck.shift(); // burn before each dealt street
  for(let i=0;i<count;i++) g.board.push(g.deck.shift()!);
  g.currentBet=0;g.minRaise=g.bigBlind;
  g.players.forEach(p=>{p.streetBet=0;p.actedAt=null;p.last='';});
  return resolve(g,g.dealer);
}
export function legalActions(g:Game,index=g.actor??0) {
  const p=g.players[index];
  const turn=g.phase==='playing'&&g.actor===index&&active(p);
  const call=Math.min(p.stack,Math.max(0,g.currentBet-p.streetBet));
  const max=p.stack+p.streetBet;
  const reopened=p.actedAt===null || g.currentBet-p.actedAt>=g.minRaise;
  const canRaise=turn&&reopened&&max>g.currentBet&&g.players.some((other,i)=>i!==index&&active(other));
  return {turn,call,canCheck:turn&&call===0,canRaise,min:Math.min(max,g.currentBet===0?g.bigBlind:g.currentBet+g.minRaise),max};
}
export function act(input:Game,action:Action):Game {
  if(input.phase!=='playing'||input.actor===null) throw new Error('NO_ACTIVE_PLAYER');
  const allowed=legalActions(input);
  const g=structuredClone(input), index=g.actor!,p=g.players[index];
  if(action.type==='fold') {p.folded=true;p.last='fold';}
  else if(action.type==='check') {if(!allowed.canCheck) throw new Error('CANNOT_CHECK');p.last='check';}
  else if(action.type==='call') {if(!allowed.call) throw new Error('NOTHING_TO_CALL');pay(p,allowed.call);p.last=p.stack?'call':'all-in';}
  else if(action.type==='raise') {
    if(!allowed.canRaise||!Number.isSafeInteger(action.target)||action.target<allowed.min||action.target>allowed.max) throw new Error('INVALID_RAISE');
    const increase=action.target-g.currentBet;
    pay(p,action.target-p.streetBet);
    p.last=p.stack?(g.currentBet?'raise':'bet'):'all-in';
    g.currentBet=action.target;
    if(increase>=g.minRaise) g.minRaise=increase;
  } else throw new Error('INVALID_ACTION');
  p.actedAt=g.currentBet;
  return resolve(g,index);
}

/** Bot receives no opponent hole cards and no remaining deck. */
export type BotView = {cards:number[];board:number[];pot:number;call:number;min:number;max:number;canRaise:boolean;profile:Profile;position:number;opponents:number;street:Street};
export function botView(g:Game):BotView {
  if(g.actor===null) throw new Error('NO_ACTIVE_PLAYER');
  const p=g.players[g.actor], legal=legalActions(g);
  return {cards:[...p.cards],board:[...g.board],pot:potSize(g),call:legal.call,min:legal.min,max:legal.max,canRaise:legal.canRaise,profile:p.profile,position:(g.actor-g.dealer+g.players.length)%g.players.length,opponents:g.players.filter(p=>!p.folded).length-1,street:g.street};
}
export function chooseBotAction(view:BotView,random=()=>randomInt(1_000_000)/1_000_000):Action {
  const ranks=view.cards.map(getRank).sort((a,b)=>b-a);
  let strength=(ranks[0]-2)/20+(ranks[1]-2)/36+(ranks[0]===ranks[1]?0.32:0)+(getSuit(view.cards[0])===getSuit(view.cards[1])?0.07:0)+(ranks[0]-ranks[1]<=2?0.05:0);
  if(view.board.length>=3) {
    const h=evaluateBestHand([...view.cards,...view.board]);
    strength=0.15+h.score[0]*0.12+(h.score[1]??0)/100;
    if(view.board.length<5) {
      const all=[...view.cards,...view.board];
      const suits=all.map(getSuit);
      if(suits.some(s=>suits.filter(x=>x===s).length===4)) strength+=0.12;
      const unique=[...new Set(all.map(getRank))];if(unique.includes(14)) unique.push(1 as never);
      if(Array.from({length:10},(_,i)=>i+1).some(start=>unique.filter(r=>r>=start&&r<start+5).length===4)) strength+=0.07;
    }
  }
  const aggression={careful:-0.1,balanced:0,aggressive:0.12}[view.profile];
  strength+=aggression+(view.position===0?0.04:0)-Math.max(0,view.opponents-1)*0.025;
  const pressure=view.call/Math.max(1,view.pot+view.call),roll=random();
  if(view.call && strength+roll*0.25<pressure+0.28) return {type:'fold'};
  if(view.canRaise && ((strength>0.65&&roll>0.4-aggression)||(roll>0.97-aggression*0.15))) return {type:'raise',target:Math.min(view.max,Math.max(view.min,Math.round(view.pot*(0.45+Math.max(0,aggression)))))};
  return {type:view.call?'call':'check'};
}

