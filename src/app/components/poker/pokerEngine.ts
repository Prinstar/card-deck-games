export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';

export interface Card {
  suit: Suit;
  rank: number; // 2-14, 14=Ace
  id: string;
}

export type HandRank = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface HandResult {
  rank: HandRank;
  name: string;
  bestFive: Card[];
  tiebreakers: number[];
}

export type PlayerStatus = 'active' | 'folded' | 'all-in';
export type BettingAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in';
export type GamePhase = 'waiting' | 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface PokerPlayer {
  id: number;
  name: string;
  chips: number;
  holeCards: Card[];
  bet: number; // bet in current betting round
  totalBetThisHand: number;
  status: PlayerStatus;
  isHuman: boolean;
  isDealer: boolean;
  lastAction: string | null;
}

export interface PokerState {
  phase: GamePhase;
  players: PokerPlayer[];
  communityCards: Card[];
  pot: number;
  sidePots: { amount: number; eligible: number[] }[];
  currentPlayerIdx: number;
  dealerIdx: number;
  smallBlindIdx: number;
  bigBlindIdx: number;
  currentBet: number; // highest bet in current round
  minRaise: number;
  deck: Card[];
  handNumber: number;
  lastWinners: { playerIdx: number; amount: number; handName: string }[];
  showdown: boolean;
  message: string;
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
  clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠',
};

export const HAND_NAMES: string[] = [
  'High Card',
  'One Pair',
  'Two Pair',
  'Three of a Kind',
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
];

export function rankLabel(rank: number): string {
  if (rank === 14) return 'A';
  if (rank === 13) return 'K';
  if (rank === 12) return 'Q';
  if (rank === 11) return 'J';
  if (rank === 10) return '10';
  return String(rank);
}

export function isRed(card: Card): boolean {
  return card.suit === 'diamonds' || card.suit === 'hearts';
}

export function createDeck(): Card[] {
  const suits: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
  const cards: Card[] = [];
  for (const suit of suits) {
    for (let rank = 2; rank <= 14; rank++) {
      cards.push({ suit, rank, id: `${suit}-${rank}` });
    }
  }
  return cards;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const a = [...deck];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Hand evaluation ────────────────────────────────────────────────────────

function evaluateFive(cards: Card[]): { rank: HandRank; tiebreakers: number[] } {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);

  // Count rank occurrences
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  // Sorted by count desc, then rank desc
  const grouped = [...counts.entries()].sort((a, b) =>
    b[1] - a[1] || b[0] - a[0]
  );

  const isFlush = suits.every(s => s === suits[0]);

  // Straight detection (including wheel A-2-3-4-5)
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
  let straightHigh = 0;
  if (uniqueRanks.length === 5) {
    if (uniqueRanks[0] - uniqueRanks[4] === 4) {
      straightHigh = uniqueRanks[0];
    } else if (
      uniqueRanks[0] === 14 &&
      uniqueRanks[1] === 5 &&
      uniqueRanks[2] === 4 &&
      uniqueRanks[3] === 3 &&
      uniqueRanks[4] === 2
    ) {
      straightHigh = 5; // wheel
    }
  }
  const isStraight = straightHigh > 0;

  if (isStraight && isFlush) {
    return { rank: 8, tiebreakers: [straightHigh] };
  }
  if (grouped[0][1] === 4) {
    return { rank: 7, tiebreakers: [grouped[0][0], grouped[1][0]] };
  }
  if (grouped[0][1] === 3 && grouped[1][1] === 2) {
    return { rank: 6, tiebreakers: [grouped[0][0], grouped[1][0]] };
  }
  if (isFlush) {
    return { rank: 5, tiebreakers: ranks };
  }
  if (isStraight) {
    return { rank: 4, tiebreakers: [straightHigh] };
  }
  if (grouped[0][1] === 3) {
    const kickers = grouped.slice(1).map(g => g[0]);
    return { rank: 3, tiebreakers: [grouped[0][0], ...kickers] };
  }
  if (grouped[0][1] === 2 && grouped[1][1] === 2) {
    const pairHigh = Math.max(grouped[0][0], grouped[1][0]);
    const pairLow = Math.min(grouped[0][0], grouped[1][0]);
    const kicker = grouped[2][0];
    return { rank: 2, tiebreakers: [pairHigh, pairLow, kicker] };
  }
  if (grouped[0][1] === 2) {
    const kickers = grouped.slice(1).map(g => g[0]);
    return { rank: 1, tiebreakers: [grouped[0][0], ...kickers] };
  }
  return { rank: 0, tiebreakers: ranks };
}

