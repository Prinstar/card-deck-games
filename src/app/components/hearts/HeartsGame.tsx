import { useState, useEffect, useRef } from 'react';
import { useHearts } from '../../hooks/useHearts';
import { useSettings, TABLE_COLORS, CARD_BACKS } from '../../contexts/SettingsContext';
import { SettingsButton, SettingsPanel } from '../SettingsPanel';
import {
  SUIT_SYMBOLS, rankLabel, isRed, getValidCards, cardPoints,
  passDirectionFor,
  type Card, type Player,
} from './heartsEngine';
import { HowToPlayModal } from '../HowToPlayModal';
import { QuitConfirmModal } from '../QuitConfirmModal';

const CARD_W = 66;
const CARD_H = 94;

const PLAYER_NAMES = ['You', 'West', 'North', 'East'];
const PASS_LABELS: Record<string, string> = {
  left: '→ Pass Left',
  right: '← Pass Right',
  across: '↑ Pass Across',
  none: 'No Pass',
};

// ─── Card face ────────────────────────────────────────────────────────────────
function HeartsCardFace({ card, selected, dimmed, onClick }: {
  card: Card; selected?: boolean; dimmed?: boolean; onClick?: () => void;
}) {
  const red = isRed(card);
  const isQofSpades = card.suit === 'spades' && card.rank === 12;
  const isPenalty = cardPoints(card) > 0;
  const color = red ? '#c0392b' : '#1a1a2e';
  const sym = SUIT_SYMBOLS[card.suit];
  const lbl = rankLabel(card.rank);

  let border = '1px solid #d4cfc8';
  if (selected) border = '2px solid #c9a84c';
  else if (isQofSpades) border = '2px solid #7b1fa2';
  else if (isPenalty) border = '1px solid #e8c0c0';

  return (
    <div
      onClick={onClick}
      style={{
        width: CARD_W, height: CARD_H,
        background: isQofSpades ? 'linear-gradient(160deg, #fff 60%, #f3e5f5 100%)' : '#fff',
        borderRadius: 5,
        border,
        boxShadow: selected
          ? '0 0 0 3px rgba(201,168,76,0.4), 0 4px 12px rgba(0,0,0,0.3)'
          : isQofSpades
          ? '0 0 0 2px rgba(123,31,162,0.25), 0 2px 8px rgba(0,0,0,0.3)'
          : '0 2px 6px rgba(0,0,0,0.25)',
        position: 'relative', opacity: dimmed ? 0.4 : 1,
        cursor: onClick ? 'pointer' : 'default',
        transform: selected ? 'translateY(-10px)' : 'none',
        transition: 'transform 0.1s, box-shadow 0.1s',
        color, fontFamily: 'Georgia, "Times New Roman", serif',
        userSelect: 'none', flexShrink: 0,
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.transform = selected ? 'translateY(-12px)' : 'translateY(-4px)'; }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLElement).style.transform = selected ? 'translateY(-10px)' : 'none'; }}
    >
      <div style={{ position: 'absolute', top: 3, left: 5, lineHeight: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{lbl}</div>
        <div style={{ fontSize: 10 }}>{sym}</div>
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
        {sym}
      </div>
      {isQofSpades && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, 8px)',
          fontSize: 9, fontWeight: 700, color: '#7b1fa2',
          background: 'rgba(243,229,245,0.9)', borderRadius: 3,
          padding: '1px 4px', letterSpacing: '0.04em',
          fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap',
        }}>
          13 pts
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 3, right: 5, lineHeight: 1, transform: 'rotate(180deg)', textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{lbl}</div>
        <div style={{ fontSize: 10 }}>{sym}</div>
      </div>
    </div>
  );
}

function HeartsCardBack({ backFrom, backTo }: { backFrom?: string; backTo?: string }) {
  const from = backFrom ?? '#1a237e';
  const to = backTo ?? '#283593';
  return (
    <div style={{
      width: 36, height: 50, borderRadius: 4,
      border: '1px solid rgba(201,168,76,0.3)',
      background: `linear-gradient(135deg, ${from}, ${to})`,
      flexShrink: 0,
    }} />
  );
}

