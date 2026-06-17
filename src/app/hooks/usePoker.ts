import { useState, useCallback, useEffect, useRef } from 'react';
import {
  createDeck, shuffleDeck, dealInitial, determineWinners, aiDecide,
  type PokerState, type PokerPlayer, type BettingAction,
} from '../components/poker/pokerEngine';

const SMALL_BLIND = 25;
const BIG_BLIND = 50;
const HUMAN_CHIPS = 1000;
const AI_CHIPS = 500;

export function initPoker(): PokerState {
  const players: PokerPlayer[] = [
    mkPlayer(0, 'You', HUMAN_CHIPS, true),
    mkPlayer(1, 'Alex', AI_CHIPS, false),
    mkPlayer(2, 'Sam', AI_CHIPS, false),
    mkPlayer(3, 'Jordan', AI_CHIPS, false),
  ];
  players[0].isDealer = true;
  return {
    phase: 'waiting',
    players,
    communityCards: [],
    pot: 0,
    sidePots: [],
    currentPlayerIdx: 0,
    dealerIdx: 0,
    smallBlindIdx: 1,
    bigBlindIdx: 2,
    currentBet: 0,
    minRaise: BIG_BLIND,
    deck: [],
    handNumber: 0,
    lastWinners: [],
    showdown: false,
    message: 'Press Deal to start.',
  };
}

function mkPlayer(id: number, name: string, chips: number, isHuman: boolean): PokerPlayer {
  return {
    id, name, chips, holeCards: [], bet: 0, totalBetThisHand: 0,
    status: 'active', isHuman, isDealer: false, lastAction: null,
  };
}

export function usePoker() {
  const [state, setState] = useState<PokerState>(() => initPoker());
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Start a new hand ──────────────────────────────────────────────────────
  const startNewHand = useCallback(() => {
    setState(prev => buildNewHand(prev));
  }, []);

  const newGame = useCallback(() => {
    if (aiTimer.current) clearTimeout(aiTimer.current);
    if (showdownTimer.current) clearTimeout(showdownTimer.current);
    setState(initPoker());
  }, []);

  // ── Human action ──────────────────────────────────────────────────────────
  const playerAction = useCallback((action: BettingAction, raiseAmount?: number) => {
    setState(prev => {
      if (prev.currentPlayerIdx !== 0) return prev;
      if (!isBettingPhase(prev.phase)) return prev;
      const p = prev.players[0];
      if (p.status !== 'active') return prev;
      return applyAction(prev, 0, action, raiseAmount);
    });
  }, []);

  // ── AI auto-advance ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isBettingPhase(state.phase)) return;
    const cur = state.players[state.currentPlayerIdx];
    if (!cur || cur.isHuman) return;
    if (cur.status !== 'active') return;

    const capturedIdx = state.currentPlayerIdx;
    const capturedHand = state.handNumber;
    aiTimer.current = setTimeout(() => {
      setState(prev => {
        if (prev.currentPlayerIdx !== capturedIdx || prev.handNumber !== capturedHand) return prev;
        if (!isBettingPhase(prev.phase)) return prev;
        const ai = prev.players[capturedIdx];
        if (!ai || ai.isHuman || ai.status !== 'active') return prev;
        const decision = aiDecide(ai, prev);
        return applyAction(prev, capturedIdx, decision.action, decision.amount);
      });
    }, 600);

    return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
  }, [state.currentPlayerIdx, state.phase, state.handNumber]);

  // ── Showdown / fold-win resolution → back to waiting ──────────────────────
  useEffect(() => {
    if (state.phase !== 'showdown') return;
    showdownTimer.current = setTimeout(() => {
      setState(prev => {
        if (prev.phase !== 'showdown') return prev;
        return { ...prev, phase: 'waiting', showdown: false, message: 'Press Deal for the next hand.' };
      });
    }, 3000);
    return () => { if (showdownTimer.current) clearTimeout(showdownTimer.current); };
  }, [state.phase, state.handNumber]);

  return { state, playerAction, startNewHand, newGame };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isBettingPhase(phase: PokerState['phase']): boolean {
  return phase === 'pre-flop' || phase === 'flop' || phase === 'turn' || phase === 'river';
}

