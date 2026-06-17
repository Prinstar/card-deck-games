export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type SpiderSuits = 1 | 2 | 4;

export interface Card {
  suit: Suit;
  rank: number; // 2-14, 14=Ace
  id: string;
  faceUp: boolean;
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
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

export interface SpiderState {
  tableau: Card[][];
  stock: Card[][];   // 5 groups of 10, dealt one group at a time
  completedSets: number; // 0-8, win at 8
  moves: number;
  gameWon: boolean;
  suits: SpiderSuits;
}

function makeDeck(suits: SpiderSuits, deckIndex: number): Card[] {
  const cards: Card[] = [];
  const suitList: Suit[] =
    suits === 1 ? ['spades'] :
    suits === 2 ? ['spades', 'hearts'] :
    ['clubs', 'diamonds', 'hearts', 'spades'];

  // For 1 suit: 8 copies per rank (8 * 13 = 104)
  // For 2 suits: 4 copies per rank per suit (4 * 2 * 13 = 104)
  // For 4 suits: 2 copies per rank per suit (2 * 4 * 13 = 104)
  const copies = suits === 1 ? 8 : suits === 2 ? 4 : 2;

  let cardIndex = 0;
  for (let c = 0; c < copies; c++) {
    for (const suit of suitList) {
      for (let rank = 2; rank <= 14; rank++) {
        cards.push({
          suit,
          rank,
          id: `${deckIndex}-${suit}-${rank}-${c}`,
          faceUp: false,
        });
        cardIndex++;
      }
    }
  }
  return cards;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dealSpider(suits: SpiderSuits = 1): SpiderState {
  const deck = shuffle(makeDeck(suits, 0));

  // Tableau: 10 columns, cols 0-3 get 6 cards, cols 4-9 get 5 cards = 54 total
  const tableau: Card[][] = [];
  let idx = 0;

  for (let col = 0; col < 10; col++) {
    const count = col < 4 ? 6 : 5;
    const colCards: Card[] = [];
    for (let i = 0; i < count; i++) {
      colCards.push({ ...deck[idx++], faceUp: false });
    }
    // Flip top card face up
    colCards[colCards.length - 1] = { ...colCards[colCards.length - 1], faceUp: true };
    tableau.push(colCards);
  }

  // Remaining 50 cards go into 5 stock groups of 10
  const stock: Card[][] = [];
  for (let g = 0; g < 5; g++) {
    const group: Card[] = [];
    for (let i = 0; i < 10; i++) {
      group.push({ ...deck[idx++], faceUp: false });
    }
    stock.push(group);
  }

  return {
    tableau,
    stock,
    completedSets: 0,
    moves: 0,
    gameWon: false,
    suits,
  };
}

/**
 * Returns the valid movable sequence starting at fromIdx.
 * Cards must be face-up, same suit, strictly descending rank.
 */
export function getMovableSequence(col: Card[], fromIdx: number): Card[] {
  if (fromIdx >= col.length) return [];
  const first = col[fromIdx];
  if (!first.faceUp) return [];

  const seq: Card[] = [first];
  for (let i = fromIdx + 1; i < col.length; i++) {
    const prev = col[i - 1];
    const curr = col[i];
    if (!curr.faceUp) break;
    if (curr.suit !== prev.suit) break;
    if (curr.rank !== prev.rank - 1) break;
    seq.push(curr);
  }
  return seq;
}

/**
 * Returns true if movingCard can be placed on topOfCol.
 * Empty column (null) accepts any card.
 * Otherwise topOfCol.rank must equal movingCard.rank + 1.
 */
export function canPlaceOn(movingCard: Card, topOfCol: Card | null): boolean {
  if (topOfCol === null) return true;
  return topOfCol.rank === movingCard.rank + 1;
}

/**
 * Checks if the last 13 cards of col form a complete K→A same-suit sequence.
 * K(13), Q(12), J(11), 10, 9, 8, 7, 6, 5, 4, 3, 2, A(14)
 */
export function checkCompletedSet(col: Card[]): boolean {
  if (col.length < 13) return false;
  const tail = col.slice(col.length - 13);
  if (tail[0].rank !== 13) return false;
  const suit = tail[0].suit;
  for (let i = 1; i <= 11; i++) {
    if (tail[i].suit !== suit) return false;
    if (tail[i].rank !== tail[i - 1].rank - 1) return false;
  }
  // Last card must be Ace (14)
  if (tail[12].suit !== suit) return false;
  if (tail[12].rank !== 14) return false;
  return true;
}

/**
 * For each column, while the bottom 13 cards form a complete set, remove them
 * and flip the new top card face up. Returns updated tableau and count removed.
 */
export function removeCompletedSets(tableau: Card[][]): { tableau: Card[][]; removed: number } {
  let removed = 0;
  const newTableau = tableau.map(col => [...col]);

  let changed = true;
  while (changed) {
    changed = false;
    for (let c = 0; c < newTableau.length; c++) {
      while (checkCompletedSet(newTableau[c])) {
        newTableau[c] = newTableau[c].slice(0, newTableau[c].length - 13);
        // Flip new top card face up
        if (newTableau[c].length > 0) {
          const top = newTableau[c][newTableau[c].length - 1];
          if (!top.faceUp) {
            newTableau[c][newTableau[c].length - 1] = { ...top, faceUp: true };
          }
        }
        removed++;
        changed = true;
      }
    }
  }

  return { tableau: newTableau, removed };
}
