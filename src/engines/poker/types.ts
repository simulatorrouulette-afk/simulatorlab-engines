export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
export type Rank = (typeof RANKS)[number];

export const SUITS = ["clubs", "diamonds", "hearts", "spades"] as const;
export type Suit = (typeof SUITS)[number];

/**
 * Compact card representation:
 * suitIndex * 13 + rankIndex, where rankIndex 0 is deuce and 12 is ace.
 */
export type Card = number;

export const HAND_CATEGORY_STRENGTH = {
  "high-card": 0,
  "one-pair": 1,
  "two-pair": 2,
  "three-of-a-kind": 3,
  straight: 4,
  flush: 5,
  "full-house": 6,
  "four-of-a-kind": 7,
  "straight-flush": 8
} as const;

export type HandCategory = keyof typeof HAND_CATEGORY_STRENGTH;

export type EvaluatedHand = {
  category: HandCategory;
  name: string;
  /**
   * Lexicographic comparison key. The first value is the category strength,
   * followed by category-specific ranks and kickers.
   */
  score: readonly number[];
  bestFive: readonly [Card, Card, Card, Card, Card];
  kickers: readonly Rank[];
  isRoyalFlush: boolean;
};

export type HandComparison = -1 | 0 | 1;

export type WinnerResult = {
  winners: readonly number[];
  hands: readonly EvaluatedHand[];
  isSplitPot: boolean;
};

export type ExactOpponent = {
  mode: "exact";
  cards: readonly [Card, Card];
};

export type UnknownOpponent = {
  mode: "unknown";
};

export type Opponent = ExactOpponent | UnknownOpponent;

export type EquityMethod = "exact" | "monte-carlo";
export type CalculationMode = "auto" | EquityMethod;

export type EquityRequest = {
  hero: readonly [Card, Card];
  board: readonly Card[];
  opponents: readonly Opponent[];
};

export type CalculationRequest = EquityRequest & {
  mode?: CalculationMode;
  iterations?: number;
  seed?: number;
  exactThreshold?: number;
};

export type EquityResult = {
  method: EquityMethod;
  outcomes: number;
  wins: number;
  ties: number;
  losses: number;
  winProbability: number;
  tieProbability: number;
  lossProbability: number;
  equity: number;
  standardError: number;
  elapsedMs: number;
  seed?: number;
};

export type CalculationProgress = {
  method: EquityMethod;
  completed: number;
  total: number;
  ratio: number;
};

export type CalculationOptions = {
  onProgress?: (progress: CalculationProgress) => void;
};

export type DrawType =
  | "gutshot-straight-draw"
  | "open-ended-straight-draw"
  | "double-gutshot"
  | "flush-draw"
  | "backdoor-flush-draw"
  | "backdoor-straight-draw"
  | "overcards"
  | "set-draw"
  | "full-house-draw"
  | "combo-draw";

export type OutDetail = {
  card: Card;
  resultingCategory: HandCategory;
  resultingName: string;
  clean: boolean;
  dirtyReason?: string;
};

export type ImprovementProbability = {
  category: HandCategory;
  name: string;
  outs: readonly OutDetail[];
  nextCardProbability: number;
  byRiverProbability: number;
  byRiverOutcomes: number;
};

export type OutsAnalysis = {
  currentHand: EvaluatedHand;
  draws: readonly DrawType[];
  unseenCards: number;
  totalOuts: number;
  cleanOuts: number;
  dirtyOuts: number;
  outs: readonly OutDetail[];
  improvements: readonly ImprovementProbability[];
};

export type BettingStreet = "flop" | "turn";

export type PotOddsInput = {
  currentPot: number;
  opponentBet: number;
  callAmount: number;
  futurePot?: number;
  outs: number;
  street: BettingStreet;
};

export type PotOddsResult = {
  potAfterCall: number;
  potOddsRatio: number;
  breakEvenEquity: number;
  nextCardProbability: number;
  drawingProbability: number;
  expectedValue: number;
  mathematicallyFavorable: boolean;
};


