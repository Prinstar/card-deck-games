import { useEffect, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
// @ts-expect-error no types bundled
import confetti from 'canvas-confetti';
import { useSolitaire } from '../../hooks/useSolitaire';
import { useSettings, TABLE_COLORS, CARD_BACKS, CARD_SIZES } from '../../contexts/SettingsContext';
import { SettingsButton, SettingsPanel } from '../SettingsPanel';
import { HowToPlayModal } from '../HowToPlayModal';
import { QuitConfirmModal } from '../QuitConfirmModal';
import {
  SUIT_SYMBOLS, RANK_LABELS, isRed,
  CARD_DRAG_TYPE,
  type Card, type DragItem,
} from './gameEngine';

// Card dimensions come from settings — components accept explicit w/h props
const FACE_DOWN_OFFSET = 16;
const FACE_UP_OFFSET = 26;

// ─── Card face component ─────────────────────────────────────────────────────
function CardFace({ card, w, h }: { card: Card; w: number; h: number }) {
  const red = isRed(card);
  const sym = SUIT_SYMBOLS[card.suit];
  const lbl = RANK_LABELS[card.rank];
  const color = red ? '#c0392b' : '#1a1a2e';
  const scale = w / 76;

  return (
    <div style={{
      width: w, height: h, background: '#fff', borderRadius: 6,
      border: '1px solid #d4cfc8', boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
      position: 'relative', overflow: 'hidden', userSelect: 'none',
      cursor: 'grab', color, fontFamily: 'Georgia, "Times New Roman", serif',
    }}>
      <div style={{ position: 'absolute', top: 4, left: 6, lineHeight: 1, textAlign: 'center' }}>
        <div style={{ fontSize: Math.round(13 * scale), fontWeight: 700 }}>{lbl}</div>
        <div style={{ fontSize: Math.round(11 * scale) }}>{sym}</div>
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(32 * scale) }}>
        {sym}
      </div>
      <div style={{ position: 'absolute', bottom: 4, right: 6, lineHeight: 1, textAlign: 'center', transform: 'rotate(180deg)' }}>
        <div style={{ fontSize: Math.round(13 * scale), fontWeight: 700 }}>{lbl}</div>
        <div style={{ fontSize: Math.round(11 * scale) }}>{sym}</div>
      </div>
    </div>
  );
}

function CardBack({ w, h, backFrom, backTo }: { w: number; h: number; backFrom: string; backTo: string }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 6,
      border: '1px solid rgba(201,168,76,0.4)',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      background: `linear-gradient(135deg, ${backFrom}, ${backTo})`,
      cursor: 'default',
    }}>
      <div style={{
        margin: 6, height: h - 12, borderRadius: 3,
        border: '1px solid rgba(201,168,76,0.35)',
        background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.04) 3px, rgba(255,255,255,0.04) 6px)',
      }} />
    </div>
  );
}

// ─── Empty pile placeholder ──────────────────────────────────────────────────
function EmptyPile({ label, w, h }: { label?: string; w: number; h: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 6,
      border: '2px dashed rgba(201,168,76,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(201,168,76,0.5)', fontSize: 11,
      fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.05em',
    }}>
      {label}
    </div>
  );
}

// ─── Shared card size context (passed via props) ──────────────────────────────
interface CardProps { w: number; h: number; backFrom: string; backTo: string; }

// ─── Draggable card in tableau ───────────────────────────────────────────────
function TableauCard({ card, col, cardIdx, draggableCards, onDoubleClick, cp }: {
  card: Card; col: number; cardIdx: number; draggableCards: Card[];
  onDoubleClick?: () => void; cp: CardProps;
}) {
  const [{ isDragging }, drag] = useDrag<DragItem, unknown, { isDragging: boolean }>(() => ({
    type: CARD_DRAG_TYPE,
    item: (): DragItem => ({ sourceType: 'tableau', tableauCol: col, tableauCardIdx: cardIdx, cards: draggableCards }),
    canDrag: () => card.faceUp,
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  }), [card, col, cardIdx, draggableCards]);

  if (!card.faceUp) return <CardBack {...cp} />;

  return (
    <div ref={drag} onDoubleClick={onDoubleClick} style={{ opacity: isDragging ? 0.3 : 1 }}>
      <CardFace card={card} w={cp.w} h={cp.h} />
    </div>
  );
}

