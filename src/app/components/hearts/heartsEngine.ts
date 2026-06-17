export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type Player = 0 | 1 | 2 | 3; // 0=South(user), 1=West, 2=North, 3=East
export type PassDirection = 'left' | 'right' | 'across' | 'none';

export interface Card {
  suit: Suit;
  rank: number; // 2–14, 14=Ace
  id: string;
}

export interface TrickCard {
  player: Player;
  card: Card;
}

export interface HeartsState {
  phase: 'passing' | 'playing' | 'round_end' | 'game_over';
  hands: Card[][];
  receivedCards: Card[]; // cards user will receive this pass
  passDirection: PassDirection;
  roundNumber: number;
  currentTrick: TrickCard[];
  ledSuit: Suit | null;
  currentPlayer: Player;
  heartsBroken: boolean;
  trickComplete: boolean;
  lastTrick: TrickCard[] | null;
  lastTrickWinner: Player | null;
  scores: number[]; // cumulative
  roundScores: number[]; // this round
  winner: Player | null;
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
  clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠',
};

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

export function cardPoints(card: Card): number {
  if (card.suit === 'hearts') return 1;
  if (card.suit === 'spades' && card.rank === 12) return 13; // Q♠
  return 0;
}

export function is2ofClubs(card: Card): boolean {
  return card.suit === 'clubs' && card.rank === 2;
}

const SUIT_ORDER: Suit[] = ['clubs', 'diamonds', 'spades', 'hearts'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createDeck(): Card[] {
  const suits: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
  return suits.flatMap(suit =>
    Array.from({ length: 13 }, (_, i) => ({ suit, rank: i + 2, id: `${suit}-${i + 2}` }))
  );
}

export function sortHand(cards: Card[]): Card[] {
  return [...cards].sort((a, b) =>
    SUIT_ORDER.indexOf(a.suit) !== SUIT_ORDER.indexOf(b.suit)
      ? SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit)
      : a.rank - b.rank
  );
}

export function dealHands(): Card[][] {
  const deck = shuffle(createDeck());
  return [0, 1, 2, 3].map(i => sortHand(deck.slice(i * 13, (i + 1) * 13)));
}

export function passDirectionFor(roundNumber: number): PassDirection {
  const cycle: PassDirection[] = ['left', 'right', 'across', 'none'];
  return cycle[(roundNumber - 1) % 4];
}

export function passTarget(from: Player, direction: PassDirection): Player {
  if (direction === 'left')   return ((from + 1) % 4) as Player;
  if (direction === 'right')  return ((from + 3) % 4) as Player;
  if (direction === 'across') return ((from + 2) % 4) as Player;
  return from;
}

export function getValidCards(
  hand: Card[], ledSuit: Suit | null, heartsBroken: boolean,
  isFirstTrick: boolean, isLeading: boolean,
): Card[] {
  if (isLeading) {
    if (isFirstTrick) return hand.filter(c => c.suit === 'clubs');
    if (!heartsBroken) {
      const nonHearts = hand.filter(c => c.suit !== 'hearts');
      return nonHearts.length > 0 ? nonHearts : hand;
    }
    return hand;
  }
  // Following
  if (ledSuit) {
    const matching = hand.filter(c => c.suit === ledSuit);
    if (matching.length > 0) return matching;
  }
  // Can't follow suit — can play anything except hearts/Q♠ on first trick
  if (isFirstTrick) {
    const safe = hand.filter(c => cardPoints(c) === 0);
    return safe.length > 0 ? safe : hand;
  }
  return hand;
}

export function determineTrickWinner(trick: TrickCard[], ledSuit: Suit): Player {
  return trick.reduce((best, entry) => {
    const bestStr = best.card.suit === ledSuit ? best.card.rank : 0;
    const entStr = entry.card.suit === ledSuit ? entry.card.rank : 0;
    return entStr > bestStr ? entry : best;
  }).player;
}

export function calcRoundScores(hands: Card[][], takenCards: Card[][]): number[] {
  const raw = [0, 1, 2, 3].map(p =>
    takenCards[p].reduce((sum, c) => sum + cardPoints(c), 0)
  );
  // Shoot the moon: one player has all 26
  const moonShooter = raw.findIndex(s => s === 26);
  if (moonShooter !== -1) {
    return raw.map((_, i) => i === moonShooter ? 0 : 26);
  }
  return raw;
}

