import {
  useSettings,
  TABLE_COLORS, CARD_BACKS, CARD_SIZES,
  type TableColorKey, type CardBackKey, type CardSizeKey,
} from '../contexts/SettingsContext';
import type React from 'react';

export function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Settings"
      style={{
        background: 'transparent',
        border: '1px solid rgba(201,168,76,0.4)',
        borderRadius: 6,
        color: '#c9a84c',
        padding: '5px 10px',
        cursor: 'pointer',
        fontSize: 15,
        lineHeight: 1,
      }}
    >
      ⚙
    </button>
  );
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { settings, update } = useSettings();
  const panelBg = TABLE_COLORS[settings.tableColor].panel;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: panelBg,
        border: '1px solid rgba(201,168,76,0.45)',
        borderRadius: 16,
        padding: '32px 36px',
        width: '100%', maxWidth: 460,
        boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', margin: 0, fontSize: 20 }}>
            Display Settings
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a8c4ad', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Table color */}
        <Section label="Table Color">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(Object.keys(TABLE_COLORS) as TableColorKey[]).map(key => (
              <Swatch
                key={key}
                label={key}
                preview={<div style={{ width: '100%', height: '100%', background: TABLE_COLORS[key].bg, borderRadius: 4 }} />}
                selected={settings.tableColor === key}
                onClick={() => update({ tableColor: key })}
              />
            ))}
          </div>
        </Section>

        {/* Card back */}
        <Section label="Card Back">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(Object.keys(CARD_BACKS) as CardBackKey[]).map(key => {
              const { from, to } = CARD_BACKS[key];
              return (
                <Swatch
                  key={key}
                  label={key}
                  preview={
                    <div style={{
                      width: '100%', height: '100%', borderRadius: 4,
                      background: `linear-gradient(135deg, ${from}, ${to})`,
                      backgroundImage: `linear-gradient(135deg, ${from}, ${to}), repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 6px)`,
                      backgroundBlendMode: 'overlay',
                    }} />
                  }
                  selected={settings.cardBack === key}
                  onClick={() => update({ cardBack: key })}
                />
              );
            })}
          </div>
        </Section>

        {/* Card size */}
        <Section label="Card Size">
          <div style={{ display: 'flex', gap: 10 }}>
            {(Object.keys(CARD_SIZES) as CardSizeKey[]).map(key => (
              <button
                key={key}
                onClick={() => update({ cardSize: key })}
                style={{
                  flex: 1, padding: '10px 0',
                  borderRadius: 8,
                  border: `1px solid ${settings.cardSize === key ? '#c9a84c' : 'rgba(201,168,76,0.25)'}`,
                  background: settings.cardSize === key ? 'rgba(201,168,76,0.15)' : 'transparent',
                  color: settings.cardSize === key ? '#c9a84c' : '#a8c4ad',
                  cursor: 'pointer',
                  fontSize: 13, fontFamily: 'DM Sans, sans-serif',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: key === 'Small' ? 14 : key === 'Normal' ? 18 : 22, marginBottom: 4 }}>🂡</div>
                {key}
              </button>
            ))}
          </div>
        </Section>

        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: 8, padding: '11px 0',
            background: '#c9a84c', color: '#1a1a1a',
            border: 'none', borderRadius: 8,
            fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', letterSpacing: '0.04em',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, color: '#a8c4ad', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Swatch({ label, preview, selected, onClick }: {
  label: string; preview: React.ReactNode; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 80, padding: '6px 0 8px',
        borderRadius: 8,
        border: `1px solid ${selected ? '#c9a84c' : 'rgba(201,168,76,0.2)'}`,
        background: selected ? 'rgba(201,168,76,0.12)' : 'transparent',
        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        transition: 'all 0.15s',
      }}
    >
      <div style={{ width: 56, height: 36, borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
        {preview}
      </div>
      <span style={{ fontSize: 11, color: selected ? '#c9a84c' : '#a8c4ad', fontFamily: 'DM Sans, sans-serif' }}>
        {label}
      </span>
    </button>
  );
}
