import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useSpades } from '../../hooks/useSpades';
import { useSettings, TABLE_COLORS, CARD_BACKS, CARD_SIZES } from '../../contexts/SettingsContext';
import { SettingsButton, SettingsPanel } from '../SettingsPanel';
import { HowToPlayModal } from '../HowToPlayModal';
import { QuitConfirmModal } from '../QuitConfirmModal';
import {
  SUIT_SYMBOLS, rankLabel, isRed, getValidCards, getTeam,
  type Card, type Player, type Suit,
} from './spadesEngine';

const CardDim = createContext({ w: 66, h: 94 });

// Card dimensions are provided via CardDim context (set from settings in SpadesGame)

// ─── Card face ────────────────────────────────────────────────────────────────
function SpadesCardFace({ card, dimmed, selected, onClick }: {
  card: Card;
  dimmed?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const { w, h } = useContext(CardDim);
  const red = isRed(card);
  const color = red ? '#c0392b' : '#1a1a2e';
  const sym = SUIT_SYMBOLS[card.suit];
  const lbl = rankLabel(card.rank);

  return (
    <div
      onClick={onClick}
      style={{
        width: w,
        height: h,
        background: '#fff',
        borderRadius: 5,
        border: selected ? '2px solid #c9a84c' : '1px solid #d4cfc8',
        boxShadow: selected
          ? '0 0 0 3px rgba(201,168,76,0.4), 0 4px 12px rgba(0,0,0,0.3)'
          : '0 2px 6px rgba(0,0,0,0.25)',
        position: 'relative',
        opacity: dimmed ? 0.4 : 1,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.1s, box-shadow 0.1s, opacity 0.15s',
        transform: selected ? 'translateY(-8px)' : 'none',
        color,
        fontFamily: 'Georgia, "Times New Roman", serif',
        userSelect: 'none',
        flexShrink: 0,
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.transform = selected ? 'translateY(-10px)' : 'translateY(-4px)'; }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLElement).style.transform = selected ? 'translateY(-8px)' : 'none'; }}
    >
      <div style={{ position: 'absolute', top: 3, left: 5, lineHeight: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{lbl}</div>
        <div style={{ fontSize: 10 }}>{sym}</div>
      </div>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 26,
      }}>
        {sym}
      </div>
      <div style={{
        position: 'absolute', bottom: 3, right: 5, lineHeight: 1,
        transform: 'rotate(180deg)', textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{lbl}</div>
        <div style={{ fontSize: 10 }}>{sym}</div>
      </div>
    </div>
  );
}

function SpadesCardBack({ small, backFrom, backTo }: { small?: boolean; backFrom?: string; backTo?: string }) {
  const dim = useContext(CardDim);
  const w = small ? 36 : dim.w;
  const h = small ? 50 : dim.h;
  const from = backFrom ?? '#1a237e';
  const to = backTo ?? '#283593';
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

// ─── Trick card slot ──────────────────────────────────────────────────────────
function TrickSlot({ card, label, isWinner }: { card?: Card; label: string; isWinner?: boolean }) {
  const dim = useContext(CardDim);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ fontSize: 10, color: 'rgba(201,168,76,0.7)', letterSpacing: '0.06em', fontFamily: 'DM Sans, sans-serif' }}>
        {label}
      </div>
      {card ? (
        <div style={{ outline: isWinner ? '2px solid #c9a84c' : 'none', borderRadius: 6, outlineOffset: 2 }}>
          <SpadesCardFace card={card} />
        </div>
      ) : (
        <div style={{
          width: dim.w, height: dim.h, borderRadius: 5,
          border: '1px dashed rgba(201,168,76,0.2)',
        }} />
      )}
    </div>
  );
}

// ─── AI hand (backs) ──────────────────────────────────────────────────────────
function AIHand({ count, horizontal, backFrom, backTo }: { count: number; horizontal?: boolean; backFrom?: string; backTo?: string }) {
  const cards = Array.from({ length: count });
  const overlap = horizontal ? -20 : -30;
  return (
    <div style={{
      display: 'flex',
      flexDirection: horizontal ? 'row' : 'column',
      [horizontal ? 'marginLeft' : 'marginTop']: `${overlap * (count - 1)}px`,
      position: 'relative',
    }}>
      {cards.map((_, i) => (
        <div key={i} style={{
          [horizontal ? 'marginLeft' : 'marginTop']: i === 0 ? 0 : overlap,
          position: 'relative', zIndex: i,
        }}>
          <SpadesCardBack small backFrom={backFrom} backTo={backTo} />
        </div>
      ))}
    </div>
  );
}