// ─── AI logic ────────────────────────────────────────────────────────────────

export function aiSelectPassCards(hand: Card[]): Card[] {
  // Priority: Q♠, A♥, K♥, high hearts, high non-hearts
  const priority = [...hand].sort((a, b) => {
    const pa = a.suit === 'spades' && a.rank === 12 ? 1000 :
               a.suit === 'hearts' ? a.rank + 100 : a.rank;
    const pb = b.suit === 'spades' && b.rank === 12 ? 1000 :
               b.suit === 'hearts' ? b.rank + 100 : b.rank;
    return pb - pa;
  });
  return priority.slice(0, 3);
}

export function aiChooseCard(
  hand: Card[], trick: TrickCard[], ledSuit: Suit | null,
  heartsBroken: boolean, isFirstTrick: boolean, takenCards: Card[],
): Card {
  const isLeading = trick.length === 0;
  const valid = getValidCards(hand, ledSuit, heartsBroken, isFirstTrick, isLeading);

  if (isLeading) {
    // Lead lowest safe card; avoid hearts unless forced
    const safe = valid.filter(c => cardPoints(c) === 0);
    const pool = safe.length > 0 ? safe : valid;
    return pool.reduce((best, c) => c.rank < best.rank ? c : best);
  }

  // Check if current trick is being won by anyone
  const currentWinner = ledSuit
    ? trick.reduce((best, t) => {
        const bs = best.card.suit === ledSuit ? best.card.rank : 0;
        const ts = t.card.suit === ledSuit ? t.card.rank : 0;
        return ts > bs ? t : best;
      })
    : trick[0];

  // Can follow suit?
  if (ledSuit && valid.some(c => c.suit === ledSuit)) {
    const matching = valid.filter(c => c.suit === ledSuit);
    const winningRank = currentWinner.card.suit === ledSuit ? currentWinner.card.rank : 0;

    // Cards that would win the trick
    const winning = matching.filter(c => c.rank > winningRank);
    // Cards that safely lose
    const losing = matching.filter(c => c.rank <= winningRank);

    const trickHasPoints = trick.some(t => cardPoints(t.card) > 0);

    if (trickHasPoints) {
      // Avoid winning — play highest losing card, else lowest winning
      if (losing.length > 0) return losing.reduce((best, c) => c.rank > best.rank ? c : best);
      return winning.reduce((best, c) => c.rank < best.rank ? c : best);
    } else {
      // Trick is clean — play highest losing to avoid winning with a high card
      if (losing.length > 0) return losing.reduce((best, c) => c.rank > best.rank ? c : best);
      return winning.reduce((best, c) => c.rank < best.rank ? c : best);
    }
  }

  // Can't follow suit — dump highest point card, else highest card
  const points = valid.filter(c => cardPoints(c) > 0);
  if (points.length > 0) return points.reduce((best, c) => cardPoints(c) > cardPoints(best) ? c : best);
  return valid.reduce((best, c) => c.rank > best.rank ? c : best);
}

export function findFirstPlayer(hands: Card[][]): Player {
  for (let p = 0; p < 4; p++) {
    if (hands[p].some(is2ofClubs)) return p as Player;
  }
  return 0;
}

export function initGame(roundNumber = 1, scores = [0, 0, 0, 0]): HeartsState {
  const hands = dealHands();
  const direction = passDirectionFor(roundNumber);
  const firstPlayer = direction === 'none' ? findFirstPlayer(hands) : 0; // will be set after passing

  return {
    phase: direction === 'none' ? 'playing' : 'passing',
    hands,
    receivedCards: [],
    passDirection: direction,
    roundNumber,
    currentTrick: [],
    ledSuit: null,
    currentPlayer: direction === 'none' ? findFirstPlayer(hands) : 0,
    heartsBroken: false,
    trickComplete: false,
    lastTrick: null,
    lastTrickWinner: null,
    scores,
    roundScores: [0, 0, 0, 0],
    winner: null,
  };
}
