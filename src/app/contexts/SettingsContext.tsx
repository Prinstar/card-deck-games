import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export const TABLE_COLORS = {
  'Felt Green':  { bg: 'linear-gradient(160deg, #1a5e2a 0%, #164f24 60%, #0f3a1a 100%)', panel: 'linear-gradient(135deg, #1e6b30, #164f24)', border: 'rgba(201,168,76,0.25)' },
  'Midnight':    { bg: 'linear-gradient(160deg, #0d1b2a 0%, #0a1628 60%, #060e1a 100%)', panel: 'linear-gradient(135deg, #0f2540, #0a1830)', border: 'rgba(100,140,200,0.25)' },
  'Burgundy':    { bg: 'linear-gradient(160deg, #4a1020 0%, #3d0c1a 60%, #2a0810 100%)', panel: 'linear-gradient(135deg, #5c1020, #48091a)', border: 'rgba(201,168,76,0.25)' },
  'Slate':       { bg: 'linear-gradient(160deg, #2a3240 0%, #222938 60%, #181e2a 100%)', panel: 'linear-gradient(135deg, #2e3a4c, #222e3c)', border: 'rgba(160,180,210,0.25)' },
} as const;

export const CARD_BACKS = {
  'Navy':    { from: '#1a237e', to: '#283593' },
  'Crimson': { from: '#7f0000', to: '#b71c1c' },
  'Forest':  { from: '#1b5e20', to: '#2e7d32' },
  'Charcoal':{ from: '#212121', to: '#424242' },
} as const;

export const CARD_SIZES = {
  'Small':  { w: 58,  h: 82  },
  'Normal': { w: 72,  h: 101 },
  'Large':  { w: 88,  h: 124 },
} as const;

export type TableColorKey = keyof typeof TABLE_COLORS;
export type CardBackKey   = keyof typeof CARD_BACKS;
export type CardSizeKey   = keyof typeof CARD_SIZES;

export interface Settings {
  tableColor: TableColorKey;
  cardBack:   CardBackKey;
  cardSize:   CardSizeKey;
}

const DEFAULTS: Settings = { tableColor: 'Felt Green', cardBack: 'Navy', cardSize: 'Normal' };

function load(): Settings {
  try {
    const raw = localStorage.getItem('cardtable_settings');
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
}

interface SettingsCtx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const Ctx = createContext<SettingsCtx>({ settings: DEFAULTS, update: () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    localStorage.setItem('cardtable_settings', JSON.stringify(settings));
  }, [settings]);

  const update = (patch: Partial<Settings>) => setSettings(s => ({ ...s, ...patch }));

  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>;
}

export function useSettings() {
  return useContext(Ctx);
}