function TrickSlot({ card, label, isWinner }: { card?: Card; label: string; isWinner?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ fontSize: 10, color: 'rgba(201,168,76,0.7)', letterSpacing: '0.06em', fontFamily: 'DM Sans, sans-serif' }}>{label}</div>
      {card ? (
        <div style={{ outline: isWinner ? '2px solid #c9a84c' : 'none', borderRadius: 6, outlineOffset: 2 }}>
          <HeartsCardFace card={card} />
        </div>
      ) : (
        <div style={{ width: CARD_W, height: CARD_H, borderRadius: 5, border: '1px dashed rgba(201,168,76,0.2)' }} />
      )}
    </div>
  );
}

function AIHand({ count, horizontal, backFrom, backTo }: {
  count: number; horizontal?: boolean; backFrom?: string; backTo?: string;
}) {
  const overlap = horizontal ? -18 : -28;
  return (
    <div style={{ display: 'flex', flexDirection: horizontal ? 'row' : 'column', position: 'relative' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ [horizontal ? 'marginLeft' : 'marginTop']: i === 0 ? 0 : overlap, zIndex: i, position: 'relative' }}>
          <HeartsCardBack backFrom={backFrom} backTo={backTo} />
        </div>
      ))}
    </div>
  );
}

function PlayerInfo({ player, score, roundScore, isActive }: {
  player: Player; score: number; roundScore: number; isActive: boolean;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      padding: '4px 10px', borderRadius: 6,
      background: isActive ? 'rgba(201,168,76,0.15)' : 'transparent',
      border: isActive ? '1px solid rgba(201,168,76,0.4)' : '1px solid transparent',
      transition: 'all 0.2s',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#c9a84c' : '#a8c4ad', fontFamily: 'DM Sans, sans-serif' }}>
        {PLAYER_NAMES[player]}
      </div>
      <div style={{ fontSize: 11, color: '#f5efe0', fontFamily: 'DM Sans, sans-serif' }}>
        {score} pts {roundScore > 0 && (
          <span style={{ color: '#e57373' }}>+{roundScore}</span>
        )}
      </div>
    </div>
  );
}

// ─── Passing panel ────────────────────────────────────────────────────────────
function PassingPanel({ hand, direction, onPass, panelBg }: {
  hand: Card[]; direction: string; onPass: (ids: string[]) => void; panelBg: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); return next; }
      if (next.size >= 3) return prev;
      next.add(id);
      return next;
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: panelBg, border: '1px solid rgba(201,168,76,0.5)',
        borderRadius: 16, padding: '28px 32px',
        width: '100%', maxWidth: 580,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)', fontFamily: 'DM Sans, sans-serif',
      }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', margin: '0 0 6px', fontSize: 20, textAlign: 'center' }}>
          {PASS_LABELS[direction]}
        </h2>
        <p style={{ color: '#a8c4ad', textAlign: 'center', margin: '0 0 20px', fontSize: 13 }}>
          Select 3 cards to pass ({selected.size}/3)
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
          {hand.map(card => (
            <HeartsCardFace
              key={card.id}
              card={card}
              selected={selected.has(card.id)}
              onClick={() => toggle(card.id)}
            />
          ))}
        </div>

        <button
          disabled={selected.size !== 3}
          onClick={() => onPass([...selected])}
          style={{
            width: '100%', padding: '12px 0',
            background: selected.size === 3 ? '#c9a84c' : 'rgba(201,168,76,0.2)',
            color: selected.size === 3 ? '#1a1a1a' : '#a8c4ad',
            border: 'none', borderRadius: 8,
            fontFamily: 'Cinzel, serif', fontSize: 15, fontWeight: 600,
            cursor: selected.size === 3 ? 'pointer' : 'default', letterSpacing: '0.04em',
            transition: 'all 0.15s',
          }}
        >
          Pass Cards
        </button>
      </div>
    </div>
  );
}

