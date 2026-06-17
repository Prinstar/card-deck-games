export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
  id: string;
}

export interface GameState {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
  score: number;
  moves: number;
  gameWon: boolean;
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const RANK_LABELS: Record<number, string> = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K',
};

export function isRed(card: Card): boolean {
  return card.suit === 'hearts' || card.suit === 'diamonds';
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const cards: Card[] = [];
  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
      cards.push({ suit, rank: rank as Rank, faceUp: false, id: `${suit}-${rank}` });
    }
  }
  return cards;
}

export function dealGame(): GameState {
  const deck = shuffle(createDeck());
  const tableau: Card[][] = [];
  let idx = 0;

  for (let col = 0; col < 7; col++) {
    const column: Card[] = [];
    for (let row = 0; row <= col; row++) {
      column.push({ ...deck[idx++], faceUp: row === col });
    }
    tableau.push(column);
  }

  return {
    stock: deck.slice(idx).map(c => ({ ...c, faceUp: false })),
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    score: 0,
    moves: 0,
    gameWon: false,
  };
}

export function canDropOnFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) return card.rank === 1;
  const top = foundation[foundation.length - 1];
  return top.suit === card.suit && top.rank === card.rank - 1;
}

export function canDropOnTableau(cards: Card[], column: Card[]): boolean {
  const card = cards[0];
  if (column.length === 0) return card.rank === 13;
  const top = column[column.length - 1];
  if (!top.faceUp) return false;
  return isRed(top) !== isRed(card) && top.rank === card.rank + 1;
}

export function isGameWon(foundations: Card[][]): boolean {
  return foundations.every(f => f.length === 13);
}

export type DragSourceType = 'waste' | 'foundation' | 'tableau';

export interface DragItem {
  sourceType: DragSourceType;
  foundationIdx?: number;
  tableauCol?: number;
  tableauCardIdx?: number;
  cards: Card[];
}

export const CARD_DRAG_TYPE = 'SOLITAIRE_CARD';
