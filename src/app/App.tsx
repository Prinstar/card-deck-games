import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { SettingsProvider } from './contexts/SettingsContext';
import { HomeScreen } from './components/HomeScreen';
import { SolitaireGame } from './components/solitaire/SolitaireGame';
import { SpadesGame } from './components/spades/SpadesGame';
import { HeartsGame } from './components/hearts/HeartsGame';
import { SpiderGame } from './components/spider/SpiderGame';
import { PokerGame } from './components/poker/PokerGame';

type Screen = 'home' | 'solitaire' | 'spades' | 'hearts' | 'spider' | 'poker';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <SettingsProvider>
      {screen === 'solitaire' && (
        <DndProvider backend={HTML5Backend}>
          <SolitaireGame onBack={() => setScreen('home')} />
        </DndProvider>
      )}
      {screen === 'spades' && <SpadesGame onBack={() => setScreen('home')} />}
      {screen === 'hearts' && <HeartsGame onBack={() => setScreen('home')} />}
      {screen === 'spider' && <SpiderGame onBack={() => setScreen('home')} />}
      {screen === 'poker' && <PokerGame onBack={() => setScreen('home')} />}
      {screen === 'home' && <HomeScreen onSelect={mode => setScreen(mode)} />}
    </SettingsProvider>
  );
}