// ─── Waste card (draggable) ──────────────────────────────────────────────────
function WasteCard({ card, onDoubleClick, cp }: { card: Card; onDoubleClick?: () => void; cp: CardProps }) {
  const [{ isDragging }, drag] = useDrag<DragItem, unknown, { isDragging: boolean }>(() => ({
    type: CARD_DRAG_TYPE,
    item: (): DragItem => ({ sourceType: 'waste', cards: [card] }),
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  }), [card]);

  return (
    <div ref={drag} onDoubleClick={onDoubleClick} style={{ opacity: isDragging ? 0.3 : 1 }}>
      <CardFace card={card} w={cp.w} h={cp.h} />
    </div>
  );
}

// ─── Foundation pile ─────────────────────────────────────────────────────────
function FoundationPile({ cards, index, onDrop, suit, cp }: {
  cards: Card[]; index: number; onDrop: (item: DragItem, i: number) => void; suit: string; cp: CardProps;
}) {
  const [{ isOver, canDrop }, drop] = useDrop<DragItem, unknown, { isOver: boolean; canDrop: boolean }>({
    accept: CARD_DRAG_TYPE,
    drop: item => onDrop(item, index),
    collect: monitor => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  });
  const top = cards[cards.length - 1];

  return (
    <div ref={drop} style={{ width: cp.w, height: cp.h, borderRadius: 6, outline: isOver && canDrop ? '2px solid #c9a84c' : 'none', outlineOffset: 2, transition: 'outline 0.1s' }}>
      {top ? <CardFace card={top} w={cp.w} h={cp.h} /> : <EmptyPile label={SUIT_SYMBOLS[suit as keyof typeof SUIT_SYMBOLS]} w={cp.w} h={cp.h} />}
    </div>
  );
}

