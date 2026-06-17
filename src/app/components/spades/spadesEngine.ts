export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type Player = 0 | 1 | 2 | 3; // 0=South(user), 1=West, 2=North, 3=East
// Teams: 0 = South+North (players 0,2), 1 = West+East (players 1,3)

export interface Card {
  suit: Suit;
  rank: number; // 2-14, 14=Ace
  id: string;
}

export interface TrickCard {
  player: Player;
  card: Card;
}

export interface SpadesState {
  phase: 'bidding' | 'playing' | 'round_end' | 'game_over';
  hands: Card[][];
  bids: (number | null)[];
  nilBids: boolean[];
  trickCounts: number[];
  currentTrick: TrickCard[];
  ledSuit: Suit | null;
  currentPlayer: Player;
  dealer: Player;
  spadesBroken: boolean;
  teamScores: [number, number];
  teamBags: [number, number];
  roundResult: RoundResult | null;
  trickComplete: boolean; // true while showing all 4 cards before clearing
  winner: 0 | 1 | null;
  lastTrick: TrickCard[] | null;
  lastTrickWinner: Player | null;
}

export interface RoundResult {
  teamBids: [number, number];
  teamTricks: [number, number];
  teamDelta: [number, number];
  newBags: [number, number];
  bagPenalty: [number, number];
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
  clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠',
};
export const SUIT_ORDER: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];

export function rankLabel(rank: number): string {
  if (rank === 14) return 'A';
  if (rank === 13) return 'K';
  if (rank === 12) return 'Q';
  if (rank === 11) return 'J';
  return String(rank);
}

export function isRed(card: Card): boolean {
  return card.suit === 'diamonds' || card.suit === 'hearts';
}

export function getTeam(player: Player): 0 | 1 {
  return player % 2 === 0 ? 0 : 1;
}

export function getPartner(player: Player): Player {
  return ((player + 2) % 4) as Player;
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

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dealHands(): Card[][] {
  const deck = shuffle(createDeck());
  return [0, 1, 2, 3].map(i => sortHand(deck.slice(i * 13, (i + 1) * 13)));
}

export function sortHand(cards: Card[]): Card[] {
  return [...cards].sort((a, b) =>
    SUIT_ORDER.indexOf(a.suit) !== SUIT_ORDER.indexOf(b.suit)
      ? SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit)
      : a.rank - b.rank
  );
}

export function getValidCards(hand: Card[], ledSuit: Suit | null, spadesBroken: boolean): Card[] {
  if (ledSuit === null) {
    if (!spadesBroken) {
      const nonSpades = hand.filter(c => c.suit !== 'spades');
      return nonSpades.length > 0 ? nonSpades : hand;
    }
    return hand;
  }
  const matching = hand.filter(c => c.suit === ledSuit);
  return matching.length > 0 ? matching : hand;
}

function cardStrength(card: Card, ledSuit: Suit): number {
  if (card.suit === 'spades') return 100 + card.rank;
  if (card.suit === ledSuit) return card.rank;
  return 0;
}

export function determineTrickWinner(trick: TrickCard[], ledSuit: Suit): Player {
  return trick.reduce((best, entry) =>
    cardStrength(entry.card, ledSuit) > cardStrength(best.card, ledSuit) ? entry : best
  ).player;
}

export function isTrickWinner(trick: TrickCard[], ledSuit: Suit, player: Player): boolean {
  if (trick.length === 0) return false;
  const current = trick.find(t => t.player === player);
  if (!current) return false;
  return trick.every(t => cardStrength(t.card, ledSuit) <= cardStrength(current.card, ledSuit));
}

export function aiChooseBid(hand: Card[]): number {
  let bid = 0;
  for (const card of hand) {
    if (card.suit === 'spades') {
      if (card.rank >= 14) bid += 1;
      else if (card.rank >= 12) bid += 0.75;
      else if (card.rank >= 10) bid += 0.5;
      else bid += 0.15;
    } else {
      if (card.rank === 14) bid += 0.9;
      else if (card.rank === 13) bid += 0.6;
      else if (card.rank === 12) bid += 0.35;
    }
  }
  return Math.max(1, Math.min(7, Math.round(bid)));
}

