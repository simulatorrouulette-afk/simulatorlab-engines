import { assertUniqueCards, getRank, getSuit } from "./cards.ts";
import {
  HAND_CATEGORY_STRENGTH,
  type Card,
  type EvaluatedHand,
  type HandCategory,
  type Rank
} from "./types.ts";

const CATEGORY_NAMES: Record<HandCategory, string> = {
  "high-card": "High Card",
  "one-pair": "One Pair",
  "two-pair": "Two Pair",
  "three-of-a-kind": "Three of a Kind",
  straight: "Straight",
  flush: "Flush",
  "full-house": "Full House",
  "four-of-a-kind": "Four of a Kind",
  "straight-flush": "Straight Flush"
};

function asFive(cards: readonly Card[]): [Card, Card, Card, Card, Card] {
  if (cards.length !== 5) {
    throw new Error(`Expected five cards, received ${cards.length}`);
  }
  return [cards[0], cards[1], cards[2], cards[3], cards[4]];
}

function descendingRanks(cards: readonly Card[]): Rank[] {
  return cards.map(getRank).sort((left, right) => right - left);
}

function groupByRank(cards: readonly Card[]): Map<Rank, Card[]> {
  const groups = new Map<Rank, Card[]>();
  for (const card of cards) {
    const rank = getRank(card);
    const group = groups.get(rank) ?? [];
    group.push(card);
    groups.set(rank, group);
  }
  for (const group of groups.values()) {
    group.sort((left, right) => right - left);
  }
  return groups;
}

function straightHigh(ranks: readonly Rank[]): Rank | null {
  const unique = [...new Set(ranks)].sort((left, right) => right - left);
  if (unique.length !== 5) return null;
  if (unique[0] - unique[4] === 4) return unique[0];
  if (unique.join(",") === "14,5,4,3,2") return 5;
  return null;
}

function straightRanks(high: Rank): Rank[] {
  return high === 5 ? [5, 4, 3, 2, 14] : [high, high - 1, high - 2, high - 3, high - 4] as Rank[];
}

function cardsInRankOrder(groups: Map<Rank, Card[]>, rankOrder: readonly Rank[]): Card[] {
  const offsets = new Map<Rank, number>();
  return rankOrder.map((rank) => {
    const offset = offsets.get(rank) ?? 0;
    const card = groups.get(rank)?.[offset];
    if (card === undefined) throw new Error(`Missing rank ${rank} while ordering evaluated hand`);
    offsets.set(rank, offset + 1);
    return card;
  });
}

function result(
  category: HandCategory,
  rankValues: readonly number[],
  bestFive: readonly Card[],
  kickers: readonly Rank[] = [],
  isRoyalFlush = false
): EvaluatedHand {
  return {
    category,
    name: isRoyalFlush ? "Royal Flush" : CATEGORY_NAMES[category],
    score: [HAND_CATEGORY_STRENGTH[category], ...rankValues],
    bestFive: asFive(bestFive),
    kickers,
    isRoyalFlush
  };
}

export function evaluateFiveCardHand(cards: readonly Card[]): EvaluatedHand {
  if (cards.length !== 5) {
    throw new RangeError(`A five-card hand requires exactly 5 cards, received ${cards.length}`);
  }
  assertUniqueCards(cards);

  const groups = groupByRank(cards);
  const ranks = descendingRanks(cards);
  const flush = cards.every((card) => getSuit(card) === getSuit(cards[0]));
  const highStraight = straightHigh(ranks);

  if (flush && highStraight !== null) {
    const ordered = cardsInRankOrder(groups, straightRanks(highStraight));
    const royal = highStraight === 14;
    return result("straight-flush", [highStraight], ordered, [], royal);
  }

  const groupedRanks = [...groups.entries()]
    .map(([rank, groupedCards]) => ({ rank, count: groupedCards.length }))
    .sort((left, right) => right.count - left.count || right.rank - left.rank);

  const four = groupedRanks.find((group) => group.count === 4);
  if (four) {
    const kicker = groupedRanks.find((group) => group.count === 1)!.rank;
    return result(
      "four-of-a-kind",
      [four.rank, kicker],
      cardsInRankOrder(groups, [four.rank, four.rank, four.rank, four.rank, kicker]),
      [kicker]
    );
  }

  const three = groupedRanks.find((group) => group.count === 3);
  const pair = groupedRanks.find((group) => group.count === 2);
  if (three && pair) {
    return result(
      "full-house",
      [three.rank, pair.rank],
      cardsInRankOrder(groups, [three.rank, three.rank, three.rank, pair.rank, pair.rank])
    );
  }

  if (flush) {
    const ordered = [...cards].sort((left, right) => getRank(right) - getRank(left));
    return result("flush", ranks, ordered, ranks.slice(1));
  }

  if (highStraight !== null) {
    return result(
      "straight",
      [highStraight],
      cardsInRankOrder(groups, straightRanks(highStraight))
    );
  }

  if (three) {
    const kickers = groupedRanks
      .filter((group) => group.count === 1)
      .map((group) => group.rank)
      .sort((left, right) => right - left);
    return result(
      "three-of-a-kind",
      [three.rank, ...kickers],
      cardsInRankOrder(groups, [three.rank, three.rank, three.rank, ...kickers]),
      kickers
    );
  }

  const pairs = groupedRanks
    .filter((group) => group.count === 2)
    .map((group) => group.rank)
    .sort((left, right) => right - left);

  if (pairs.length === 2) {
    const kicker = groupedRanks.find((group) => group.count === 1)!.rank;
    return result(
      "two-pair",
      [pairs[0], pairs[1], kicker],
      cardsInRankOrder(groups, [pairs[0], pairs[0], pairs[1], pairs[1], kicker]),
      [kicker]
    );
  }

  if (pairs.length === 1) {
    const pairRank = pairs[0];
    const kickers = groupedRanks
      .filter((group) => group.count === 1)
      .map((group) => group.rank)
      .sort((left, right) => right - left);
    return result(
      "one-pair",
      [pairRank, ...kickers],
      cardsInRankOrder(groups, [pairRank, pairRank, ...kickers]),
      kickers
    );
  }

  const ordered = [...cards].sort((left, right) => getRank(right) - getRank(left));
  return result("high-card", ranks, ordered, ranks.slice(1));
}

function* fiveCardCombinations(cards: readonly Card[]): Generator<readonly Card[]> {
  for (let a = 0; a < cards.length - 4; a += 1) {
    for (let b = a + 1; b < cards.length - 3; b += 1) {
      for (let c = b + 1; c < cards.length - 2; c += 1) {
        for (let d = c + 1; d < cards.length - 1; d += 1) {
          for (let e = d + 1; e < cards.length; e += 1) {
            yield [cards[a], cards[b], cards[c], cards[d], cards[e]];
          }
        }
      }
    }
  }
}

function compareScores(left: readonly number[], right: readonly number[]): -1 | 0 | 1 {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference > 0) return 1;
    if (difference < 0) return -1;
  }
  return 0;
}

export function evaluateBestHand(cards: readonly Card[]): EvaluatedHand {
  if (cards.length < 5 || cards.length > 7) {
    throw new RangeError(`Best-hand evaluation requires 5 to 7 cards, received ${cards.length}`);
  }
  assertUniqueCards(cards);

  let best: EvaluatedHand | null = null;
  for (const combination of fiveCardCombinations(cards)) {
    const candidate = evaluateFiveCardHand(combination);
    if (best === null || compareScores(candidate.score, best.score) > 0) {
      best = candidate;
    }
  }
  if (best === null) throw new Error("No five-card combinations were generated");
  return best;
}

export { compareScores };


