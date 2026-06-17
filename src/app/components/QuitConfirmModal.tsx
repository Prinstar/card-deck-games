export function QuitConfirmModal({ onConfirm, onCancel, panelBg }: {
  onConfirm: () => void; onCancel: () => void; panelBg: string;
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
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
        <div style={{ fontSize: 36, marginBottom: 12 }}>🃏</div>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', margin: '0 0 8px', fontSize: 20 }}>
          Quit Game?
        </h2>
        <p style={{ color: '#a8c4ad', margin: '0 0 28px', fontSize: 13, lineHeight: 1.5 }}>
          Your current game progress will be lost.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '11px 0',
              background: 'transparent',
              border: '1px solid rgba(201,168,76,0.4)',
              borderRadius: 8, color: '#c9a84c',
              fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Keep Playing
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '11px 0',
              background: 'rgba(180,60,60,0.25)',
              border: '1px solid rgba(220,80,80,0.4)',
              borderRadius: 8, color: '#ef9a9a',
              fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Quit
          </button>
        </div>
      </div>
    </div>
  );
}