// ─── Tableau column drop target ──────────────────────────────────────────────
function TableauColumn({ cards, colIndex, onDrop, onDoubleClickCard, cp }: {
  cards: Card[]; colIndex: number;
  onDrop: (item: DragItem, colIndex: number) => void;
  onDoubleClickCard: (card: Card, colIndex: number, cardIdx: number) => void;
  cp: CardProps;
}) {
  const [{ isOver, canDrop }, drop] = useDrop<DragItem, unknown, { isOver: boolean; canDrop: boolean }>({
    accept: CARD_DRAG_TYPE,
    drop: item => onDrop(item, colIndex),
    collect: monitor => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  });

  const minHeight = cp.h + 20;
  const stackHeight = cards.length === 0
    ? minHeight
    : cp.h + cards.slice(0, -1).reduce((acc, c) => acc + (c.faceUp ? FACE_UP_OFFSET : FACE_DOWN_OFFSET), 0);

  return (
    <div ref={drop} style={{ position: 'relative', width: cp.w, height: Math.max(minHeight, stackHeight), borderRadius: 6, outline: isOver && canDrop ? '2px solid #c9a84c' : 'none', outlineOffset: 2, transition: 'outline 0.1s' }}>
      {cards.length === 0 ? <EmptyPile w={cp.w} h={cp.h} /> : cards.map((card, idx) => {
        const faceUpCards = cards.slice(idx);
        let topOffset = 0;
        for (let i = 0; i < idx; i++) topOffset += cards[i].faceUp ? FACE_UP_OFFSET : FACE_DOWN_OFFSET;
        return (
          <div key={card.id} style={{ position: 'absolute', top: topOffset, left: 0, zIndex: idx }}>
            <TableauCard card={card} col={colIndex} cardIdx={idx} draggableCards={faceUpCards} cp={cp}
              onDoubleClick={card.faceUp && idx === cards.length - 1 ? () => onDoubleClickCard(card, colIndex, idx) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Win overlay ─────────────────────────────────────────────────────────────
function WinOverlay({ onNewGame }: { onNewGame: () => void }) {
  const { settings } = useSettings();
  const panelBg = TABLE_COLORS[settings.tableColor].panel;
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const end = Date.now() + 4000;
    const frame = () => {
      confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#c9a84c', '#fff', '#1a5e2a'] });
      confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#c9a84c', '#fff', '#c0392b'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: panelBg,
        border: '2px solid #c9a84c',
        borderRadius: 16,
        padding: '48px 64px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>♠ ♥ ♦ ♣</div>
        <h1 style={{
          fontFamily: 'Cinzel, serif',
          color: '#c9a84c',
          fontSize: 40,
          fontWeight: 700,
          marginBottom: 8,
          letterSpacing: '0.05em',
        }}>
          You Win!
        </h1>
        <p style={{ color: '#a8c4ad', fontFamily: 'DM Sans, sans-serif', marginBottom: 32 }}>
          Congratulations — a perfect game.
        </p>
        <button
          onClick={onNewGame}
          style={{
            background: '#c9a84c',
            color: '#1a1a1a',
            border: 'none',
            borderRadius: 8,
            padding: '12px 32px',
            fontFamily: 'Cinzel, serif',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.05em',
          }}
        >
          New Game
        </button>
      </div>
    </div>
  );
}

// ─── Format time ─────────────────────────────────────────────────────────────
function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ─── Main game board ──────────────────────────────────────────────────────────
const FOUNDATION_SUITS = ['spades', 'hearts', 'clubs', 'diamonds'] as const;

export function SolitaireGame({ onBack }: { onBack: () => void }) {
  const { state, time, newGame, drawFromStock, moveToFoundation, moveToTableau, autoMoveToFoundation } = useSolitaire();
  const { stock, waste, foundations, tableau, score, moves, gameWon } = state;
  const { settings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showQuit, setShowQuit] = useState(false);

  const { w: CARD_W, h: CARD_H } = CARD_SIZES[settings.cardSize];
  const { from: backFrom, to: backTo } = CARD_BACKS[settings.cardBack];
  const cp: CardProps = { w: CARD_W, h: CARD_H, backFrom, backTo };
  const table = TABLE_COLORS[settings.tableColor];

  const topWaste = waste[waste.length - 1] ?? null;

  const handleDoubleClickWaste = () => {
    if (!topWaste) return;
    autoMoveToFoundation(topWaste, { sourceType: 'waste', cards: [topWaste] });
  };

  const handleDoubleClickTableau = (card: Card, col: number, cardIdx: number) => {
    autoMoveToFoundation(card, { sourceType: 'tableau', tableauCol: col, tableauCardIdx: cardIdx, cards: [card] });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: table.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: 'DM Sans, sans-serif', padding: '24px 16px', boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 660, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setShowQuit(true)} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 6, color: '#c9a84c', padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}>← Menu</button>
          <h1 style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: 22, fontWeight: 700, letterSpacing: '0.08em', margin: 0 }}>♠ Solitaire</h1>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Stat label="Score" value={score} />
          <Stat label="Moves" value={moves} />
          <Stat label="Time" value={formatTime(time)} />
          <button onClick={newGame} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.5)', borderRadius: 6, color: '#c9a84c', fontFamily: 'DM Sans, sans-serif', fontSize: 13, padding: '6px 14px', cursor: 'pointer' }}>New</button>
          <button onClick={() => setShowHowTo(true)} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 6, color: '#c9a84c', padding: '5px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }} title="How to Play">?</button>
          <SettingsButton onClick={() => setShowSettings(true)} />
        </div>
      </div>

      {/* Board — key on cardSize so drag/drop hooks reinitialize on size change */}
      <div key={settings.cardSize} style={{ width: '100%', maxWidth: 660 }}>
        {/* Top row: stock, waste, gap, foundations */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'flex-start' }}>
          {/* Stock */}
          <div onClick={drawFromStock} style={{ cursor: 'pointer', flexShrink: 0 }}>
            {stock.length > 0 ? (
              <CardBack {...cp} />
            ) : (
              <div style={{ width: CARD_W, height: CARD_H, borderRadius: 6, border: '2px dashed rgba(201,168,76,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(201,168,76,0.6)', fontSize: 22, cursor: 'pointer' }}>↺</div>
            )}
          </div>

          {/* Waste */}
          <div style={{ flexShrink: 0 }}>
            {topWaste ? <WasteCard card={topWaste} onDoubleClick={handleDoubleClickWaste} cp={cp} /> : <EmptyPile w={CARD_W} h={CARD_H} />}
          </div>

          <div style={{ flex: 1 }} />

          {/* Foundations */}
          {foundations.map((pile, i) => (
            <FoundationPile key={i} cards={pile} index={i} onDrop={moveToFoundation} suit={FOUNDATION_SUITS[i]} cp={cp} />
          ))}
        </div>

        {/* Tableau */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          {tableau.map((col, colIdx) => (
            <TableauColumn key={colIdx} cards={col} colIndex={colIdx} onDrop={moveToTableau} onDoubleClickCard={handleDoubleClickTableau} cp={cp} />
          ))}
        </div>
      </div>

      {gameWon && <WinOverlay onNewGame={newGame} />}
      {showQuit && <QuitConfirmModal onConfirm={onBack} onCancel={() => setShowQuit(false)} panelBg={table.panel} />}
      {showHowTo && <HowToPlayModal game="solitaire" onClose={() => setShowHowTo(false)} panelBg={table.panel} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#a8c4ad', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 18, color: '#f5efe0', fontWeight: 600 }}>{value}</div>
    </div>
  );
}
