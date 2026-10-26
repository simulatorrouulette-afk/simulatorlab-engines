import { assertUniqueCards } from "./cards.ts";
import { compareScores, evaluateBestHand } from "./evaluator.ts";
import type {
  Card,
  EvaluatedHand,
  HandComparison,
  WinnerResult
} from "./types.ts";

export function compareEvaluatedHands(
  left: EvaluatedHand,
  right: EvaluatedHand
): HandComparison {
  return compareScores(left.score, right.score);
}

export function compareHands(
  leftCards: readonly Card[],
  rightCards: readonly Card[]
): HandComparison {
  return compareEvaluatedHands(
    evaluateBestHand(leftCards),
    evaluateBestHand(rightCards)
  );
}

/**
 * Evaluates player hole cards against one shared board and returns every
 * winner. Indices in `winners` correspond to the order of `playerHands`.
 */
export function determineWinners(
  playerHands: readonly (readonly Card[])[],
  board: readonly Card[]
): WinnerResult {
  if (playerHands.length < 2) {
    throw new RangeError("At least two players are required");
  }
  if (board.length !== 5) {
    throw new RangeError(`A completed board requires 5 cards, received ${board.length}`);
  }
  if (playerHands.some((hand) => hand.length !== 2)) {
    throw new RangeError("Every Texas Hold’em player must have exactly 2 hole cards");
  }

  assertUniqueCards([...board, ...playerHands.flat()]);
  const hands = playerHands.map((holeCards) => evaluateBestHand([...holeCards, ...board]));

  let winners = [0];
  for (let index = 1; index < hands.length; index += 1) {
    const comparison = compareEvaluatedHands(hands[index], hands[winners[0]]);
    if (comparison > 0) winners = [index];
    else if (comparison === 0) winners.push(index);
  }

  return {
    winners,
    hands,
    isSplitPot: winners.length > 1
  };
}


