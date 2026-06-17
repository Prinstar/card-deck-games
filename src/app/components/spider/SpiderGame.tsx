import { useState, type ReactNode, createContext, useContext } from 'react';
import { useSpider } from '../../hooks/useSpider';
import { useSettings, TABLE_COLORS, CARD_BACKS, CARD_SIZES } from '../../contexts/SettingsContext';
import { SettingsButton, SettingsPanel } from '../SettingsPanel';
import { QuitConfirmModal } from '../QuitConfirmModal';
import { HowToPlayModal } from '../HowToPlayModal';
import {
  SUIT_SYMBOLS,
  rankLabel,
  isRed,
  type Card,
  type SpiderSuits,
} from './spiderEngine';

const CardDim = createContext({ w: 90, h: 126, faceDownStep: 18, faceUpStep: 36 });

// ─── Card face ────────────────────────────────────────────────────────────────

function SpiderCardFace({ card, selected }: { card: Card; selected: boolean }) {
  const { w, h } = useContext(CardDim);
  const red = isRed(card);
  const color = red ? '#d32f2f' : '#1a1a2e';
  const symbol = SUIT_SYMBOLS[card.suit];
  const label = rankLabel(card.rank);

  return (
    <div style={{
      width: w,
      height: h,
      borderRadius: 6,
      background: selected ? '#fffde7' : '#f5f0e8',
      border: selected
        ? '2px solid #c9a84c'
        : '1px solid rgba(0,0,0,0.18)',
      boxShadow: selected
        ? '0 0 0 2px rgba(201,168,76,0.5), 0 2px 8px rgba(0,0,0,0.3)'
        : '0 2px 6px rgba(0,0,0,0.25)',
      position: 'relative',
      userSelect: 'none',
      cursor: 'pointer',
      flexShrink: 0,
      boxSizing: 'border-box',
    }}>
      {/* Top-left */}
      <div style={{
        position: 'absolute', top: 4, left: 6,
        fontSize: 14, fontWeight: 700, lineHeight: 1, color,
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <div>{label}</div>
        <div>{symbol}</div>
      </div>
      {/* Center */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 30, color, pointerEvents: 'none',
      }}>
        {symbol}
      </div>
      {/* Bottom-right */}
      <div style={{
        position: 'absolute', bottom: 4, right: 6,
        fontSize: 14, fontWeight: 700, lineHeight: 1, color,
        fontFamily: 'DM Sans, sans-serif',
        transform: 'rotate(180deg)',
      }}>
        <div>{label}</div>
        <div>{symbol}</div>
      </div>
    </div>
  );
}

function SpiderCardBack({ backFrom, backTo }: { backFrom: string; backTo: string }) {
  const { w, h } = useContext(CardDim);
  return (
    <div style={{
      width: w,
      height: h,
      borderRadius: 6,
      background: `linear-gradient(135deg, ${backFrom}, ${backTo})`,
      border: '1px solid rgba(0,0,0,0.3)',
      boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
      flexShrink: 0,
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 4,
        borderRadius: 4,
        border: '1px solid rgba(255,255,255,0.15)',
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.04) 4px, rgba(255,255,255,0.04) 8px)',
      }} />
    </div>
  );
}

// ─── Tableau Column ────────────────────────────────────────────────────────────

// Steps are derived from card height in context

