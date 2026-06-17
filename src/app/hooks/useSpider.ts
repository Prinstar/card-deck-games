import { useState, useCallback, useRef } from 'react';
import {
  dealSpider,
  getMovableSequence,
  canPlaceOn,
  removeCompletedSets,
  type SpiderState,
  type SpiderSuits,
} from '../components/spider/spiderEngine';

export interface SpiderSelection {
  col: number;
  idx: number;
}

function applyMove(currentState: SpiderState, fromCol: number, fromIdx: number, toCol: number): SpiderState | null {
  const col = currentState.tableau[fromCol];
  const movingCards = getMovableSequence(col, fromIdx);

  if (movingCards.length !== col.length - fromIdx) return null;

  const toColArr = currentState.tableau[toCol];
  const topOfTarget = toColArr.length > 0 ? toColArr[toColArr.length - 1] : null;

  if (!canPlaceOn(movingCards[0], topOfTarget)) return null;

  const newTableau = currentState.tableau.map(c => [...c]);
  newTableau[fromCol] = newTableau[fromCol].slice(0, fromIdx);

  if (newTableau[fromCol].length > 0) {
    const top = newTableau[fromCol][newTableau[fromCol].length - 1];
    if (!top.faceUp) {
      newTableau[fromCol][newTableau[fromCol].length - 1] = { ...top, faceUp: true };
    }
  }

  newTableau[toCol] = [...newTableau[toCol], ...movingCards];

  const { tableau: cleanedTableau, removed } = removeCompletedSets(newTableau);
  const newCompleted = currentState.completedSets + removed;

  return {
    ...currentState,
    tableau: cleanedTableau,
    completedSets: newCompleted,
    moves: currentState.moves + 1,
    gameWon: newCompleted >= 8,
  };
}

export function useSpider(initialSuits: SpiderSuits = 1) {
  const [state, setState] = useState<SpiderState>(() => dealSpider(initialSuits));
  const [selected, setSelected] = useState<SpiderSelection | null>(null);
  const [history, setHistory] = useState<SpiderState[]>([]);

  // Use a ref to access current state synchronously in callbacks
  const stateRef = useRef(state);
  stateRef.current = state;

  const clickCard = useCallback((col: number, idx: number) => {
    const currentState = stateRef.current;
    const card = currentState.tableau[col]?.[idx];
    if (!card || !card.faceUp) return;

    setSelected(sel => {
      if (sel !== null) {
        if (sel.col === col) {
          // Same column: try to re-select from here or deselect
          const seq = getMovableSequence(currentState.tableau[col], idx);
          if (seq.length > 0 && seq.length === currentState.tableau[col].length - idx) {
            return { col, idx };
          }
          return null;
        } else {
          // Different column: attempt move
          const result = applyMove(currentState, sel.col, sel.idx, col);
          if (result !== null) {
            setHistory(h => [...h.slice(-19), currentState]);
            setState(result);
            return null;
          } else {
            // Move failed, try selecting from this card instead
            const seq = getMovableSequence(currentState.tableau[col], idx);
            if (seq.length > 0 && seq.length === currentState.tableau[col].length - idx) {
              return { col, idx };
            }
            return null;
          }
        }
      } else {
        // No selection: try to select
        const seq = getMovableSequence(currentState.tableau[col], idx);
        if (seq.length > 0 && seq.length === currentState.tableau[col].length - idx) {
          return { col, idx };
        }
        return null;
      }
    });
  }, []);

  const clickColumn = useCallback((col: number) => {
    const currentState = stateRef.current;
    setSelected(sel => {
      if (sel === null) return null;
      const result = applyMove(currentState, sel.col, sel.idx, col);
      if (result !== null) {
        setHistory(h => [...h.slice(-19), currentState]);
        setState(result);
        return null;
      }
      return null;
    });
  }, []);

  const dealStock = useCallback(() => {
    const currentState = stateRef.current;
    if (currentState.stock.length === 0) return;
    if (currentState.tableau.some(c => c.length === 0)) return;

    setHistory(h => [...h.slice(-19), currentState]);
    setSelected(null);

    const newStock = [...currentState.stock];
    const group = newStock.shift()!;

    const newTableau = currentState.tableau.map((col, i) => {
      const dealtCard = { ...group[i], faceUp: true };
      return [...col, dealtCard];
    });

    const { tableau: cleanedTableau, removed } = removeCompletedSets(newTableau);
    const newCompleted = currentState.completedSets + removed;

    setState({
      ...currentState,
      tableau: cleanedTableau,
      stock: newStock,
      completedSets: newCompleted,
      moves: currentState.moves + 1,
      gameWon: newCompleted >= 8,
    });
  }, []);

  const undo = useCallback(() => {
    setHistory(h => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setState(prev);
      setSelected(null);
      return h.slice(0, h.length - 1);
    });
  }, []);

  const newGame = useCallback((suits?: SpiderSuits) => {
    const currentState = stateRef.current;
    setState(dealSpider(suits ?? currentState.suits));
    setSelected(null);
    setHistory([]);
  }, []);

  return {
    state,
    selected,
    clickCard,
    clickColumn,
    dealStock,
    undo,
    newGame,
    canUndo: history.length > 0,
  };
}
