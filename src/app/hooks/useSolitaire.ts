import { useState, useCallback, useEffect, useRef } from 'react';
import {
  dealGame, canDropOnFoundation, canDropOnTableau, isGameWon,
  type GameState, type Card, type DragItem,
} from '../components/solitaire/gameEngine';

function removeFromSource(prev: GameState, item: DragItem): Partial<GameState> {
  if (item.sourceType === 'waste') {
    return { waste: prev.waste.slice(0, -1) };
  }
  if (item.sourceType === 'foundation' && item.foundationIdx !== undefined) {
    const foundations = prev.foundations.map((f, i) =>
      i === item.foundationIdx ? f.slice(0, -1) : [...f]
    );
    return { foundations };
  }
  if (item.sourceType === 'tableau' && item.tableauCol !== undefined && item.tableauCardIdx !== undefined) {
    const tableau = prev.tableau.map((col, i) => {
      if (i !== item.tableauCol) return [...col];
      const newCol = col.slice(0, item.tableauCardIdx);
      if (newCol.length > 0) {
        newCol[newCol.length - 1] = { ...newCol[newCol.length - 1], faceUp: true };
      }
      return newCol;
    });
    return { tableau };
  }
  return {};
}

export function useSolitaire() {
  const [state, setState] = useState<GameState>(() => dealGame());
  const [time, setTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  useEffect(() => {
    if (state.gameWon && timerRef.current) clearInterval(timerRef.current);
  }, [state.gameWon]);

  const newGame = useCallback(() => {
    setState(dealGame());
    setTime(0);
    startTimer();
  }, [startTimer]);

  const drawFromStock = useCallback(() => {
    setState(prev => {
      if (prev.stock.length === 0) {
        if (prev.waste.length === 0) return prev;
        return {
          ...prev,
          stock: [...prev.waste].reverse().map(c => ({ ...c, faceUp: false })),
          waste: [],
          moves: prev.moves + 1,
        };
      }
      const drawnCard = { ...prev.stock[prev.stock.length - 1], faceUp: true };
      return {
        ...prev,
        stock: prev.stock.slice(0, -1),
        waste: [...prev.waste, drawnCard],
        moves: prev.moves + 1,
      };
    });
  }, []);

  const moveToFoundation = useCallback((item: DragItem, foundationIndex: number) => {
    setState(prev => {
      if (item.cards.length !== 1) return prev;
      const card = item.cards[0];
      if (!canDropOnFoundation(card, prev.foundations[foundationIndex])) return prev;

      const partial = removeFromSource(prev, item);
      const foundations = (partial.foundations ?? prev.foundations).map((f, i) =>
        i === foundationIndex ? [...f, card] : [...f]
      );
      const gameWon = isGameWon(foundations);

      return {
        ...prev,
        ...partial,
        foundations,
        score: prev.score + 10,
        moves: prev.moves + 1,
        gameWon,
      };
    });
  }, []);

  const moveToTableau = useCallback((item: DragItem, colIndex: number) => {
    setState(prev => {
      if (!canDropOnTableau(item.cards, prev.tableau[colIndex])) return prev;

      const partial = removeFromSource(prev, item);
      const tableau = (partial.tableau ?? prev.tableau).map((col, i) =>
        i === colIndex ? [...col, ...item.cards] : [...col]
      );

      return { ...prev, ...partial, tableau, moves: prev.moves + 1 };
    });
  }, []);

  const autoMoveToFoundation = useCallback((card: Card, item: DragItem) => {
    setState(prev => {
      if (item.cards.length !== 1) return prev;
      let foundIdx = -1;
      for (let i = 0; i < 4; i++) {
        if (canDropOnFoundation(card, prev.foundations[i])) { foundIdx = i; break; }
      }
      if (foundIdx === -1) return prev;

      const partial = removeFromSource(prev, item);
      const foundations = (partial.foundations ?? prev.foundations).map((f, i) =>
        i === foundIdx ? [...f, card] : [...f]
      );
      const gameWon = isGameWon(foundations);

      return {
        ...prev,
        ...partial,
        foundations,
        score: prev.score + 10,
        moves: prev.moves + 1,
        gameWon,
      };
    });
  }, []);

  return { state, time, newGame, drawFromStock, moveToFoundation, moveToTableau, autoMoveToFoundation };
}