export function aiChooseCard(
  hand: Card[],
  trick: TrickCard[],
  ledSuit: Suit | null,
  spadesBroken: boolean,
  player: Player,
): Card {
  const valid = getValidCards(hand, ledSuit, spadesBroken);

  if (trick.length === 0) {
    // Leading — prefer non-spades high cards
    const nonSpades = valid.filter(c => c.suit !== 'spades');
    const pool = nonSpades.length > 0 ? nonSpades : valid;
    return pool.reduce((best, c) => c.rank > best.rank ? c : best);
  }

  const partner = getPartner(player);
  const partnerEntry = trick.find(t => t.player === partner);
  const partnerWinning = partnerEntry && ledSuit
    ? isTrickWinner([...trick], ledSuit, partner)
    : false;

  if (partnerWinning) {
    // Partner is winning — play lowest valid
    return valid.reduce((best, c) => c.rank < best.rank ? c : best);
  }

  // Try to win — play lowest winning card, otherwise lowest discard
  if (ledSuit) {
    const currentBest = trick.reduce((b, t) =>
      cardStrength(t.card, ledSuit) > cardStrength(b.card, ledSuit) ? t : b
    );
    const winning = valid.filter(c => cardStrength(c, ledSuit) > cardStrength(currentBest.card, ledSuit));
    if (winning.length > 0) {
      return winning.reduce((best, c) => cardStrength(c, ledSuit) < cardStrength(best, ledSuit) ? c : best);
    }
  }

  return valid.reduce((best, c) => c.rank < best.rank ? c : best);
}

export function calculateRoundScore(state: SpadesState): RoundResult {
  const { bids, nilBids, trickCounts } = state;

  const teamBids: [number, number] = [
    (bids[0] ?? 0) + (bids[2] ?? 0),
    (bids[1] ?? 0) + (bids[3] ?? 0),
  ];
  const teamTricks: [number, number] = [
    trickCounts[0] + trickCounts[2],
    trickCounts[1] + trickCounts[3],
  ];

  const teamDelta: [number, number] = [0, 0];
  const newBags: [number, number] = [...state.teamBags] as [number, number];
  const bagPenalty: [number, number] = [0, 0];

  for (let team = 0; team < 2 as const; team++) {
    const t = team as 0 | 1;
    if (teamTricks[t] >= teamBids[t]) {
      const bags = teamTricks[t] - teamBids[t];
      teamDelta[t] += teamBids[t] * 10 + bags;
      newBags[t] += bags;
      if (newBags[t] >= 10) {
        bagPenalty[t] = 100;
        newBags[t] -= 10;
      }
      teamDelta[t] -= bagPenalty[t];
    } else {
      teamDelta[t] -= teamBids[t] * 10;
    }
  }

  // Nil bonuses/penalties
  for (let p = 0; p < 4; p++) {
    if (nilBids[p]) {
      const team = getTeam(p as Player);
      if (trickCounts[p] === 0) {
        teamDelta[team] += 100;
      } else {
        teamDelta[team] -= 100;
      }
    }
  }

  return { teamBids, teamTricks, teamDelta, newBags, bagPenalty };
}

export function initGame(): SpadesState {
  const hands = dealHands();
  return {
    phase: 'bidding',
    hands,
    bids: [null, null, null, null],
    nilBids: [false, false, false, false],
    trickCounts: [0, 0, 0, 0],
    currentTrick: [],
    ledSuit: null,
    currentPlayer: 1 as Player, // West bids first (left of South dealer)
    dealer: 0 as Player,
    spadesBroken: false,
    teamScores: [0, 0],
    teamBags: [0, 0],
    roundResult: null,
    trickComplete: false,
    winner: null,
    lastTrick: null,
    lastTrickWinner: null,
  };
}