function TableauColumn({
  cards,
  colIdx,
  selectedIdx,
  onCardClick,
  onColClick,
  backFrom,
  backTo,
}: {
  cards: Card[];
  colIdx: number;
  selectedIdx: number | null;
  onCardClick: (colIdx: number, cardIdx: number) => void;
  onColClick: (colIdx: number) => void;
  backFrom: string;
  backTo: string;
}) {
  const { w, h, faceDownStep, faceUpStep } = useContext(CardDim);

  // Calculate column height
  let totalHeight = h;
  if (cards.length > 1) {
    let offset = 0;
    for (let i = 0; i < cards.length - 1; i++) {
      offset += cards[i].faceUp ? faceUpStep : faceDownStep;
    }
    totalHeight = offset + h;
  }

  if (cards.length === 0) {
    return (
      <div
        onClick={() => onColClick(colIdx)}
        style={{
          width: w,
          height: h,
          borderRadius: 6,
          border: '2px dashed rgba(201,168,76,0.35)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      />
    );
  }

  // Build card positions
  const positions: number[] = [];
  let top = 0;
  for (let i = 0; i < cards.length; i++) {
    positions.push(top);
    if (i < cards.length - 1) {
      top += cards[i].faceUp ? faceUpStep : faceDownStep;
    }
  }

  return (
    <div style={{ position: 'relative', width: w, height: totalHeight, flexShrink: 0 }}>
      {cards.map((card, i) => {
        const isSelected = selectedIdx !== null && i >= selectedIdx;
        const topPos = positions[i];

        if (!card.faceUp) {
          return (
            <div
              key={card.id}
              style={{ position: 'absolute', top: topPos, left: 0, zIndex: i + 1 }}
              onClick={() => onColClick(colIdx)}
            >
              <SpiderCardBack backFrom={backFrom} backTo={backTo} />
            </div>
          );
        }

        return (
          <div
            key={card.id}
            style={{ position: 'absolute', top: topPos, left: 0, zIndex: i + 1 }}
            onClick={() => onCardClick(colIdx, i)}
          >
            <SpiderCardFace card={card} selected={isSelected} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Difficulty Modal ──────────────────────────────────────────────────────────

function DifficultyModal({
  onSelect,
  onCancel,
  panelBg,
}: {
  onSelect: (suits: SpiderSuits) => void;
  onCancel: () => void;
  panelBg: string;
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        background: panelBg,
        border: '1px solid rgba(201,168,76,0.5)',
        borderRadius: 16, padding: '32px 36px',
        width: '100%', maxWidth: 360, textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>♠</div>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', margin: '0 0 6px', fontSize: 20 }}>
          New Game
        </h2>
        <p style={{ color: '#a8c4ad', margin: '0 0 24px', fontSize: 13 }}>
          Choose difficulty
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <DiffButton label="1 Suit ♠" sub="Beginner" onClick={() => onSelect(1)} />
          <DiffButton label="2 Suits ♠♥" sub="Medium" onClick={() => onSelect(2)} />
          <DiffButton label="4 Suits ♠♥♦♣" sub="Expert" onClick={() => onSelect(4)} />
        </div>
        <button
          onClick={onCancel}
          style={{
            marginTop: 16, width: '100%', padding: '10px 0',
            background: 'transparent',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: 8, color: '#a8c4ad',
            fontFamily: 'DM Sans, sans-serif', fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function DiffButton({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '12px 16px',
        background: 'rgba(201,168,76,0.08)',
        border: '1px solid rgba(201,168,76,0.35)',
        borderRadius: 10, cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        color: '#f5efe0',
        fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 600,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.18)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,168,76,0.6)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.08)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,168,76,0.35)';
      }}
    >
      <span>{label}</span>
      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#a8c4ad', fontWeight: 400 }}>{sub}</span>
    </button>
  );
}

// ─── Game Won Overlay ──────────────────────────────────────────────────────────

function GameWonModal({
  moves,
  onPlayAgain,
  panelBg,
}: {
  moves: number;
  onPlayAgain: () => void;
  panelBg: string;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: panelBg,
        border: '1px solid rgba(201,168,76,0.5)',
        borderRadius: 16, padding: '40px 36px',
        width: '100%', maxWidth: 360, textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', margin: '0 0 8px', fontSize: 26 }}>
          You Win!
        </h2>
        <p style={{ color: '#a8c4ad', margin: '0 0 6px', fontSize: 14 }}>
          All 8 sequences completed!
        </p>
        <p style={{ color: '#f5efe0', margin: '0 0 28px', fontSize: 15, fontWeight: 600 }}>
          {moves} moves
        </p>
        <button
          onClick={onPlayAgain}
          style={{
            width: '100%', padding: '13px 0',
            background: '#c9a84c', color: '#1a1a1a',
            border: 'none', borderRadius: 10,
            fontFamily: 'Cinzel, serif', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '0.04em',
          }}
        >
          Play Again
        </button>
      </div>
    </div>
  );
}

// ─── Stock Pile ────────────────────────────────────────────────────────────────

function StockPile({
  count,
  backFrom,
  backTo,
  onClick,
  disabled,
}: {
  count: number;
  backFrom: string;
  backTo: string;
  onClick: () => void;
  disabled: boolean;
}) {
  const { w, h } = useContext(CardDim);

  if (count === 0) {
    return (
      <div style={{
        width: w, height: h,
        borderRadius: 6,
        border: '2px dashed rgba(201,168,76,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(201,168,76,0.4)', fontSize: 13,
        flexShrink: 0,
      }}>
        0
      </div>
    );
  }

  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        position: 'relative',
        width: w, height: h,
        cursor: disabled ? 'not-allowed' : 'pointer',
        flexShrink: 0,
        opacity: disabled ? 0.55 : 1,
      }}
      title={disabled ? 'Empty a column first' : `Deal next row (${count} deals left)`}
    >
      {/* Stack depth visuals */}
      {count >= 3 && (
        <div style={{
          position: 'absolute', top: -4, left: 4,
          width: w, height: h,
          borderRadius: 6,
          background: `linear-gradient(135deg, ${backFrom}, ${backTo})`,
          border: '1px solid rgba(0,0,0,0.3)',
          opacity: 0.5,
        }} />
      )}
      {count >= 2 && (
        <div style={{
          position: 'absolute', top: -2, left: 2,
          width: w, height: h,
          borderRadius: 6,
          background: `linear-gradient(135deg, ${backFrom}, ${backTo})`,
          border: '1px solid rgba(0,0,0,0.3)',
          opacity: 0.75,
        }} />
      )}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: w, height: h,
        borderRadius: 6,
        background: `linear-gradient(135deg, ${backFrom}, ${backTo})`,
        border: '1px solid rgba(0,0,0,0.3)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
        padding: 5, boxSizing: 'border-box',
      }}>
        <div style={{
          background: '#c9a84c', color: '#1a1a1a',
          borderRadius: 10, padding: '1px 6px',
          fontSize: 11, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
          lineHeight: 1.4,
        }}>
          {count}
        </div>
      </div>
    </div>
  );
}

// ─── Completed Sets Indicator ──────────────────────────────────────────────────

function CompletedSetsRow({ count, suit }: { count: number; suit: string }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 22, height: 30,
            borderRadius: 3,
            border: i < count
              ? '1px solid rgba(201,168,76,0.7)'
              : '1px dashed rgba(201,168,76,0.25)',
            background: i < count ? 'rgba(201,168,76,0.15)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13,
            color: i < count ? '#c9a84c' : 'rgba(201,168,76,0.2)',
          }}
        >
          {i < count ? suit : ''}
        </div>
      ))}
    </div>
  );
}