// ─── Player label ─────────────────────────────────────────────────────────────
const PLAYER_NAMES = ['You', 'West', 'North', 'East'];

function PlayerInfo({ player, bid, tricks, isActive }: {
  player: Player; bid: number | null; tricks: number; isActive: boolean;
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
        {bid !== null ? `Bid: ${bid === 0 ? 'Nil' : bid}` : '—'} · Won: {tricks}
      </div>
    </div>
  );
}

// ─── Mini hand strip ──────────────────────────────────────────────────────────
function MiniHandStrip({ cards, label, highlight }: { cards: Card[]; label: string; highlight?: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: 10, color: highlight ? '#c9a84c' : '#a8c4ad',
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6,
        fontFamily: 'DM Sans, sans-serif', fontWeight: highlight ? 600 : 400,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {cards.map((card, i) => {
          const red = isRed(card);
          const sym = SUIT_SYMBOLS[card.suit];
          const lbl = rankLabel(card.rank);
          return (
            <div key={card.id} style={{
              width: 34, height: 48, borderRadius: 4,
              background: '#fff', border: '1px solid #ddd',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: red ? '#c0392b' : '#1a1a2e',
              fontFamily: 'Georgia, serif', fontSize: 10, lineHeight: 1.2,
              flexShrink: 0,
            }}>
              <div style={{ fontWeight: 700 }}>{lbl}</div>
              <div>{sym}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Bidding panel ────────────────────────────────────────────────────────────
function BiddingPanel({ bids, currentPlayer, hands, onBid }: {
  bids: (number | null)[];
  currentPlayer: Player;
  hands: Card[][];
  onBid: (n: number, nil?: boolean) => void;
}) {
  const [selected, setSelected] = useState(3);
  const { settings } = useSettings();
  const panelBg = TABLE_COLORS[settings.tableColor].panel;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, overflowY: 'auto',
    }}>
      <div style={{
        background: panelBg,
        border: '1px solid rgba(201,168,76,0.5)',
        borderRadius: 16, padding: '28px 32px',
        width: '100%', maxWidth: 680,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', margin: '0 0 20px', fontSize: 20, textAlign: 'center' }}>
          Bidding Round — All Hands
        </h2>

        {/* User's hand */}
        <div style={{ marginBottom: 20, padding: 16, background: 'rgba(0,0,0,0.15)', borderRadius: 10 }}>
          <MiniHandStrip cards={hands[0]} label="Your hand" highlight />
        </div>

        {/* Other bids */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 20 }}>
          {([1, 2, 3] as Player[]).map(p => (
            <div key={p} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#a8c4ad', marginBottom: 4 }}>{PLAYER_NAMES[p]}</div>
              <div style={{ fontSize: 20, color: bids[p] !== null ? '#c9a84c' : 'rgba(201,168,76,0.3)', fontWeight: 600 }}>
                {bids[p] !== null ? (bids[p] === 0 ? 'Nil' : bids[p]) : (currentPlayer === p ? '…' : '—')}
              </div>
            </div>
          ))}
        </div>

        {currentPlayer === 0 && (
          <>
            {/* Bid selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
              <button
                onClick={() => setSelected(s => Math.max(1, s - 1))}
                style={btnStyle}
              >−</button>
              <div style={{ fontSize: 42, fontWeight: 700, color: '#f5efe0', minWidth: 56, textAlign: 'center' }}>
                {selected}
              </div>
              <button
                onClick={() => setSelected(s => Math.min(13, s + 1))}
                style={btnStyle}
              >+</button>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => onBid(0, true)}
                style={{ ...actionBtnStyle, flex: 1, background: 'transparent', border: '1px solid rgba(201,168,76,0.5)', color: '#c9a84c' }}
              >
                Bid Nil
              </button>
              <button
                onClick={() => onBid(selected)}
                style={{ ...actionBtnStyle, flex: 2 }}
              >
                Bid {selected}
              </button>
            </div>
          </>
        )}

        {currentPlayer !== 0 && (
          <div style={{ textAlign: 'center', color: '#a8c4ad', fontSize: 14 }}>
            Waiting for {PLAYER_NAMES[currentPlayer]}…
          </div>
        )}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 8, border: '1px solid rgba(201,168,76,0.4)',
  background: 'rgba(201,168,76,0.1)', color: '#c9a84c', fontSize: 20, cursor: 'pointer',
};
const actionBtnStyle: React.CSSProperties = {
  padding: '12px 24px', borderRadius: 8, border: 'none',
  background: '#c9a84c', color: '#1a1a1a', fontFamily: 'Cinzel, serif',
  fontSize: 15, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em',
};

// ─── Round end panel ──────────────────────────────────────────────────────────
function RoundEndPanel({ state, onContinue }: {
  state: ReturnType<typeof useSpades>['state'];
  onContinue: () => void;
}) {
  const { settings } = useSettings();
  const panelBg = TABLE_COLORS[settings.tableColor].panel;
  const r = state.roundResult!;
  const newScores: [number, number] = [
    state.teamScores[0] + r.teamDelta[0],
    state.teamScores[1] + r.teamDelta[1],
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: panelBg,
        border: '1px solid rgba(201,168,76,0.5)',
        borderRadius: 16, padding: 36, minWidth: 380,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', margin: '0 0 24px', fontSize: 22, textAlign: 'center' }}>
          Round Over
        </h2>

        {(['You & North', 'West & East'] as const).map((name, team) => {
          const t = team as 0 | 1;
          const made = r.teamTricks[t] >= r.teamBids[t];
          return (
            <div key={team} style={{
              marginBottom: 16, padding: '12px 16px',
              background: 'rgba(0,0,0,0.2)', borderRadius: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#f5efe0', fontWeight: 600 }}>{name}</span>
                <span style={{ color: made ? '#4caf50' : '#e53935', fontWeight: 700 }}>
                  {r.teamDelta[t] >= 0 ? '+' : ''}{r.teamDelta[t]}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#a8c4ad' }}>
                Bid {r.teamBids[t]} · Won {r.teamTricks[t]} tricks
                {r.bagPenalty[t] > 0 && <span style={{ color: '#e53935' }}> · −{r.bagPenalty[t]} bag penalty</span>}
              </div>
            </div>
          );
        })}

        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '20px 0', color: '#f5efe0' }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#c9a84c' }}>{newScores[0]}</div>
            <div style={{ fontSize: 11, color: '#a8c4ad' }}>You & North</div>
          </div>
          <div style={{ color: '#a8c4ad', alignSelf: 'center', fontSize: 18 }}>vs</div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#f5efe0' }}>{newScores[1]}</div>
            <div style={{ fontSize: 11, color: '#a8c4ad' }}>West & East</div>
          </div>
        </div>

        <button onClick={onContinue} style={{ ...actionBtnStyle, width: '100%', textAlign: 'center' }}>
          Next Round
        </button>
      </div>
    </div>
  );
}

// ─── Game over panel ──────────────────────────────────────────────────────────
function GameOverPanel({ scores, winner, onNewGame }: {
  scores: [number, number]; winner: 0 | 1 | null; onNewGame: () => void;
}) {
  const { settings } = useSettings();
  const panelBg = TABLE_COLORS[settings.tableColor].panel;
  const userWon = winner === 0;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: panelBg,
        border: '2px solid #c9a84c', borderRadius: 16,
        padding: '48px 64px', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>♠</div>
        <h1 style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: 36, margin: '0 0 8px' }}>
          {userWon ? 'You Win!' : 'Game Over'}
        </h1>
        <p style={{ color: '#a8c4ad', marginBottom: 24 }}>
          {userWon ? 'You & North reached 500 points.' : 'West & East won this game.'}
        </p>
        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#c9a84c' }}>{scores[0]}</div>
            <div style={{ fontSize: 12, color: '#a8c4ad' }}>You & North</div>
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#f5efe0' }}>{scores[1]}</div>
            <div style={{ fontSize: 12, color: '#a8c4ad' }}>West & East</div>
          </div>
        </div>
        <button onClick={onNewGame} style={actionBtnStyle}>New Game</button>
      </div>
    </div>
  );
}

// ─── Main Spades game ─────────────────────────────────────────────────────────
export function SpadesGame({ onBack }: { onBack: () => void }) {
  const { state, placeBid, playCard, nextRound, newGame } = useSpades();
  const { settings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showQuit, setShowQuit] = useState(false);
  const table = TABLE_COLORS[settings.tableColor];
  const { from: backFrom, to: backTo } = CARD_BACKS[settings.cardBack];
  const cardDim = CARD_SIZES[settings.cardSize];
  const { phase, hands, bids, nilBids, trickCounts, currentTrick, ledSuit,
    currentPlayer, spadesBroken, teamScores, teamBags, roundResult, winner,
    trickComplete, lastTrickWinner } = state;

  const userHand = hands[0];
  const validCards = phase === 'playing' && currentPlayer === 0
    ? getValidCards(userHand, ledSuit, spadesBroken)
    : [];
  const validIds = new Set(validCards.map(c => c.id));

  const trickCardFor = (p: Player) => currentTrick.find(t => t.player === p)?.card;

  // 10-second auto-play timer when it's the user's turn
  const [countdown, setCountdown] = useState<number | null>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isUserTurn = phase === 'playing' && currentPlayer === 0;

  useEffect(() => {
    if (!isUserTurn) {
      setCountdown(null);
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      return;
    }

    setCountdown(10);
    autoPlayRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(autoPlayRef.current!);
          // Auto-play: highest card in hand if valid, else random valid card
          const valid = getValidCards(hands[0], ledSuit, spadesBroken);
          const highest = hands[0].reduce((best, c) => c.rank > best.rank ? c : best);
          const chosen = valid.some(c => c.id === highest.id)
            ? highest
            : valid[Math.floor(Math.random() * valid.length)];
          playCard(chosen);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [isUserTurn, currentPlayer]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <CardDim.Provider value={cardDim}>
    <div style={{
      minHeight: '100vh',
      background: table.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '16px', boxSizing: 'border-box', fontFamily: 'DM Sans, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', maxWidth: 700, marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setShowQuit(true)}
            style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 6, color: '#c9a84c', padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}
          >
            ← Back
          </button>
          <h1 style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: 22, margin: 0, fontWeight: 700 }}>
            ♠ Spades
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#a8c4ad', textTransform: 'uppercase', letterSpacing: '0.06em' }}>You & North</div>
            <div style={{ fontSize: 20, color: '#c9a84c', fontWeight: 700 }}>{teamScores[0]}</div>
          </div>
          <div style={{ color: '#a8c4ad', fontSize: 14 }}>vs</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#a8c4ad', textTransform: 'uppercase', letterSpacing: '0.06em' }}>West & East</div>
            <div style={{ fontSize: 20, color: '#f5efe0', fontWeight: 700 }}>{teamScores[1]}</div>
          </div>
          <button onClick={newGame} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 6, color: '#c9a84c', padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}>New</button>
          <button onClick={() => setShowHowTo(true)} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 6, color: '#c9a84c', padding: '5px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }} title="How to Play">?</button>
          <SettingsButton onClick={() => setShowSettings(true)} />
        </div>
      </div>

      {/* Table */}
      <div style={{ width: '100%', maxWidth: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>

        {/* North row */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <PlayerInfo player={2} bid={bids[2]} tricks={trickCounts[2]} isActive={currentPlayer === 2} />
          {hands[2].length > 0 && <AIHand count={hands[2].length} horizontal backFrom={backFrom} backTo={backTo} />}
        </div>

        {/* Middle row: West | Trick | East */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', justifyContent: 'center' }}>
          {/* West */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <PlayerInfo player={1} bid={bids[1]} tricks={trickCounts[1]} isActive={currentPlayer === 1} />
            {hands[1].length > 0 && <AIHand count={hands[1].length} backFrom={backFrom} backTo={backTo} />}
          </div>

          {/* Trick area */}
          <div style={{
            flex: 1, maxWidth: 320,
            background: 'rgba(0,0,0,0.15)', borderRadius: 12,
            border: '1px solid rgba(201,168,76,0.15)',
            padding: 16,
          }}>
            {/* Phase label */}
            <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 11, color: '#a8c4ad', letterSpacing: '0.08em' }}>
              {phase === 'bidding' && 'BIDDING'}
              {phase === 'playing' && (spadesBroken ? '♠ SPADES BROKEN' : 'IN PLAY')}
              {phase === 'round_end' && 'ROUND COMPLETE'}
            </div>

            {/* 2×2 trick grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 8 }}>
              {/* North (top-left) */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <TrickSlot card={trickCardFor(2)} label="North" isWinner={trickComplete && lastTrickWinner === 2} />
              </div>
              {/* East (top-right) */}
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <TrickSlot card={trickCardFor(3)} label="East" isWinner={trickComplete && lastTrickWinner === 3} />
              </div>
              {/* West (bottom-left) */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <TrickSlot card={trickCardFor(1)} label="West" isWinner={trickComplete && lastTrickWinner === 1} />
              </div>
              {/* South (bottom-right) */}
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <TrickSlot card={trickCardFor(0)} label="You" isWinner={trickComplete && lastTrickWinner === 0} />
              </div>
            </div>

            {/* Bag counter */}
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#a8c4ad' }}>
              <span>Bags: {teamBags[0]}/10</span>
              <span>Bags: {teamBags[1]}/10</span>
            </div>
          </div>

          {/* East */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <PlayerInfo player={3} bid={bids[3]} tricks={trickCounts[3]} isActive={currentPlayer === 3} />
            {hands[3].length > 0 && <AIHand count={hands[3].length} backFrom={backFrom} backTo={backTo} />}
          </div>
        </div>

        {/* South (user) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <PlayerInfo player={0} bid={bids[0]} tricks={trickCounts[0]} isActive={currentPlayer === 0} />

          {/* User's hand */}
          <div style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: '0 8px 8px 8px', overflowX: 'auto', maxWidth: '100%',
          }}>
            <div style={{ display: 'flex', gap: -8 }}>
              {userHand.map((card, i) => {
                const isValid = validIds.has(card.id);
                return (
                  <div key={card.id} style={{ marginLeft: i === 0 ? 0 : (userHand.length > 10 ? -18 : -8) }}>
                    <SpadesCardFace
                      card={card}
                      dimmed={phase === 'playing' && currentPlayer === 0 && !isValid}
                      onClick={isValid ? () => playCard(card) : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {phase === 'playing' && currentPlayer === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <p style={{ color: '#c9a84c', fontSize: 12, margin: 0, letterSpacing: '0.04em' }}>
                Click a card to play
                {!spadesBroken && ledSuit === null && ' · Cannot lead spades'}
              </p>
              {countdown !== null && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: `2px solid ${countdown <= 3 ? '#e53935' : 'rgba(201,168,76,0.6)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                  color: countdown <= 3 ? '#e53935' : '#c9a84c',
                  transition: 'color 0.3s, border-color 0.3s',
                }}>
                  {countdown}
                </div>
              )}
            </div>
          )}
          {phase === 'playing' && currentPlayer !== 0 && (
            <p style={{ color: '#a8c4ad', fontSize: 12, margin: 0 }}>
              Waiting for {['South', 'West', 'North', 'East'][currentPlayer]}…
            </p>
          )}
        </div>
      </div>

      {/* Overlays */}
      {phase === 'bidding' && (
        <BiddingPanel bids={bids} currentPlayer={currentPlayer} hands={hands} onBid={placeBid} />
      )}
      {phase === 'round_end' && roundResult && (
        <RoundEndPanel state={state} onContinue={nextRound} />
      )}
      {phase === 'game_over' && (
        <GameOverPanel scores={teamScores} winner={winner} onNewGame={newGame} />
      )}
      {showQuit && <QuitConfirmModal onConfirm={onBack} onCancel={() => setShowQuit(false)} panelBg={table.panel} />}
      {showHowTo && <HowToPlayModal game="spades" onClose={() => setShowHowTo(false)} panelBg={table.panel} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
    </CardDim.Provider>
  );
}