function compareTiebreakers(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function combinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];
  const combo: T[] = [];
  function helper(start: number) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      helper(i + 1);
      combo.pop();
    }
  }
  helper(0);
  return result;
}

export function evaluateHand(cards: Card[]): HandResult {
  const fives = cards.length <= 5 ? [cards] : combinations(cards, 5);
  let best: { rank: HandRank; tiebreakers: number[]; five: Card[] } | null = null;
  for (const five of fives) {
    const ev = evaluateFive(five);
    if (
      best === null ||
      ev.rank > best.rank ||
      (ev.rank === best.rank && compareTiebreakers(ev.tiebreakers, best.tiebreakers) > 0)
    ) {
      best = { rank: ev.rank, tiebreakers: ev.tiebreakers, five };
    }
  }
  const b = best!;
  let name = HAND_NAMES[b.rank];
  if (b.rank === 8 && b.tiebreakers[0] === 14) name = 'Royal Flush';
  return { rank: b.rank, name, bestFive: b.five, tiebreakers: b.tiebreakers };
}

export function compareHands(a: HandResult, b: HandResult): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  return compareTiebreakers(a.tiebreakers, b.tiebreakers);
}

// ─── Dealing ────────────────────────────────────────────────────────────────

export function dealInitial(state: PokerState): PokerState {
  let deck = [...state.deck];
  const players = state.players.map(p => ({ ...p, holeCards: [] as Card[] }));
  // Deal 2 cards round-robin to each active (non-busted) player starting left of dealer
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < players.length; i++) {
      const idx = (state.dealerIdx + 1 + i) % players.length;
      const p = players[idx];
      if (p.status === 'folded') continue;
      p.holeCards.push(deck.shift()!);
    }
  }
  return { ...state, deck, players };
}

// ─── Winner determination (with side pots) ──────────────────────────────────

export function determineWinners(
  state: PokerState
): { playerIdx: number; amount: number; handName: string }[] {
  const contenders = state.players
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => p.status !== 'folded');

  // Evaluate every contender's hand
  const evals = new Map<number, HandResult>();
  for (const { p, idx } of contenders) {
    evals.set(idx, evaluateHand([...p.holeCards, ...state.communityCards]));
  }

  // Build pots from contribution levels (handles side pots correctly).
  // Use totalBetThisHand of all players (folded players' chips still in pot).
  const contributions = state.players.map(p => p.totalBetThisHand);
  const results: { playerIdx: number; amount: number; handName: string }[] = [];
  const payouts = new Map<number, number>();

  // Distinct positive contribution levels, ascending
  const levels = [...new Set(contributions.filter(c => c > 0))].sort((a, b) => a - b);
  let prevLevel = 0;
  for (const level of levels) {
    const slice = level - prevLevel;
    if (slice <= 0) { prevLevel = level; continue; }
    // Everyone who contributed at least `level` puts `slice` into this pot
    let potAmount = 0;
    for (const c of contributions) {
      if (c >= level) potAmount += slice;
    }
    // Eligible winners: non-folded players who contributed at least `level`
    const eligible = contenders.filter(({ idx }) => contributions[idx] >= level);
    if (eligible.length > 0 && potAmount > 0) {
      let bestEval: HandResult | null = null;
      let winners: number[] = [];
      for (const { idx } of eligible) {
        const ev = evals.get(idx)!;
        if (bestEval === null || compareHands(ev, bestEval) > 0) {
          bestEval = ev;
          winners = [idx];
        } else if (compareHands(ev, bestEval) === 0) {
          winners.push(idx);
        }
      }
      const share = Math.floor(potAmount / winners.length);
      let remainder = potAmount - share * winners.length;
      for (const w of winners) {
        let amt = share;
        if (remainder > 0) { amt += 1; remainder -= 1; }
        payouts.set(w, (payouts.get(w) ?? 0) + amt);
      }
    }
    prevLevel = level;
  }

  for (const [idx, amount] of payouts.entries()) {
    results.push({
      playerIdx: idx,
      amount,
      handName: evals.get(idx)!.name,
    });
  }
  return results;
}