// ─── Header Button ─────────────────────────────────────────────────────────────

function HdrBtn({ onClick, children, title }: {
  onClick: () => void; children: ReactNode; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'transparent',
        border: '1px solid rgba(201,168,76,0.35)',
        borderRadius: 6, color: '#c9a84c',
        padding: '5px 10px', cursor: 'pointer',
        fontSize: 13, fontFamily: 'DM Sans, sans-serif',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function SpiderGame({ onBack }: { onBack: () => void }) {
  const { settings } = useSettings();
  const table = TABLE_COLORS[settings.tableColor];
  const cardBack = CARD_BACKS[settings.cardBack];
  const panelBg = table.panel;
  const { w: cw, h: ch } = CARD_SIZES[settings.cardSize];
  const cardDim = { w: cw, h: ch, faceDownStep: Math.round(ch * 0.143), faceUpStep: Math.round(ch * 0.286) };

  const { state, selected, clickCard, clickColumn, dealStock, undo, newGame, canUndo } = useSpider(1);

  const [showQuit, setShowQuit] = useState(false);
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showWonPlayAgain, setShowWonPlayAgain] = useState(false);

  const hasEmptyCol = state.tableau.some(col => col.length === 0);
  const suitSymbol = state.suits === 1 ? '♠' : state.suits === 2 ? '♠' : '♠';

  function handleNewGame(suits: SpiderSuits) {
    newGame(suits);
    setShowDifficulty(false);
    setShowWonPlayAgain(false);
  }

  return (
    <CardDim.Provider value={cardDim}>
    <div style={{
      minHeight: '100vh',
      background: table.bg,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'DM Sans, sans-serif',
      color: '#f5efe0',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        borderBottom: '1px solid rgba(201,168,76,0.18)',
        background: 'rgba(0,0,0,0.18)',
        flexWrap: 'wrap',
        rowGap: 8,
      }}>
        <HdrBtn onClick={() => setShowQuit(true)} title="Back to Home">← Back</HdrBtn>

        <div style={{
          fontFamily: 'Cinzel, serif', color: '#c9a84c',
          fontSize: 18, fontWeight: 700, marginLeft: 6, marginRight: 6,
          whiteSpace: 'nowrap',
        }}>
          ♠ Spider
        </div>

        {/* Difficulty badge */}
        <div style={{
          background: 'rgba(201,168,76,0.12)',
          border: '1px solid rgba(201,168,76,0.3)',
          borderRadius: 4, padding: '2px 8px',
          fontSize: 11, color: '#c9a84c', letterSpacing: '0.04em',
        }}>
          {state.suits === 1 ? '1 Suit' : state.suits === 2 ? '2 Suits' : '4 Suits'}
        </div>

        <div style={{ flex: 1 }} />

        {/* Moves */}
        <div style={{ fontSize: 13, color: '#a8c4ad', whiteSpace: 'nowrap' }}>
          Moves: <span style={{ color: '#f5efe0', fontWeight: 600 }}>{state.moves}</span>
        </div>

        {/* Completed sets mini-display */}
        <div style={{ fontSize: 13, color: '#a8c4ad', whiteSpace: 'nowrap' }}>
          ♠ <span style={{ color: '#f5efe0', fontWeight: 600 }}>{state.completedSets}</span>/8
        </div>

        <HdrBtn onClick={undo} title="Undo last move">↩ Undo</HdrBtn>
        <HdrBtn onClick={() => setShowDifficulty(true)} title="Start new game">New</HdrBtn>
        <HdrBtn onClick={() => setShowHowTo(true)} title="How to play">?</HdrBtn>
        <SettingsButton onClick={() => setShowSettings(true)} />
      </div>

      {/* Sub-header: Stock + warning + completed set slots */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '10px 14px 8px',
        background: 'rgba(0,0,0,0.10)',
        borderBottom: '1px solid rgba(201,168,76,0.10)',
        flexWrap: 'wrap',
        rowGap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12, color: '#a8c4ad' }}>Stock:</div>
          <StockPile
            count={state.stock.length}
            backFrom={cardBack.from}
            backTo={cardBack.to}
            onClick={dealStock}
            disabled={hasEmptyCol || state.stock.length === 0}
          />
        </div>

        {hasEmptyCol && state.stock.length > 0 && (
          <div style={{
            fontSize: 11, color: '#ef9a9a',
            background: 'rgba(180,60,60,0.15)',
            border: '1px solid rgba(220,80,80,0.3)',
            borderRadius: 5, padding: '3px 9px',
          }}>
            Cannot deal: fill empty column first
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#a8c4ad' }}>Completed:</div>
          <CompletedSetsRow count={state.completedSets} suit={suitSymbol} />
        </div>
      </div>

      {/* Tableau */}
      <div style={{
        flex: 1,
        overflowX: 'auto',
        padding: '16px 14px 24px',
      }}>
        <div style={{
          display: 'flex',
          gap: 8,
          width: 'max-content',
          alignItems: 'flex-start',
        }}>
          {state.tableau.map((col, ci) => (
            <TableauColumn
              key={ci}
              cards={col}
              colIdx={ci}
              selectedIdx={selected && selected.col === ci ? selected.idx : null}
              onCardClick={clickCard}
              onColClick={clickColumn}
              backFrom={cardBack.from}
              backTo={cardBack.to}
            />
          ))}
        </div>
      </div>

      {/* Modals */}
      {showQuit && (
        <QuitConfirmModal
          onConfirm={onBack}
          onCancel={() => setShowQuit(false)}
          panelBg={panelBg}
        />
      )}

      {showDifficulty && (
        <DifficultyModal
          onSelect={handleNewGame}
          onCancel={() => setShowDifficulty(false)}
          panelBg={panelBg}
        />
      )}

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {showHowTo && (
        <HowToPlayModal
          game="spider"
          onClose={() => setShowHowTo(false)}
          panelBg={panelBg}
        />
      )}

      {state.gameWon && !showWonPlayAgain && (
        <GameWonModal
          moves={state.moves}
          onPlayAgain={() => { setShowWonPlayAgain(true); setShowDifficulty(true); }}
          panelBg={panelBg}
        />
      )}
    </div>
    </CardDim.Provider>
  );
}
