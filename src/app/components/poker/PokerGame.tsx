import { useState, createContext, useContext } from 'react';
import { usePoker } from '../../hooks/usePoker';
import { useSettings, TABLE_COLORS, CARD_BACKS, CARD_SIZES } from '../../contexts/SettingsContext';
import { SettingsButton, SettingsPanel } from '../SettingsPanel';
import { HowToPlayModal } from '../HowToPlayModal';
import { QuitConfirmModal } from '../QuitConfirmModal';
import {
  SUIT_SYMBOLS, rankLabel, isRed, evaluateHand,
  type Card, type PokerPlayer, type PokerState,
} from './pokerEngine';

const CardDim = createContext({ w: 72, h: 101 });

// ─── Card face ────────────────────────────────────────────────────────────────
function PokerCardFace({ card, small }: { card: Card; small?: boolean }) {
  const dim = useContext(CardDim);
  const w = small ? 40 : dim.w;
  const h = small ? 56 : dim.h;
  const red = isRed(card);
  const color = red ? '#c0392b' : '#1a1a2e';
  const sym = SUIT_SYMBOLS[card.suit];
  const lbl = rankLabel(card.rank);
  const cornerFont = small ? 9 : 12;
  const centerFont = small ? 16 : 26;

  return (
    <div style={{
      width: w, height: h, background: '#fff', borderRadius: 5,
      border: '1px solid #d4cfc8', boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
      position: 'relative', color, fontFamily: 'Georgia, "Times New Roman", serif',
      userSelect: 'none', flexShrink: 0,
    }}>
      <div style={{ position: 'absolute', top: 3, left: 5, lineHeight: 1 }}>
        <div style={{ fontSize: cornerFont, fontWeight: 700 }}>{lbl}</div>
        <div style={{ fontSize: cornerFont - 2 }}>{sym}</div>
      </div>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: centerFont,
      }}>{sym}</div>
      <div style={{
        position: 'absolute', bottom: 3, right: 5, lineHeight: 1,
        transform: 'rotate(180deg)', textAlign: 'center',
      }}>
        <div style={{ fontSize: cornerFont, fontWeight: 700 }}>{lbl}</div>
        <div style={{ fontSize: cornerFont - 2 }}>{sym}</div>
      </div>
    </div>
  );
}

function PokerCardBack({ small, from, to }: { small?: boolean; from: string; to: string }) {
  const dim = useContext(CardDim);
  const w = small ? 40 : dim.w;
  const h = small ? 56 : dim.h;
  return (
    <div style={{
      width: w, height: h, borderRadius: 5,
      border: '1px solid rgba(201,168,76,0.3)',
      boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
      background: `linear-gradient(135deg, ${from}, ${to})`,
      backgroundImage: `linear-gradient(135deg, ${from}, ${to}), repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.04) 3px, rgba(255,255,255,0.04) 6px)`,
      backgroundBlendMode: 'overlay',
      flexShrink: 0,
    }} />
  );
}

function EmptySlot() {
  const dim = useContext(CardDim);
  return (
    <div style={{
      width: dim.w, height: dim.h, borderRadius: 5,
      border: '1px dashed rgba(201,168,76,0.25)', flexShrink: 0,
    }} />
  );
}

// ─── Position chip (D / SB / BB) ───────────────────────────────────────────────
function PositionChip({ label }: { label: string }) {
  const colors: Record<string, string> = {
    D: '#c9a84c', SB: '#6fa8dc', BB: '#e06c75',
  };
  return (
    <div style={{
      width: 22, height: 22, borderRadius: '50%',
      background: colors[label] ?? '#c9a84c', color: '#1a1a1a',
      fontSize: 10, fontWeight: 700, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
      boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
    }}>{label}</div>
  );
}

