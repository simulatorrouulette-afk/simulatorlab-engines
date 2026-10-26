import { assertUniqueCards } from "./cards.ts";
import type { Card } from "./types.ts";

export function createDeck(): Card[] {
  return Array.from({ length: 52 }, (_, card) => card);
}

export function removeKnownCards(deck: readonly Card[], knownCards: readonly Card[]): Card[] {
  assertUniqueCards(deck);
  assertUniqueCards(knownCards);

  const deckSet = new Set(deck);
  for (const card of knownCards) {
    if (!deckSet.has(card)) {
      throw new Error(`Known card ${String(card)} is not present in the deck`);
    }
  }

  const known = new Set(knownCards);
  return deck.filter((card) => !known.has(card));
}


