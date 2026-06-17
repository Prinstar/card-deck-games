import { useState, useCallback, useEffect } from 'react';
import {
  initGame, dealHands, sortHand, getValidCards, determineTrickWinner,
  calcRoundScores, aiChooseCard, aiSelectPassCards, passTarget, findFirstPlayer,
  cardPoints,
  type HeartsState, type Player, type Card, type Suit,
} from '../components/hearts/heartsEngine';

// takenCards tracked separately (not in HeartsState to keep it lean)
// We derive round scores at end from takenCards

export function useHearts() {
  const [state, setState] = useState<HeartsState>(() => initGame());
  // takenCards: cards won per player this round
  const [takenCards, setTakenCards] = useState<Card[][]>([[], [], [], []]);

  // Reset takenCards when a new round starts
  useEffect(() => {
    if (state.phase === 'passing' || (state.phase === 'playing' && state.currentTrick.length === 0 && !state.lastTrick)) {
      setTakenCards([[], [], [], []]);
    }
  }, [state.roundNumber]);

  // AI auto-action
  useEffect(() => {
    const { phase, currentPlayer, trickComplete } = state;

    if (phase === 'passing') {
      // AI passes handled synchronously in startPlay
      return;
    }

    if (trickComplete) return;
    if (currentPlayer === 0) return;
    if (phase !== 'playing') return;

    const capturedPlayer = currentPlayer;
    const t = setTimeout(() => {
      setState(prev => {
        if (prev.currentPlayer !== capturedPlayer || prev.phase !== 'playing' || prev.trickComplete) return prev;
        const isLeading = prev.currentTrick.length === 0;
        const isFirstTrick = isTrickOne(prev);
        const card = aiChooseCard(
          prev.hands[capturedPlayer],
          prev.currentTrick,
          prev.ledSuit,
          prev.heartsBroken,
          isFirstTrick,
          [],
        );
        return applyPlayCard(prev, capturedPlayer, card);
      });
    }, 300 + Math.random() * 200);

    return () => clearTimeout(t);
  }, [state.currentPlayer, state.phase, state.trickComplete]);

  // Resolve completed trick after pause
  useEffect(() => {
    if (!state.trickComplete) return;
    const t = setTimeout(() => {
      setState(prev => {
        if (!prev.trickComplete) return prev;
        const winner = prev.lastTrickWinner!;
        const trickCards = prev.lastTrick!.map(t => t.card);

        setTakenCards(tc => {
          const next = tc.map((arr, i) => i === winner ? [...arr, ...trickCards] : arr);
          const totalTaken = next.reduce((s, arr) => s + arr.length, 0);

          if (totalTaken === 52) {
            // Round over — compute scores
            const roundScores = calcRoundScores(prev.hands, next);
            const newScores = prev.scores.map((s, i) => s + roundScores[i]);
            const isGameOver = newScores.some(s => s >= 100);
            const gameWinner = isGameOver
              ? newScores.indexOf(Math.min(...newScores)) as Player
              : null;

            setState(s => ({
              ...s,
              trickComplete: false,
              roundScores,
              scores: newScores,
              phase: isGameOver ? 'game_over' : 'round_end',
              winner: gameWinner,
            }));
          }

          return next;
        });

        const totalCards = prev.lastTrick!.length * (prev.lastTrick ? 1 : 0); // trick is 4 cards
        // Check if last trick (hands empty)
        if (prev.hands[0].length === 0) return prev; // round_end handled in setTakenCards

        return {
          ...prev,
          trickComplete: false,
          currentTrick: [],
          ledSuit: null,
          currentPlayer: winner,
        };
      });
    }, 800);
    return () => clearTimeout(t);
  }, [state.trickComplete]);

  const submitPass = useCallback((cardIds: string[]) => {
    setState(prev => {
      if (prev.phase !== 'passing' || cardIds.length !== 3) return prev;

      const direction = prev.passDirection;
      const newHands = prev.hands.map(h => [...h]) as Card[][];

      // Build pass map: each player passes 3 cards in direction
      const passes: Card[][] = [[], [], [], []];
      passes[0] = cardIds.map(id => newHands[0].find(c => c.id === id)!);

      for (let p = 1; p < 4; p++) {
        passes[p] = aiSelectPassCards(newHands[p]);
      }

      // Remove passed cards from hands and deliver to targets
      for (let p = 0; p < 4; p++) {
        const target = passTarget(p as Player, direction);
        newHands[p] = newHands[p].filter(c => !passes[p].some(pc => pc.id === c.id));
        newHands[target] = sortHand([...newHands[target], ...passes[p]]);
      }

      const firstPlayer = findFirstPlayer(newHands);
      const receivedCards = passes.map((_, i) => passes[passTarget(i as Player, direction) === 0 ? i : -1]).flat().filter(Boolean);

      // Cards the user receives = cards passed to player 0
      const userReceived = [0, 1, 2, 3]
        .filter(p => passTarget(p as Player, direction) === 0)
        .flatMap(p => passes[p]);

      return {
        ...prev,
        hands: newHands,
        receivedCards: userReceived,
        phase: 'playing',
        currentPlayer: firstPlayer,
      };
    });
  }, []);

  const playCard = useCallback((card: Card) => {
    setState(prev => {
      if (prev.phase !== 'playing' || prev.currentPlayer !== 0 || prev.trickComplete) return prev;
      const isFirstTrick = isTrickOne(prev);
      const valid = getValidCards(prev.hands[0], prev.ledSuit, prev.heartsBroken, isFirstTrick, prev.currentTrick.length === 0);
      if (!valid.some(c => c.id === card.id)) return prev;
      return applyPlayCard(prev, 0, card);
    });
  }, []);

  const nextRound = useCallback(() => {
    setState(prev => {
      if (prev.phase !== 'round_end') return prev;
      const next = initGame(prev.roundNumber + 1, prev.scores);
      setTakenCards([[], [], [], []]);
      return next;
    });
  }, []);

  const newGame = useCallback(() => {
    setState(initGame());
    setTakenCards([[], [], [], []]);
  }, []);

  return { state, takenCards, submitPass, playCard, nextRound, newGame };
}

function isTrickOne(state: HeartsState): boolean {
  // First trick: no hearts can have been broken AND currentTrick has the 2 of clubs OR last trick count is 0
  // Simple heuristic: if heartsBroken is false and no tricks taken yet
  const totalTaken = state.hands.reduce((s, h) => s + (13 - h.length), 0);
  return totalTaken < 4; // fewer than 4 cards played total means first trick
}

function applyPlayCard(prev: HeartsState, player: Player, card: Card): HeartsState {
  const newHands = prev.hands.map((h, i) =>
    i === player ? h.filter(c => c.id !== card.id) : [...h]
  );
  const newTrick = [...prev.currentTrick, { player, card }];
  const ledSuit = (prev.currentTrick.length === 0 ? card.suit : prev.ledSuit) as Suit;
  const isQueenOfSpades = card.suit === 'spades' && card.rank === 12;
  const heartsBroken = prev.heartsBroken || card.suit === 'hearts' || isQueenOfSpades;

  if (newTrick.length < 4) {
    return {
      ...prev,
      hands: newHands,
      currentTrick: newTrick,
      ledSuit,
      heartsBroken,
      currentPlayer: ((player + 1) % 4) as Player,
    };
  }

  const winner = determineTrickWinner(newTrick, ledSuit);
  return {
    ...prev,
    hands: newHands,
    currentTrick: newTrick,
    ledSuit,
    heartsBroken,
    trickComplete: true,
    lastTrick: newTrick,
    lastTrickWinner: winner,
  };
}