// ─── Round end panel ──────────────────────────────────────────────────────────
function RoundEndPanel({ scores, roundScores, onContinue, panelBg }: {
  scores: number[]; roundScores: number[]; onContinue: () => void; panelBg: string;
}) {
  const nextPassDir = passDirectionFor(0); // shown for info only
  const moonShooter = roundScores.findIndex(s => s === 0 && scores.some((_, i) => roundScores[i] === 26));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: panelBg, border: '1px solid rgba(201,168,76,0.5)', borderRadius: 16, padding: 32, minWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', fontFamily: 'DM Sans, sans-serif' }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', margin: '0 0 20px', fontSize: 22, textAlign: 'center' }}>Round Over</h2>

        {moonScores(roundScores) && (
          <div style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 8, padding: '8px 16px', marginBottom: 16, textAlign: 'center', color: '#c9a84c', fontSize: 13 }}>
            ♥ {PLAYER_NAMES[roundScores.indexOf(0) as Player]} shot the moon! +26 to all others
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {([0, 1, 2, 3] as Player[]).map(p => (
            <div key={p} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: 6 }}>
              <span style={{ color: p === 0 ? '#c9a84c' : '#f5efe0', fontWeight: p === 0 ? 600 : 400 }}>{PLAYER_NAMES[p]}</span>
              <span style={{ color: roundScores[p] > 0 ? '#e57373' : '#81c784' }}>
                {roundScores[p] > 0 ? `+${roundScores[p]}` : '0'} → <strong style={{ color: '#f5efe0' }}>{scores[p]}</strong>
              </span>
            </div>
          ))}
        </div>

        <button onClick={onContinue} style={{ width: '100%', padding: '12px 0', background: '#c9a84c', color: '#1a1a1a', border: 'none', borderRadius: 8, fontFamily: 'Cinzel, serif', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          Next Round
        </button>
      </div>
    </div>
  );
}

function moonScores(roundScores: number[]): boolean {
  return roundScores.some(s => s === 0) && roundScores.some(s => s === 26);
}

// ─── Game over panel ──────────────────────────────────────────────────────────
function GameOverPanel({ scores, winner, onNewGame, panelBg }: {
  scores: number[]; winner: Player | null; onNewGame: () => void; panelBg: string;
}) {
  const sorted = ([0, 1, 2, 3] as Player[]).sort((a, b) => scores[a] - scores[b]);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: panelBg, border: '2px solid #c9a84c', borderRadius: 16, padding: '40px 56px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>♥</div>
        <h1 style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: 32, margin: '0 0 6px' }}>
          {winner === 0 ? 'You Win!' : 'Game Over'}
        </h1>
        <p style={{ color: '#a8c4ad', marginBottom: 24, fontSize: 13 }}>
          {winner === 0 ? 'Lowest score wins — well played!' : `${PLAYER_NAMES[winner ?? 0]} wins with the lowest score.`}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 28 }}>
          {sorted.map((p, rank) => (
            <div key={p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: rank === 0 ? 'rgba(201,168,76,0.15)' : 'rgba(0,0,0,0.15)', borderRadius: 6, border: rank === 0 ? '1px solid rgba(201,168,76,0.4)' : '1px solid transparent' }}>
              <span style={{ color: rank === 0 ? '#c9a84c' : '#f5efe0' }}>#{rank + 1} {PLAYER_NAMES[p]}</span>
              <span style={{ color: '#f5efe0', fontWeight: 700 }}>{scores[p]} pts</span>
            </div>
          ))}
        </div>

        <button onClick={onNewGame} style={{ padding: '12px 36px', background: '#c9a84c', color: '#1a1a1a', border: 'none', borderRadius: 8, fontFamily: 'Cinzel, serif', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          New Game
        </button>
      </div>
    </div>
  );
}

