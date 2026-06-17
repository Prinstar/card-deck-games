import { useState, useCallback, useEffect } from 'react';
import {
  initGame, getValidCards, determineTrickWinner,
  aiChooseBid, aiChooseCard, calculateRoundScore,
  type SpadesState, type Player, type Card, type Suit,
} from '../components/spades/spadesEngine';

const GAME_OVER_SCORE = 500;
const LOSE_SCORE = -200;

export function useSpades() {
  const [state, setState] = useState<SpadesState>(() => initGame());

  // Clear completed trick after a short pause so all 4 cards are visible
  useEffect(() => {
    if (!state.trickComplete) return;
    const t = setTimeout(() => {
      setState(prev => {
        if (!prev.trickComplete) return prev;
        return resolveTrick(prev);
      });
    }, 750);
    return () => clearTimeout(t);
  }, [state.trickComplete]);

  useEffect(() => {
    const { phase, currentPlayer, trickComplete } = state;
    if (trickComplete) return; // wait for trick to clear before AI acts
    if (currentPlayer === 0) return;
    if (phase !== 'bidding' && phase !== 'playing') return;

    const capturedPlayer = currentPlayer;
    const capturedPhase = phase;
    const delay = phase === 'bidding' ? 300 + Math.random() * 200 : 250 + Math.random() * 150;

    const t = setTimeout(() => {
      setState(prev => {
        if (prev.currentPlayer !== capturedPlayer || prev.phase !== capturedPhase) return prev;

        if (capturedPhase === 'bidding') {
          if (prev.bids[capturedPlayer] !== null) return prev;
          const bid = aiChooseBid(prev.hands[capturedPlayer]);
          const newBids = [...prev.bids];
          newBids[capturedPlayer] = bid;
          if (allBidsIn(newBids)) {
            return { ...prev, bids: newBids, phase: 'playing', currentPlayer: 1 };
          }
          return { ...prev, bids: newBids, currentPlayer: getNextBidder(capturedPlayer, newBids) };
        }

        // playing
        const card = aiChooseCard(
          prev.hands[capturedPlayer],
          prev.currentTrick,
          prev.ledSuit,
          prev.spadesBroken,
          capturedPlayer,
        );
        return applyPlayCard(prev, capturedPlayer, card);
      });
    }, delay);

    return () => clearTimeout(t);
  }, [state.currentPlayer, state.phase, state.trickComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  const placeBid = useCallback((bid: number, isNil = false) => {
    setState(prev => {
      if (prev.phase !== 'bidding' || prev.currentPlayer !== 0) return prev;
      const newBids = [...prev.bids];
      newBids[0] = isNil ? 0 : bid;
      const newNilBids = [...prev.nilBids];
      newNilBids[0] = isNil;
      if (allBidsIn(newBids)) {
        return { ...prev, bids: newBids, nilBids: newNilBids, phase: 'playing', currentPlayer: 1 };
      }
      return { ...prev, bids: newBids, nilBids: newNilBids, currentPlayer: getNextBidder(0, newBids) };
    });
  }, []);

  const playCard = useCallback((card: Card) => {
    setState(prev => {
      if (prev.phase !== 'playing' || prev.currentPlayer !== 0) return prev;
      const valid = getValidCards(prev.hands[0], prev.ledSuit, prev.spadesBroken);
      if (!valid.some(c => c.id === card.id)) return prev;
      return applyPlayCard(prev, 0, card);
    });
  }, []);

  const nextRound = useCallback(() => {
    setState(prev => {
      if (prev.phase !== 'round_end') return prev;
      const result = prev.roundResult!;
      const newScores: [number, number] = [
        prev.teamScores[0] + result.teamDelta[0],
        prev.teamScores[1] + result.teamDelta[1],
      ];
      const newBags = result.newBags as [number, number];

      let winner: 0 | 1 | null = null;
      if (newScores[0] >= GAME_OVER_SCORE || newScores[1] <= LOSE_SCORE) winner = 0;
      else if (newScores[1] >= GAME_OVER_SCORE || newScores[0] <= LOSE_SCORE) winner = 1;

      if (winner !== null) {
        return { ...prev, teamScores: newScores, winner, phase: 'game_over' };
      }

      const newDealer = ((prev.dealer + 1) % 4) as Player;
      const firstBidder = ((newDealer + 1) % 4) as Player;
      return {
        ...initGame(),
        teamScores: newScores,
        teamBags: newBags,
        dealer: newDealer,
        currentPlayer: firstBidder,
      };
    });
  }, []);

  const newGame = useCallback(() => setState(initGame()), []);

  return { state, placeBid, playCard, nextRound, newGame };
}

function allBidsIn(bids: (number | null)[]): boolean {
  return bids.every(b => b !== null);
}

function getNextBidder(current: Player, bids: (number | null)[]): Player {
  const order: Player[] = [1, 2, 3, 0];
  const idx = order.indexOf(current);
  for (let i = 1; i <= 4; i++) {
    const next = order[(idx + i) % 4];
    if (bids[next] === null) return next;
  }
  return 1;
}

function applyPlayCard(prev: SpadesState, player: Player, card: Card): SpadesState {
  const newHands = prev.hands.map((h, i) =>
    i === player ? h.filter(c => c.id !== card.id) : [...h]
  );
  const newTrick = [...prev.currentTrick, { player, card }];
  const ledSuit = (prev.currentTrick.length === 0 ? card.suit : prev.ledSuit) as Suit;
  const spadesBroken = prev.spadesBroken || card.suit === 'spades';

  if (newTrick.length < 4) {
    const nextPlayer = ((player + 1) % 4) as Player;
    return { ...prev, hands: newHands, currentTrick: newTrick, ledSuit, spadesBroken, currentPlayer: nextPlayer };
  }

  // All 4 cards played — pause so user can see them, resolve later via resolveTrick()
  const winner = determineTrickWinner(newTrick, ledSuit);
  return {
    ...prev,
    hands: newHands,
    currentTrick: newTrick,
    ledSuit,
    spadesBroken,
    trickComplete: true,
    lastTrick: newTrick,
    lastTrickWinner: winner,
  };
}

function resolveTrick(prev: SpadesState): SpadesState {
  const { currentTrick, ledSuit, lastTrickWinner: winner } = prev;
  if (!winner === undefined || !ledSuit) return prev;

  const newTrickCounts = [...prev.trickCounts];
  newTrickCounts[winner!]++;
  const totalTricks = newTrickCounts.reduce((a, b) => a + b, 0);

  if (totalTricks < 13) {
    return {
      ...prev,
      currentTrick: [],
      ledSuit: null,
      trickComplete: false,
      currentPlayer: winner!,
      trickCounts: newTrickCounts,
    };
  }

  const roundResult = calculateRoundScore({ ...prev, trickCounts: newTrickCounts });
  return {
    ...prev,
    currentTrick: [],
    ledSuit: null,
    trickComplete: false,
    trickCounts: newTrickCounts,
    lastTrickWinner: winner,
    roundResult,
    phase: 'round_end',
  };
}
