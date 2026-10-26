// Wheel order and number colours are shared with the Simulator Lab implementation.
import { randomInt } from "./random.ts";

export type Variant = "european" | "american" | "french";
export const DOUBLE_ZERO = 37;
export const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
export const EUROPEAN_WHEEL = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
export const AMERICAN_WHEEL = [0,28,9,26,30,11,7,20,32,17,5,22,34,15,3,24,36,13,1,37,27,10,25,29,12,8,19,31,18,6,21,33,16,4,23,35,14,2];
export type BetKind = "straight" | "split" | "street" | "corner" | "six-line" | "trio" | "basket" | "column" | "dozen" | "red" | "black" | "odd" | "even" | "low" | "high";
export type Bet = { id: string; kind: BetKind; numbers: readonly number[]; returnMultiplier: number; partage: boolean };
export type Stake = { id: string; amount: number };
export type Settlement = { number: number; totalBet: number; returned: number; net: number; outcome: "win" | "loss" | "push" };
export type Stats = { spins: number; wins: number; losses: number; net: number; wagered: number; biggestWin: number; recent: number[] };
const range = (start: number, count: number) => Array.from({length: count}, (_, i) => start + i);
export function wheel(variant: Variant): readonly number[] {
  if (!["european", "american", "french"].includes(variant)) throw new Error("INVALID_VARIANT");
  return variant === "american" ? AMERICAN_WHEEL : EUROPEAN_WHEEL;
}
export const numberLabel = (n: number) => n === DOUBLE_ZERO ? "00" : String(n);
export const numberColor = (n: number) => n === 0 || n === DOUBLE_ZERO ? "green" : RED_NUMBERS.includes(n) ? "red" : "black";

/** Catalog is the authority for bet geometry and payout; callers supply IDs only. */
export function betCatalog(variant: Variant): Bet[] {
  const result: Bet[] = [];
  const add = (kind: BetKind, nums: number[], returnMultiplier: number, id?: string, partage = false) => {
    const numbers = [...nums].sort((a,b) => a-b);
    result.push({id: id ?? `${kind}:${numbers.join(",")}`, kind, numbers, returnMultiplier, partage});
  };
  for (const n of wheel(variant)) add("straight", [n], 36);
  for (let row = 0; row < 12; row++) {
    const start = row * 3 + 1;
    add("street", range(start, 3), 12);
    add("split", [start,start+1], 18);
    add("split", [start+1,start+2], 18);
    if (row < 11) {
      add("six-line", range(start,6), 6);
      for (let c = 0; c < 3; c++) add("split", [start+c,start+c+3], 18);
      for (let c = 0; c < 2; c++) add("corner", [start+c,start+c+1,start+c+3,start+c+4], 9);
    }
  }
  if (variant === "american") {
    for (const nums of [[0,37],[0,1],[0,2],[37,2],[37,3]]) add("split", nums, 18);
    for (const nums of [[0,1,2],[0,37,2],[37,2,3]]) add("trio", nums, 12);
    // American first-five pays 6:1 profit, hence 7x INCLUDING the returned stake.
    add("basket", [0,37,1,2,3], 7);
  } else {
    for (const n of [1,2,3]) add("split", [0,n], 18);
    add("trio", [0,1,2], 12);
    add("trio", [0,2,3], 12);
    add("basket", [0,1,2,3], 9);
  }
  for (let i = 0; i < 3; i++) {
    add("dozen", range(i*12+1,12), 3, `dozen:${i+1}`);
    add("column", range(0,12).map(n => n*3+i+1), 3, `column:${i+1}`);
  }
  const numbers = range(1,36);
  add("red", RED_NUMBERS, 2, "red", true);
  add("black", numbers.filter(n => !RED_NUMBERS.includes(n)), 2, "black", true);
  add("odd", numbers.filter(n => n%2 === 1), 2, "odd", true);
  add("even", numbers.filter(n => n%2 === 0), 2, "even", true);
  add("low", range(1,18), 2, "low", true);
  add("high", range(19,18), 2, "high", true);
  return result;
}

export function sector(name: "voisins" | "tiers" | "orphelins", unit: number): Stake[] {
  money(unit, false);
  const groups: Record<typeof name, [string, number][]> = {
    voisins: [["trio:0,2,3",2],["split:4,7",1],["split:12,15",1],["split:18,21",1],["split:19,22",1],["corner:25,26,28,29",2],["split:32,35",1]],
    tiers: [["split:5,8",1],["split:10,11",1],["split:13,16",1],["split:23,24",1],["split:27,30",1],["split:33,36",1]],
    orphelins: [["straight:1",1],["split:6,9",1],["split:14,17",1],["split:17,20",1],["split:31,34",1]]
  };
  if (!groups[name]) throw new Error("INVALID_SECTOR");
  return groups[name].map(([id, count]) => ({id,amount:unit*count}));
}

// Half-chip units preserve La Partage exactly. Limits also prevent unsafe arithmetic.
function money(amount: number, allowZero = true) {
  if (!Number.isFinite(amount) || amount < (allowZero ? 0 : 1) || amount > 1_000_000_000 || !Number.isInteger(amount*2)) throw new Error("INVALID_AMOUNT");
}
export function validateStakes(variant: Variant, stakes: readonly Stake[], balance: number): number {
  money(balance);
  if (!stakes.length || stakes.length > 1000) throw new Error("INVALID_BETS");
  const catalog = new Map(betCatalog(variant).map(b => [b.id,b]));
  let total = 0;
  for (const stake of stakes) {
    // Whole-chip stakes guarantee that half-stake returns remain exact.
    money(stake.amount, false);
    if (!Number.isInteger(stake.amount) || !catalog.has(stake.id)) throw new Error("INVALID_BET");
    total += stake.amount;
  }
  if (total > balance) throw new Error("INSUFFICIENT_BALANCE");
  return total;
}
export function settle(variant: Variant, stakes: readonly Stake[], winningNumber: number): Settlement {
  const totalBet = validateStakes(variant, stakes, 1_000_000_000);
  if (!wheel(variant).includes(winningNumber)) throw new Error("INVALID_RESULT");
  const catalog = new Map(betCatalog(variant).map(b => [b.id,b]));
  let returned = 0;
  for (const stake of stakes) {
    const bet = catalog.get(stake.id)!;
    if (bet.numbers.includes(winningNumber)) returned += stake.amount*bet.returnMultiplier;
    else if (variant === "french" && winningNumber === 0 && bet.partage) returned += stake.amount/2;
  }
  const net = returned-totalBet;
  return { number: winningNumber, totalBet, returned, net, outcome: net > 0 ? "win" : net < 0 ? "loss" : "push" };
}
export function spin(variant: Variant): number {
  const pockets = wheel(variant);
  return pockets[randomInt(pockets.length)];
}
export const emptyStats = (): Stats => ({spins:0,wins:0,losses:0,net:0,wagered:0,biggestWin:0,recent:[]});
export function updateStats(previous: Stats, result: Settlement): Stats {
  return {spins:previous.spins+1,wins:previous.wins+Number(result.net>0),losses:previous.losses+Number(result.net<0),net:previous.net+result.net,wagered:previous.wagered+result.totalBet,biggestWin:Math.max(previous.biggestWin,result.net),recent:[result.number,...previous.recent].slice(0,20)};
}