function StatusBadge({ status }: { status: PokerPlayer['status'] }) {
  if (status === 'active') return null;
  const map = {
    folded: { text: 'Folded', bg: 'rgba(120,120,120,0.25)', col: '#bbb' },
    'all-in': { text: 'All-In', bg: 'rgba(224,108,117,0.25)', col: '#e06c75' },
  } as const;
  const s = map[status];
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 10,
      background: s.bg, color: s.col, fontWeight: 600,
      fontFamily: 'DM Sans, sans-serif',
    }}>{s.text}</span>
  );
}

function posLabel(state: PokerState, idx: number): string | null {
  if (state.dealerIdx === idx) return 'D';
  if (state.smallBlindIdx === idx) return 'SB';
  if (state.bigBlindIdx === idx) return 'BB';
  return null;
}

// ─── AI player display ──────────────────────────────────────────────────────
function AIPlayer({ player, idx, state, backFrom, backTo }: {
  player: PokerPlayer; idx: number; state: PokerState; backFrom: string; backTo: string;
}) {
  const active = state.currentPlayerIdx === idx && player.status === 'active';
  const reveal = state.showdown && player.status !== 'folded';
  const pl = posLabel(state, idx);
  const isWinner = state.lastWinners.some(w => w.playerIdx === idx);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      padding: '8px 12px', borderRadius: 10, minWidth: 120,
      background: active ? 'rgba(201,168,76,0.15)' : isWinner ? 'rgba(76,175,80,0.15)' : 'rgba(0,0,0,0.18)',
      border: active ? '1px solid rgba(201,168,76,0.5)' : isWinner ? '1px solid rgba(76,175,80,0.5)' : '1px solid rgba(201,168,76,0.12)',
      transition: 'all 0.2s', opacity: player.status === 'folded' ? 0.55 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#c9a84c' : '#f5efe0', fontFamily: 'DM Sans, sans-serif' }}>
          {player.name}
        </span>
        {pl && <PositionChip label={pl} />}
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        {player.holeCards.length === 0 ? (
          <>
            <PokerCardBack small from={backFrom} to={backTo} />
            <PokerCardBack small from={backFrom} to={backTo} />
          </>
        ) : reveal ? (
          player.holeCards.map(c => <PokerCardFace key={c.id} card={c} small />)
        ) : (
          <>
            <PokerCardBack small from={backFrom} to={backTo} />
            <PokerCardBack small from={backFrom} to={backTo} />
          </>
        )}
      </div>

      <div style={{ fontSize: 12, color: '#c9a84c', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
        ${player.chips}
      </div>

      <div style={{ minHeight: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <StatusBadge status={player.status} />
        {player.status === 'active' && player.lastAction && (
          <span style={{ fontSize: 10, color: '#a8c4ad', fontFamily: 'DM Sans, sans-serif' }}>
            {player.lastAction}
          </span>
        )}
      </div>

      {player.bet > 0 && (
        <div style={{
          fontSize: 11, color: '#1a1a1a', background: '#c9a84c',
          padding: '1px 8px', borderRadius: 10, fontWeight: 700,
          fontFamily: 'DM Sans, sans-serif',
        }}>
          ${player.bet}
        </div>
      )}

      {reveal && (
        <div style={{ fontSize: 10, color: '#c9a84c', fontFamily: 'DM Sans, sans-serif', fontStyle: 'italic' }}>
          {evaluateHand([...player.holeCards, ...state.communityCards]).name}
        </div>
      )}
    </div>
  );
}

// ─── Community cards ────────────────────────────────────────────────────────
function CommunityArea({ state }: { state: PokerState }) {
  const labels = ['', '', '', '', ''];
  if (state.communityCards.length >= 3) { labels[0] = 'FLOP'; }
  if (state.communityCards.length >= 4) labels[3] = 'TURN';
  if (state.communityCards.length >= 5) labels[4] = 'RIVER';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      background: 'rgba(0,0,0,0.2)', borderRadius: 100, padding: '24px 40px',
      border: '1px solid rgba(201,168,76,0.15)',
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 9, color: 'rgba(201,168,76,0.7)', letterSpacing: '0.08em', minHeight: 12, fontFamily: 'DM Sans, sans-serif' }}>
              {labels[i]}
            </div>
            {state.communityCards[i]
              ? <PokerCardFace card={state.communityCards[i]} />
              : <EmptySlot />}
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#a8c4ad', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif' }}>
          Pot
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#c9a84c', fontFamily: 'Cinzel, serif', lineHeight: 1.1 }}>
          ${state.pot}
        </div>
        {state.currentBet > 0 && (
          <div style={{ fontSize: 11, color: '#a8c4ad', fontFamily: 'DM Sans, sans-serif' }}>
            Current bet: ${state.currentBet}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Action buttons ─────────────────────────────────────────────────────────
function ActionBar({ state, onAction }: {
  state: PokerState;
  onAction: (a: 'fold' | 'check' | 'call' | 'raise' | 'all-in', amt?: number) => void;
}) {
  const me = state.players[0];
  const toCall = state.currentBet - me.bet;
  const canCheck = toCall <= 0;
  const minRaiseTotal = Math.max(state.currentBet + state.minRaise, state.minRaise);
  const maxRaiseTotal = me.bet + me.chips; // all-in total
  const callableAllIn = toCall >= me.chips; // can't even fully call

  const [raiseVal, setRaiseVal] = useState(Math.min(minRaiseTotal, maxRaiseTotal));
  const [showRaise, setShowRaise] = useState(false);

  const canRaise = maxRaiseTotal > state.currentBet && me.chips > toCall;

  const clamped = Math.max(minRaiseTotal, Math.min(maxRaiseTotal, raiseVal));

  const btn = (label: string, onClick: () => void, variant: 'gold' | 'red' | 'ghost') => (
    <button
      onClick={onClick}
      style={{
        padding: '12px 22px', borderRadius: 8,
        border: variant === 'ghost' ? '1px solid rgba(201,168,76,0.5)' : 'none',
        background: variant === 'gold' ? '#c9a84c' : variant === 'red' ? 'rgba(180,60,60,0.3)' : 'transparent',
        color: variant === 'gold' ? '#1a1a1a' : variant === 'red' ? '#ef9a9a' : '#c9a84c',
        fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 600,
        cursor: 'pointer', letterSpacing: '0.03em', minWidth: 90,
        ...(variant === 'red' ? { border: '1px solid rgba(220,80,80,0.4)' } : {}),
      }}
    >{label}</button>
  );

  if (showRaise && canRaise) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setRaiseVal(v => Math.max(minRaiseTotal, v - state.minRaise))} style={stepBtn}>−</button>
          <input
            type="range"
            min={minRaiseTotal}
            max={maxRaiseTotal}
            step={5}
            value={clamped}
            onChange={e => setRaiseVal(Number(e.target.value))}
            style={{ width: 200, accentColor: '#c9a84c' }}
          />
          <button onClick={() => setRaiseVal(v => Math.min(maxRaiseTotal, v + state.minRaise))} style={stepBtn}>+</button>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#c9a84c', minWidth: 80, textAlign: 'center', fontFamily: 'Cinzel, serif' }}>
            ${clamped}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {btn('Cancel', () => setShowRaise(false), 'ghost')}
          {btn(clamped >= maxRaiseTotal ? 'All-In' : `Raise to $${clamped}`,
            () => { setShowRaise(false); onAction(clamped >= maxRaiseTotal ? 'all-in' : 'raise', clamped); }, 'gold')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
      {btn('Fold', () => onAction('fold'), 'red')}
      {canCheck
        ? btn('Check', () => onAction('check'), 'ghost')
        : btn(callableAllIn ? `Call $${me.chips} (All-In)` : `Call $${toCall}`,
            () => onAction(callableAllIn ? 'all-in' : 'call'), 'ghost')}
      {canRaise && btn('Raise', () => { setRaiseVal(Math.min(minRaiseTotal, maxRaiseTotal)); setShowRaise(true); }, 'gold')}
      {me.chips > 0 && btn('All-In', () => onAction('all-in'), 'gold')}
    </div>
  );
}

const stepBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(201,168,76,0.4)',
  background: 'rgba(201,168,76,0.1)', color: '#c9a84c', fontSize: 18, cursor: 'pointer',
};

// ─── Showdown overlay ───────────────────────────────────────────────────────
function ShowdownOverlay({ state }: { state: PokerState }) {
  return (
    <div style={{
      position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 40, background: 'rgba(20,30,20,0.92)',
      border: '2px solid #c9a84c', borderRadius: 14, padding: '20px 36px',
      textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
      fontFamily: 'DM Sans, sans-serif', minWidth: 280,
    }}>
      <div style={{ fontSize: 32, marginBottom: 6 }}>🏆</div>
      {state.lastWinners.map((w, i) => (
        <div key={i} style={{ marginBottom: 4 }}>
          <span style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: 18, fontWeight: 700 }}>
            {state.players[w.playerIdx].name}
          </span>
          <span style={{ color: '#f5efe0', fontSize: 15 }}> wins ${w.amount}</span>
          <div style={{ color: '#a8c4ad', fontSize: 12 }}>{w.handName}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Game over modal ────────────────────────────────────────────────────────
function GameOverModal({ state, onNewGame, panelBg }: {
  state: PokerState; onNewGame: () => void; panelBg: string;
}) {
  const me = state.players[0];
  const humanWon = me.chips > 0;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: panelBg, border: '2px solid #c9a84c', borderRadius: 16,
        padding: '48px 64px', textAlign: 'center', fontFamily: 'DM Sans, sans-serif',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>{humanWon ? '👑' : '♠'}</div>
        <h1 style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: 34, margin: '0 0 8px' }}>
          {humanWon ? 'You Win!' : 'Busted'}
        </h1>
        <p style={{ color: '#a8c4ad', marginBottom: 28, fontSize: 14 }}>
          {humanWon ? 'You cleaned out the table.' : 'You ran out of chips.'}
        </p>
        <button onClick={onNewGame} style={{
          padding: '12px 32px', borderRadius: 8, border: 'none', background: '#c9a84c',
          color: '#1a1a1a', fontFamily: 'Cinzel, serif', fontSize: 15, fontWeight: 600,
          cursor: 'pointer', letterSpacing: '0.04em',
        }}>Play Again</button>
      </div>
    </div>
  );
}

// ─── Main game ──────────────────────────────────────────────────────────────
export function PokerGame({ onBack }: { onBack: () => void }) {
  const { state, playerAction, startNewHand, newGame } = usePoker();
  const { settings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showQuit, setShowQuit] = useState(false);

  const table = TABLE_COLORS[settings.tableColor];
  const { from: backFrom, to: backTo } = CARD_BACKS[settings.cardBack];
  const cardDim = CARD_SIZES[settings.cardSize];

  const me = state.players[0];
  const aiPlayers = state.players.slice(1);
  const isMyTurn = state.currentPlayerIdx === 0 && me.status === 'active'
    && (state.phase === 'pre-flop' || state.phase === 'flop' || state.phase === 'turn' || state.phase === 'river');

  // Game over: only the human left with chips, or human has zero chips.
  const aliveWithChips = state.players.filter(p => p.chips > 0);
  const gameOver = state.phase === 'waiting' && (me.chips === 0 || aliveWithChips.length === 1);

  const myPos = posLabel(state, 0);
  const showBestHand = (state.phase === 'river' || state.showdown) && me.status !== 'folded' && state.communityCards.length >= 3;
  const bestHand = showBestHand ? evaluateHand([...me.holeCards, ...state.communityCards]) : null;

  return (
    <CardDim.Provider value={cardDim}>
    <div style={{
      minHeight: '100vh', background: table.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: 16, boxSizing: 'border-box', fontFamily: 'DM Sans, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', maxWidth: 860, marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setShowQuit(true)} style={hdrBtn}>← Back</button>
          <h1 style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: 22, margin: 0, fontWeight: 700 }}>
            ♠ Poker
          </h1>
          {state.handNumber > 0 && (
            <span style={{ color: '#a8c4ad', fontSize: 12 }}>Hand #{state.handNumber}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: '#a8c4ad', fontSize: 11 }}>Blinds 25/50</span>
          <button onClick={newGame} style={hdrBtn}>New Game</button>
          <button onClick={() => setShowHowTo(true)} style={{ ...hdrBtn, fontWeight: 700 }} title="How to Play">?</button>
          <SettingsButton onClick={() => setShowSettings(true)} />
        </div>
      </div>

      {/* Table */}
      <div style={{ width: '100%', maxWidth: 860, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        {/* AI players arc */}
        <div style={{ display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {aiPlayers.map((p, i) => (
            <AIPlayer key={p.id} player={p} idx={i + 1} state={state} backFrom={backFrom} backTo={backTo} />
          ))}
        </div>

        {/* Community + pot */}
        <CommunityArea state={state} />

        {/* Message */}
        <div style={{ color: '#a8c4ad', fontSize: 12, fontStyle: 'italic', minHeight: 16, textAlign: 'center' }}>
          {state.message}
        </div>

        {/* Human area */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          padding: '12px 20px', borderRadius: 12,
          background: isMyTurn ? 'rgba(201,168,76,0.12)' : 'rgba(0,0,0,0.18)',
          border: isMyTurn ? '1px solid rgba(201,168,76,0.4)' : '1px solid rgba(201,168,76,0.12)',
          opacity: me.status === 'folded' ? 0.55 : 1, minWidth: 320,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#c9a84c', fontFamily: 'DM Sans, sans-serif' }}>
              {me.name}
            </span>
            {myPos && <PositionChip label={myPos} />}
            <span style={{ fontSize: 13, color: '#c9a84c', fontWeight: 600 }}>${me.chips}</span>
            <StatusBadge status={me.status} />
            {me.bet > 0 && (
              <span style={{ fontSize: 11, color: '#1a1a1a', background: '#c9a84c', padding: '1px 8px', borderRadius: 10, fontWeight: 700 }}>
                Bet ${me.bet}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {me.holeCards.length > 0
              ? me.holeCards.map(c => <PokerCardFace key={c.id} card={c} />)
              : (<><EmptySlot /><EmptySlot /></>)}
          </div>

          {bestHand && (
            <div style={{ fontSize: 12, color: '#c9a84c', fontFamily: 'Cinzel, serif', fontWeight: 600 }}>
              {bestHand.name}
            </div>
          )}

          {/* Actions */}
          {isMyTurn && (
            <div style={{ marginTop: 4, width: '100%' }}>
              <ActionBar state={state} onAction={playerAction} />
            </div>
          )}
        </div>

        {/* Deal button */}
        {state.phase === 'waiting' && !gameOver && (
          <button onClick={startNewHand} style={{
            padding: '14px 48px', borderRadius: 10, border: 'none', background: '#c9a84c',
            color: '#1a1a1a', fontFamily: 'Cinzel, serif', fontSize: 17, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '0.05em',
          }}>Deal</button>
        )}
      </div>

      {/* Overlays */}
      {state.showdown && <ShowdownOverlay state={state} />}
      {gameOver && <GameOverModal state={state} onNewGame={newGame} panelBg={table.panel} />}
      {showQuit && <QuitConfirmModal onConfirm={onBack} onCancel={() => setShowQuit(false)} panelBg={table.panel} />}
      {showHowTo && <HowToPlayModal game="poker" onClose={() => setShowHowTo(false)} panelBg={table.panel} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
    </CardDim.Provider>
  );
}

const hdrBtn: React.CSSProperties = {
  background: 'transparent', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 6,
  color: '#c9a84c', padding: '5px 12px', cursor: 'pointer', fontSize: 12,
};