function buildNewHand(prev: PokerState): PokerState {
  // Remove busted players if more than one remain; else game stays over.
  let players = prev.players.filter(p => p.chips > 0);
  if (players.length <= 1) {
    return { ...prev, phase: 'waiting', message: 'Game over.' };
  }
  // Keep original 4 ids but reset per-hand fields. Busted players become folded ghosts.
  players = prev.players.map(p => ({
    ...p,
    holeCards: [],
    bet: 0,
    totalBetThisHand: 0,
    status: (p.chips > 0 ? 'active' : 'folded') as PokerPlayer['status'],
    isDealer: false,
    lastAction: null,
  }));

  const alive = players.map((p, i) => ({ p, i })).filter(({ p }) => p.chips > 0).map(({ i }) => i);

  // Rotate dealer to next alive player after previous dealer.
  let dealerIdx = nextAliveFrom(prev.dealerIdx + 1, players);
  players[dealerIdx].isDealer = true;

  // Blind positions
  let smallBlindIdx: number;
  let bigBlindIdx: number;
  if (alive.length === 2) {
    smallBlindIdx = dealerIdx; // heads-up: dealer is SB
    bigBlindIdx = nextAliveFrom(dealerIdx + 1, players);
  } else {
    smallBlindIdx = nextAliveFrom(dealerIdx + 1, players);
    bigBlindIdx = nextAliveFrom(smallBlindIdx + 1, players);
  }

  // Post blinds. lastAction stays null so blind players still get to act
  // (the big blind keeps the option to raise pre-flop). Position is shown via
  // the SB/BB chips in the UI instead of the lastAction label.
  let pot = 0;
  pot += postBlind(players[smallBlindIdx], SMALL_BLIND);
  pot += postBlind(players[bigBlindIdx], BIG_BLIND);

  // Deal
  const deck = shuffleDeck(createDeck());
  let st: PokerState = {
    ...prev,
    phase: 'pre-flop',
    players,
    communityCards: [],
    pot,
    sidePots: [],
    dealerIdx,
    smallBlindIdx,
    bigBlindIdx,
    currentBet: BIG_BLIND,
    minRaise: BIG_BLIND,
    deck,
    handNumber: prev.handNumber + 1,
    lastWinners: [],
    showdown: false,
    currentPlayerIdx: nextAliveFrom(bigBlindIdx + 1, players),
    message: 'Pre-flop betting.',
  };
  st = dealInitial(st);
  // Skip players who can't act (all-in due to short blind)
  st.currentPlayerIdx = nextToAct(st, st.currentPlayerIdx);
  if (st.currentPlayerIdx === -1) {
    st = advancePhase(st);
  }
  return st;
}

function postBlind(p: PokerPlayer, amount: number): number {
  const paid = Math.min(amount, p.chips);
  p.chips -= paid;
  p.bet = paid;
  p.totalBetThisHand += paid;
  if (p.chips === 0) p.status = 'all-in';
  return paid;
}

function nextAliveFrom(start: number, players: PokerPlayer[]): number {
  const n = players.length;
  for (let i = 0; i < n; i++) {
    const idx = (start + i) % n;
    if (players[idx].chips > 0 || players[idx].status === 'all-in') return idx;
  }
  return start % n;
}

// Find next player who still needs/can act starting at `from`, or -1 if none.
function nextToAct(state: PokerState, from: number): number {
  const n = state.players.length;
  for (let i = 0; i < n; i++) {
    const idx = (from + i) % n;
    const p = state.players[idx];
    if (p.status === 'active') return idx;
  }
  return -1;
}

// ── Apply a betting action and advance the game ──────────────────────────────
function applyAction(
  prev: PokerState,
  idx: number,
  action: BettingAction,
  raiseAmount?: number
): PokerState {
  const players = prev.players.map(p => ({ ...p }));
  const p = players[idx];
  const toCall = prev.currentBet - p.bet;
  let currentBet = prev.currentBet;
  let minRaise = prev.minRaise;
  let pot = prev.pot;
  let raisedThisAction = false;

  switch (action) {
    case 'fold':
      p.status = 'folded';
      p.lastAction = 'Fold';
      break;

    case 'check':
      if (toCall > 0) {
        // illegal check → treat as call fallback
        const pay = Math.min(toCall, p.chips);
        p.chips -= pay; p.bet += pay; p.totalBetThisHand += pay; pot += pay;
        if (p.chips === 0) p.status = 'all-in';
        p.lastAction = 'Call';
      } else {
        p.lastAction = 'Check';
      }
      break;

    case 'call': {
      const pay = Math.min(toCall, p.chips);
      p.chips -= pay; p.bet += pay; p.totalBetThisHand += pay; pot += pay;
      if (p.chips === 0) p.status = 'all-in';
      p.lastAction = toCall <= 0 ? 'Check' : 'Call';
      break;
    }

    case 'all-in': {
      const pay = p.chips;
      p.chips = 0; p.bet += pay; p.totalBetThisHand += pay; pot += pay;
      p.status = 'all-in';
      p.lastAction = `All-In $${p.bet}`;
      if (p.bet > currentBet) {
        const raiseBy = p.bet - currentBet;
        if (raiseBy >= minRaise) minRaise = raiseBy;
        currentBet = p.bet;
        raisedThisAction = true;
      }
      break;
    }

    case 'raise': {
      // raiseAmount is the TOTAL bet target for this round
      let target = raiseAmount ?? (currentBet + minRaise);
      target = Math.min(target, p.bet + p.chips);
      target = Math.max(target, currentBet + minRaise);
      const pay = Math.min(target - p.bet, p.chips);
      p.chips -= pay; p.bet += pay; p.totalBetThisHand += pay; pot += pay;
      if (p.chips === 0) p.status = 'all-in';
      const raiseBy = p.bet - currentBet;
      if (raiseBy >= minRaise) minRaise = raiseBy;
      currentBet = Math.max(currentBet, p.bet);
      p.lastAction = `Raise $${p.bet}`;
      raisedThisAction = true;
      break;
    }
  }

  let st: PokerState = { ...prev, players, currentBet, minRaise, pot };

  // If only one player remains (others folded) → award & showdown
  const inHand = players.filter(pl => pl.status !== 'folded');
  if (inHand.length === 1) {
    return awardUncontested(st, inHand[0].id);
  }

  // Determine if betting round is complete.
  if (isRoundComplete(st, idx, raisedThisAction)) {
    return advancePhase(st);
  }

  // Next player to act
  let next = nextToAct(st, idx + 1);
  if (next === -1) {
    return advancePhase(st);
  }
  st.currentPlayerIdx = next;
  return st;
}

