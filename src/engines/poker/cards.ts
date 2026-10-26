import { RANKS, SUITS, type Card, type Rank, type Suit } from "./types.ts";

const RANK_SYMBOLS: Record<Rank, string> = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "T",
  11: "J",
  12: "Q",
  13: "K",
  14: "A"
};

const SYMBOL_RANKS: Record<string, Rank> = Object.fromEntries(
  Object.entries(RANK_SYMBOLS).map(([rank, symbol]) => [symbol, Number(rank) as Rank])
) as Record<string, Rank>;

const SUIT_SYMBOLS: Record<Suit, string> = {
  clubs: "c",
  diamonds: "d",
  hearts: "h",
  spades: "s"
};

const SYMBOL_SUITS: Record<string, Suit> = Object.fromEntries(
  Object.entries(SUIT_SYMBOLS).map(([suit, symbol]) => [symbol, suit as Suit])
) as Record<string, Suit>;

export function isCard(value: number): value is Card {
  return Number.isInteger(value) && value >= 0 && value < 52;
}

export function assertCard(card: Card): void {
  if (!isCard(card)) {
    throw new RangeError(`Invalid card id: ${String(card)}`);
  }
}

export function createCard(rank: Rank, suit: Suit): Card {
  const rankIndex = RANKS.indexOf(rank);
  const suitIndex = SUITS.indexOf(suit);
  if (rankIndex === -1 || suitIndex === -1) {
    throw new RangeError(`Invalid card: ${String(rank)} of ${String(suit)}`);
  }
  return suitIndex * RANKS.length + rankIndex;
}

export function getRank(card: Card): Rank {
  assertCard(card);
  return RANKS[card % RANKS.length];
}

export function getSuit(card: Card): Suit {
  assertCard(card);
  return SUITS[Math.floor(card / RANKS.length)];
}

export function parseCard(value: string): Card {
  const normalized = value.trim().toUpperCase();
  const match = /^(10|[2-9TJQKA])([CDHS])$/.exec(normalized);
  if (!match) {
    throw new SyntaxError(`Invalid card notation: ${value}`);
  }

  const rawRank = match[1] === "10" ? "T" : match[1];
  return createCard(SYMBOL_RANKS[rawRank], SYMBOL_SUITS[match[2].toLowerCase()]);
}

export function formatCard(card: Card): string {
  return `${RANK_SYMBOLS[getRank(card)]}${SUIT_SYMBOLS[getSuit(card)]}`;
}

export function assertUniqueCards(cards: readonly Card[]): void {
  const seen = new Set<Card>();
  for (const card of cards) {
    assertCard(card);
    if (seen.has(card)) {
      throw new Error(`Duplicate card: ${formatCard(card)}`);
    }
    seen.add(card);
  }
}


