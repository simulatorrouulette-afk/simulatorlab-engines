<div align="center">

# Simulator Lab · Game Engines

**Public TypeScript source for the roulette and Texas Hold'em simulators at [Simulator Lab](https://simulatorlab.org).**

[![Open Simulator Lab](https://img.shields.io/badge/Open-Simulator%20Lab-cb2446?style=for-the-badge)](https://simulatorlab.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-source-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-Node.js-43853d?style=for-the-badge&logo=node.js&logoColor=white)](#run-the-tests)

</div>

This repository contains the standalone game logic behind Simulator Lab. It has no website UI, accounts, advertising, analytics, database code, or deployment configuration.

## Try the simulators

- [Play the roulette simulator](https://simulatorlab.org/en/roulette/european/simulator)
- [Play the Texas Hold'em simulator](https://simulatorlab.org/en/poker/texas-holdem/simulator)

The simulators use virtual chips only. There are no deposits, purchases, cash prizes, or real-money bets.

## What's included

### Roulette

- European, American, and French wheels
- Straight, split, street, corner, six-line, trio, basket, column, dozen, and even-money bets
- Correct inclusive returns, including the American five-number basket
- French `La Partage`
- Voisins du Zéro, Tiers du Cylindre, and Orphelins sector layouts
- Cryptographic rejection sampling without modulo bias
- Compact session statistics

### Texas Hold'em

- Card parsing, deck creation, and shuffling
- Best-five evaluation from five to seven cards
- Kickers, ties, wheel straights, and royal-flush display metadata
- Heads-up and multi-player betting order
- Blinds, calls, checks, folds, raises, and all-ins
- Main and side pots, split pots, and odd-chip rules
- A restricted bot view that exposes only visible information

## Run the tests

Use Node.js 22.18 or newer. The project has no runtime dependencies.

```bash
npm test
```

## Repository map

```text
src/engines/
├── random.ts          # unbiased random integers and shuffling
├── roulette.ts        # wheels, bets, payouts, sectors, and statistics
└── poker/
    ├── cards.ts
    ├── comparison.ts
    ├── deck.ts
    ├── evaluator.ts
    ├── game.ts
    └── types.ts
tests/
├── poker.test.mjs
└── roulette.test.mjs
```

## About Simulator Lab

[Simulator Lab](https://simulatorlab.org) is a multilingual practice site for learning roulette and Texas Hold'em rules with virtual chips. Results do not predict future outcomes, and practice does not guarantee a profit.