// A round is complete when every active player has matched currentBet and has acted.
function isRoundComplete(state: PokerState, lastActor: number, _raised: boolean): boolean {
  const actives = state.players.filter(p => p.status === 'active');
  // If 0 or 1 active players remain (rest all-in/folded), no more betting possible
  if (actives.length === 0) return true;
  if (actives.length === 1) {
    // Single active player: round ends only if they've matched the bet
    return actives[0].bet === state.currentBet && actives[0].lastAction !== null;
  }
  // All active players must have acted and matched the bet
  for (const p of actives) {
    if (p.lastAction === null) return false;
    if (p.bet !== state.currentBet) return false;
  }
  return true;
}

function awardUncontested(state: PokerState, winnerId: number): PokerState {
  const players = state.players.map(p => ({ ...p }));
  const winner = players.find(p => p.id === winnerId)!;
  winner.chips += state.pot;
  const lastWinners = [{
    playerIdx: players.indexOf(winner),
    amount: state.pot,
    handName: 'Uncontested',
  }];
  return {
    ...state,
    players,
    pot: 0,
    phase: 'showdown',
    showdown: true,
    lastWinners,
    currentPlayerIdx: -1,
    message: `${winner.name} wins $${state.pot}.`,
  };
}

// ── Advance to next phase: deal community cards or resolve showdown ──────────
function advancePhase(state: PokerState): PokerState {
  // Reset per-round betting fields
  const players = state.players.map(p => ({
    ...p,
    bet: 0,
    lastAction: p.status === 'folded' ? 'Fold' : (p.status === 'all-in' ? p.lastAction : null),
  }));
  let st: PokerState = { ...state, players, currentBet: 0, minRaise: BIG_BLIND };

  const dealCommunity = (count: number): PokerState => {
    const deck = [...st.deck];
    deck.shift(); // burn one
    const community = [...st.communityCards];
    for (let i = 0; i < count; i++) community.push(deck.shift()!);
    return { ...st, deck, communityCards: community };
  };

  let nextPhase: PokerState['phase'];
  switch (st.phase) {
    case 'pre-flop': st = dealCommunity(3); nextPhase = 'flop'; break;
    case 'flop':     st = dealCommunity(1); nextPhase = 'turn'; break;
    case 'turn':     st = dealCommunity(1); nextPhase = 'river'; break;
    case 'river':    return resolveShowdown(st);
    default:         return st;
  }

  st = { ...st, phase: nextPhase, message: `${nextPhase.toUpperCase()} betting.` };

  // First to act post-flop: first active player left of dealer
  const firstToAct = nextToAct(st, st.dealerIdx + 1);

  // If <=1 active players can act, deal remaining streets straight to showdown
  const actives = st.players.filter(p => p.status === 'active');
  if (actives.length <= 1 || firstToAct === -1) {
    return advancePhase(st);
  }

  st.currentPlayerIdx = firstToAct;
  return st;
}

function resolveShowdown(state: PokerState): PokerState {
  const winners = determineWinners(state);
  const players = state.players.map(p => ({ ...p }));
  for (const w of winners) {
    players[w.playerIdx].chips += w.amount;
  }
  const msg = winners.length === 1
    ? `${players[winners[0].playerIdx].name} wins $${winners[0].amount} with ${winners[0].handName}.`
    : `Split pot: ${winners.map(w => players[w.playerIdx].name).join(', ')}.`;
  return {
    ...state,
    players,
    pot: 0,
    phase: 'showdown',
    showdown: true,
    lastWinners: winners,
    currentPlayerIdx: -1,
    message: msg,
  };
}