// ─── Main Hearts game ─────────────────────────────────────────────────────────
export function HeartsGame({ onBack }: { onBack: () => void }) {
  const { state, takenCards, submitPass, playCard, nextRound, newGame } = useHearts();
  const { settings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showQuit, setShowQuit] = useState(false);
  const table = TABLE_COLORS[settings.tableColor];
  const panelBg = table.panel;
  const { from: backFrom, to: backTo } = CARD_BACKS[settings.cardBack];

  const { phase, hands, passDirection, currentTrick, ledSuit, currentPlayer,
    heartsBroken, trickComplete, lastTrickWinner, scores, roundScores, winner, roundNumber } = state;

  const userHand = hands[0];
  const isFirstTrick = hands[0].length + hands[1].length + hands[2].length + hands[3].length > 48; // > 48 cards left = first trick
  const validCards = phase === 'playing' && currentPlayer === 0 && !trickComplete
    ? getValidCards(userHand, ledSuit, heartsBroken, isFirstTrick, currentTrick.length === 0)
    : [];
  const validIds = new Set(validCards.map(c => c.id));

  const trickCardFor = (p: Player) => currentTrick.find(t => t.player === p)?.card;

  // 10s auto-play timer
  const [countdown, setCountdown] = useState<number | null>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUserTurn = phase === 'playing' && currentPlayer === 0 && !trickComplete;

  useEffect(() => {
    if (!isUserTurn) { setCountdown(null); if (autoRef.current) clearInterval(autoRef.current); return; }
    setCountdown(10);
    autoRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(autoRef.current!);
          const valid = getValidCards(hands[0], ledSuit, heartsBroken, isFirstTrick, currentTrick.length === 0);
          const lowest = valid.reduce((best, c) => c.rank < best.rank ? c : best);
          playCard(lowest);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [isUserTurn, currentPlayer]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: '100vh', background: table.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '16px', boxSizing: 'border-box', fontFamily: 'DM Sans, sans-serif',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 700, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setShowQuit(true)} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 6, color: '#c9a84c', padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}>← Back</button>
          <h1 style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: 22, margin: 0, fontWeight: 700 }}>♥ Hearts</h1>
          <span style={{ fontSize: 11, color: '#a8c4ad', marginLeft: 4 }}>Round {roundNumber} · {PASS_LABELS[passDirection]}</span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {([0, 1, 2, 3] as Player[]).map(p => (
            <div key={p} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: p === 0 ? '#c9a84c' : '#a8c4ad', letterSpacing: '0.06em' }}>{PLAYER_NAMES[p]}</div>
              <div style={{ fontSize: 18, color: p === 0 ? '#c9a84c' : '#f5efe0', fontWeight: 700 }}>{scores[p]}</div>
            </div>
          ))}
          <button onClick={newGame} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 6, color: '#c9a84c', padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}>New</button>
          <button onClick={() => setShowHowTo(true)} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 6, color: '#c9a84c', padding: '5px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }} title="How to Play">?</button>
          <SettingsButton onClick={() => setShowSettings(true)} />
        </div>
      </div>

      {/* Table */}
      <div style={{ width: '100%', maxWidth: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>

        {/* North */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <PlayerInfo player={2} score={scores[2]} roundScore={takenCards[2].reduce((s, c) => s + cardPoints(c), 0)} isActive={currentPlayer === 2} />
          {hands[2].length > 0 && <AIHand count={hands[2].length} horizontal backFrom={backFrom} backTo={backTo} />}
        </div>

        {/* Middle row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <PlayerInfo player={1} score={scores[1]} roundScore={takenCards[1].reduce((s, c) => s + cardPoints(c), 0)} isActive={currentPlayer === 1} />
            {hands[1].length > 0 && <AIHand count={hands[1].length} backFrom={backFrom} backTo={backTo} />}
          </div>

          {/* Trick area */}
          <div style={{ flex: 1, maxWidth: 320, background: 'rgba(0,0,0,0.15)', borderRadius: 12, border: '1px solid rgba(201,168,76,0.15)', padding: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 10, fontSize: 11, letterSpacing: '0.08em', display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ color: heartsBroken ? '#e57373' : '#a8c4ad' }}>
                {heartsBroken ? '♥ HEARTS BROKEN' : phase === 'playing' ? 'IN PLAY' : ''}
              </span>
              <span style={{ color: '#ce93d8', fontSize: 10 }} title="Queen of Spades = 13 points">Q♠ = 13pts</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}><TrickSlot card={trickCardFor(2)} label="North" isWinner={trickComplete && lastTrickWinner === 2} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}><TrickSlot card={trickCardFor(3)} label="East" isWinner={trickComplete && lastTrickWinner === 3} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}><TrickSlot card={trickCardFor(1)} label="West" isWinner={trickComplete && lastTrickWinner === 1} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}><TrickSlot card={trickCardFor(0)} label="You" isWinner={trickComplete && lastTrickWinner === 0} /></div>
            </div>
            {/* Round point tally */}
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-around', fontSize: 11, color: '#a8c4ad' }}>
              {([0, 1, 2, 3] as Player[]).map(p => {
                const hearts = takenCards[p].filter(c => c.suit === 'hearts').length;
                const hasQ = takenCards[p].some(c => c.suit === 'spades' && c.rank === 12);
                const pts = takenCards[p].reduce((s, c) => s + cardPoints(c), 0);
                return (
                  <span key={p} style={{ color: pts > 0 ? '#e57373' : '#a8c4ad' }}>
                    {PLAYER_NAMES[p]}: {hearts > 0 && <>{hearts}♥</>}{hasQ && <span style={{ color: '#ce93d8' }}>{hearts > 0 ? '+' : ''}Q♠</span>}{pts === 0 && '0'}
                  </span>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <PlayerInfo player={3} score={scores[3]} roundScore={takenCards[3].reduce((s, c) => s + cardPoints(c), 0)} isActive={currentPlayer === 3} />
            {hands[3].length > 0 && <AIHand count={hands[3].length} backFrom={backFrom} backTo={backTo} />}
          </div>
        </div>

        {/* User hand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <PlayerInfo player={0} score={scores[0]} roundScore={takenCards[0].reduce((s, c) => s + cardPoints(c), 0)} isActive={currentPlayer === 0} />
          <div style={{ display: 'flex', padding: '0 8px 8px', overflowX: 'auto', maxWidth: '100%' }}>
            {userHand.map((card, i) => {
              const isValid = validIds.has(card.id);
              return (
                <div key={card.id} style={{ marginLeft: i === 0 ? 0 : userHand.length > 10 ? -18 : -8 }}>
                  <HeartsCardFace
                    card={card}
                    dimmed={phase === 'playing' && currentPlayer === 0 && !trickComplete && !isValid}
                    onClick={isValid ? () => playCard(card) : undefined}
                  />
                </div>
              );
            })}
          </div>

          {isUserTurn && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <p style={{ color: '#c9a84c', fontSize: 12, margin: 0 }}>Click a card to play</p>
              {countdown !== null && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${countdown <= 3 ? '#e57373' : 'rgba(201,168,76,0.6)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: countdown <= 3 ? '#e57373' : '#c9a84c' }}>
                  {countdown}
                </div>
              )}
            </div>
          )}
          {phase === 'playing' && currentPlayer !== 0 && !trickComplete && (
            <p style={{ color: '#a8c4ad', fontSize: 12, margin: 0 }}>Waiting for {PLAYER_NAMES[currentPlayer]}…</p>
          )}
        </div>
      </div>

      {/* Overlays */}
      {phase === 'passing' && (
        <PassingPanel hand={userHand} direction={passDirection} onPass={submitPass} panelBg={panelBg} />
      )}
      {phase === 'round_end' && (
        <RoundEndPanel scores={scores} roundScores={roundScores} onContinue={nextRound} panelBg={panelBg} />
      )}
      {phase === 'game_over' && (
        <GameOverPanel scores={scores} winner={winner} onNewGame={newGame} panelBg={panelBg} />
      )}
      {showQuit && <QuitConfirmModal onConfirm={onBack} onCancel={() => setShowQuit(false)} panelBg={panelBg} />}
      {showHowTo && <HowToPlayModal game="hearts" onClose={() => setShowHowTo(false)} panelBg={panelBg} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
