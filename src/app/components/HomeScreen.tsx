import { useState } from 'react';
import { useSettings, TABLE_COLORS } from '../contexts/SettingsContext';
import { SettingsButton, SettingsPanel } from './SettingsPanel';

type GameMode = 'solitaire' | 'spades' | 'hearts' | 'spider' | 'poker';

export function HomeScreen({ onSelect }: { onSelect: (mode: GameMode) => void }) {
  const { settings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const table = TABLE_COLORS[settings.tableColor];

  return (
    <div style={{
      minHeight: '100vh',
      background: table.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif', padding: 24,
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <SettingsButton onClick={() => setShowSettings(true)} />
      </div>

      <h1 style={{
        fontFamily: 'Cinzel, serif', color: '#c9a84c',
        fontSize: 42, fontWeight: 700, letterSpacing: '0.08em',
        marginBottom: 8, textAlign: 'center',
      }}>
        Card Table
      </h1>
      <p style={{ color: '#a8c4ad', marginBottom: 48, fontSize: 15, textAlign: 'center' }}>
        Choose your game
      </p>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        <GameCard symbol="♠" title="Solitaire" description="Classic Klondike. Build four foundation piles from Ace to King." detail="1 Player" onClick={() => onSelect('solitaire')} />
        <GameCard symbol="♠♥" title="Spades" description="Trick-taking with bidding. Team up with North to beat West & East." detail="1v3 (AI partners)" onClick={() => onSelect('spades')} />
        <GameCard symbol="♥" title="Hearts" description="Avoid taking hearts and the Queen of Spades. Lowest score wins." detail="1v3 (no teams)" onClick={() => onSelect('hearts')} />
        <GameCard symbol="♠" title="Spider" description="Build 8 complete suit sequences from King to Ace. Choose 1, 2, or 4 suits." detail="1 Player" onClick={() => onSelect('spider')} />
        <GameCard symbol="♠♥♦♣" title="Poker" description="Texas Hold'em against 3 AI opponents. Bluff, bet, and outplay them all." detail="1v3 (AI)" onClick={() => onSelect('poker')} />
      </div>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function GameCard({ symbol, title, description, detail, onClick }: {
  symbol: string; title: string; description: string; detail: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.3)',
        borderRadius: 16, padding: '36px 32px', width: 240, cursor: 'pointer',
        textAlign: 'center', transition: 'all 0.2s', color: 'inherit',
      }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(201,168,76,0.1)'; el.style.borderColor = 'rgba(201,168,76,0.6)'; el.style.transform = 'translateY(-4px)'; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.05)'; el.style.borderColor = 'rgba(201,168,76,0.3)'; el.style.transform = 'none'; }}
    >
      <div style={{ fontSize: 48, marginBottom: 12, color: '#c9a84c' }}>{symbol}</div>
      <div style={{ fontFamily: 'Cinzel, serif', color: '#f5efe0', fontSize: 22, fontWeight: 700, marginBottom: 10 }}>{title}</div>
      <div style={{ color: '#a8c4ad', fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>{description}</div>
      <div style={{ display: 'inline-block', background: 'rgba(201,168,76,0.15)', color: '#c9a84c', fontSize: 11, padding: '4px 10px', borderRadius: 4, letterSpacing: '0.05em' }}>{detail}</div>
    </button>
  );
}