// ─── AI logic ───────────────────────────────────────────────────────────────

// Returns a rough 0..1 strength estimate for the player's situation.
function handStrength(player: PokerPlayer, state: PokerState): number {
  const { holeCards } = player;
  const community = state.communityCards;

  if (community.length === 0) {
    // Pre-flop heuristic based on hole cards
    const [a, b] = holeCards;
    if (!a || !b) return 0.2;
    const hi = Math.max(a.rank, b.rank);
    const lo = Math.min(a.rank, b.rank);
    const pair = a.rank === b.rank;
    const suited = a.suit === b.suit;
    const gap = hi - lo;

    let s = 0;
    if (pair) {
      s = 0.5 + (hi - 2) / 12 * 0.45; // pair of 2s .5 → pair of A ~.95
    } else {
      s = (hi - 2) / 12 * 0.4 + (lo - 2) / 12 * 0.15;
      if (suited) s += 0.08;
      if (gap === 1) s += 0.06; // connectors
      else if (gap === 2) s += 0.03;
      if (hi === 14) s += 0.05;
    }
    return Math.max(0, Math.min(1, s));
  }

  // Post-flop: evaluate made hand
  const ev = evaluateHand([...holeCards, ...community]);
  // Map hand rank to baseline strength, refine with top tiebreaker
  const base = ev.rank / 8;
  const kicker = (ev.tiebreakers[0] ?? 0) / 14;
  let s = base * 0.85 + kicker * 0.15;
  // High card / weak pairs shouldn't read too strong
  if (ev.rank === 0) s = Math.min(s, 0.35);
  if (ev.rank === 1) s = Math.min(0.55, 0.35 + kicker * 0.2);
  return Math.max(0, Math.min(1, s));
}

export function aiDecide(
  player: PokerPlayer,
  state: PokerState
): { action: BettingAction; amount?: number } {
  const toCall = state.currentBet - player.bet;
  const strength = handStrength(player, state);
  const jitter = (Math.random() - 0.5) * 0.15;
  const s = Math.max(0, Math.min(1, strength + jitter));

  const canCheck = toCall <= 0;

  // Cap raise: never more than 3x current bet or 20% of chips
  const maxRaiseTotal = Math.max(
    state.currentBet + state.minRaise,
    Math.min(state.currentBet * 3 || state.minRaise * 3, Math.floor(player.chips * 0.2) + player.bet)
  );

  const wantRaise = () => {
    // Raise to maxRaiseTotal but at least a min raise above current bet
    let target = Math.min(maxRaiseTotal, player.bet + player.chips);
    target = Math.max(target, state.currentBet + state.minRaise);
    target = Math.min(target, player.bet + player.chips);
    const raiseChips = target - player.bet;
    if (raiseChips >= player.chips) return { action: 'all-in' as BettingAction };
    return { action: 'raise' as BettingAction, amount: target };
  };

  // Strong hands: raise often
  if (s > 0.72) {
    if (Math.random() < 0.7) return wantRaise();
    return canCheck ? { action: 'check' } : { action: 'call' };
  }

  // Medium hands
  if (s > 0.45) {
    if (canCheck) {
      return Math.random() < 0.3 ? wantRaise() : { action: 'check' };
    }
    // Call if the bet isn't huge relative to chips
    if (toCall <= player.chips * 0.25) return { action: 'call' };
    if (toCall >= player.chips) {
      return s > 0.6 ? { action: 'all-in' } : { action: 'fold' };
    }
    return Math.random() < 0.5 ? { action: 'call' } : { action: 'fold' };
  }

  // Weak hands
  if (canCheck) return { action: 'check' };
  // Occasional bluff
  if (Math.random() < 0.06 && toCall <= player.chips * 0.15) return wantRaise();
  // Cheap call sometimes
  if (toCall <= state.minRaise && Math.random() < 0.4) return { action: 'call' };
  return { action: 'fold' };
}
