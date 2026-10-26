/** Uniform sampling, without a Math.random fallback or modulo bias. */
export function randomInt(limit: number, fill = (buffer: Uint32Array) => crypto.getRandomValues(buffer)): number {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 0x100000000) throw new RangeError("INVALID_RANDOM_LIMIT");
  const ceiling = Math.floor(0x100000000 / limit) * limit;
  const buffer = new Uint32Array(1);
  do { fill(buffer); } while (buffer[0] >= ceiling);
  return buffer[0] % limit;
}

export function shuffle<T>(items: readonly T[]): T[] {
  const deck = [...items];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

