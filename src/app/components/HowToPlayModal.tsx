type GameMode = 'solitaire' | 'spades' | 'hearts' | 'spider' | 'poker';

interface Rule {
  icon: string;
  title: string;
  body: string;
}

const RULES: Record<GameMode, { title: string; subtitle: string; rules: Rule[] }> = {
  poker: {
    title: '♠ Texas Hold\'em',
    subtitle: 'Make the best 5-card hand using your 2 hole cards and 5 community cards.',
    rules: [
      { icon: '🎯', title: 'The Goal', body: 'Win chips by making the best 5-card poker hand or by getting all other players to fold. Last player with chips wins.' },
      { icon: '🃏', title: 'The Deal', body: 'Each player gets 2 private hole cards. Then 5 community cards are revealed in stages: 3 (flop), 1 (turn), 1 (river). Make your best hand from any 5 of the 7 cards.' },
      { icon: '💰', title: 'Betting Rounds', body: 'Bet before the flop, after the flop, after the turn, and after the river. Actions: Fold (quit the hand), Check (pass if no bet), Call (match current bet), or Raise (increase the bet).' },
      { icon: '🏆', title: 'Hand Rankings', body: 'Best to worst: Royal Flush, Straight Flush, Four of a Kind, Full House, Flush, Straight, Three of a Kind, Two Pair, One Pair, High Card.' },
      { icon: '🎰', title: 'Blinds', body: 'The two players left of the dealer post forced bets (small blind: $25, big blind: $50) to start the pot. The dealer button rotates each hand.' },
    ],
  },
  spider: {
    title: '♠ Spider',
    subtitle: 'Build 8 complete K→A same-suit sequences to win.',
    rules: [
      {
        icon: '🎯',
        title: 'The Goal',
        body: 'Build 8 complete sequences of the same suit from King down to Ace. Each completed sequence is automatically removed from the tableau. Complete all 8 to win!',
      },
      {
        icon: '🃏',
        title: 'Moving Cards',
        body: 'You can move any single face-up card onto a card one rank higher (any suit). To move multiple cards as a group, they must all be the same suit and in descending order.',
      },
      {
        icon: '📦',
        title: 'The Stock',
        body: 'Click the stock pile to deal one card face-up to each column. You cannot deal if any column is empty. There are 5 deals available (50 cards total).',
      },
      {
        icon: '♠',
        title: 'Difficulty',
        body: '1 Suit (beginner): all spades — easiest to form sequences. 2 Suits (medium): spades & hearts. 4 Suits (expert): standard deck — hardest, as mixed-suit stacks are hard to sequence.',
      },
      {
        icon: '🌙',
        title: 'Empty Columns',
        body: 'Any card or valid sequence can be placed in an empty column. Use them strategically as temporary storage to reorganize your tableau.',
      },
    ],
  },
  solitaire: {
    title: '♠ Solitaire',
    subtitle: 'Classic Klondike — move all cards to the foundations to win.',
    rules: [
      {
        icon: '🃏',
        title: 'The Goal',
        body: 'Build four foundation piles (top-right), one per suit, from Ace up to King. When all 52 cards are on the foundations, you win.',
      },
      {
        icon: '📋',
        title: 'The Tableau',
        body: 'The seven columns in the main area. Stack cards in descending rank and alternating color (red on black, black on red). Only a King may fill an empty column.',
      },
      {
        icon: '🔄',
        title: 'The Stock',
        body: 'Click the face-down deck (top-left) to flip cards one at a time to the waste pile. You may cycle through the stock multiple times.',
      },
      {
        icon: '🏗️',
        title: 'Moving Cards',
        body: 'Drag a card (or a stack of face-up cards) onto a valid target. Cards go to the foundations automatically when you click them if they fit.',
      },
      {
        icon: '💡',
        title: 'Tips',
        body: 'Uncover face-down cards as quickly as possible. Avoid filling empty columns unless you have a King ready. Move Aces and low cards to foundations early.',
      },
    ],
  },
  spades: {
    title: '♠♥ Spades',
    subtitle: 'Trick-taking with bidding — you and North vs. West and East.',
    rules: [
      {
        icon: '🎯',
        title: 'The Goal',
        body: 'Be the first team to reach 500 points. You (South) partner with North; West and East are the opposing team.',
      },
      {
        icon: '✋',
        title: 'Bidding',
        body: 'Before each round, every player bids the number of tricks they expect to win. Your team\'s bids combine. Bid "Nil" to attempt winning zero tricks for a 100-point bonus (or penalty).',
      },
      {
        icon: '🃏',
        title: 'Playing Tricks',
        body: 'Follow the led suit if you can. If you can\'t, you may play any card including a spade. The highest card of the led suit wins — unless a spade is played, in which case the highest spade wins.',
      },
      {
        icon: '♠',
        title: 'Spades Are Trump',
        body: 'Spades cannot be led until a spade has been "broken" (played when someone couldn\'t follow suit) — unless spades are the only suit in your hand.',
      },
      {
        icon: '📊',
        title: 'Scoring',
        body: 'Make your bid: +10 pts per bid trick, +1 pt per overtrick (bag). Miss your bid: −10 pts per bid trick. Every 10 bags accumulated costs −100 pts. Nil bid made: +100; failed: −100.',
      },
    ],
  },
  hearts: {
    title: '♥ Hearts',
    subtitle: 'Avoid penalty cards — lowest score when someone hits 100 wins.',
    rules: [
      {
        icon: '🎯',
        title: 'The Goal',
        body: 'Have the lowest score when any player reaches 100 points. Hearts are worth 1 point each; the Queen of Spades is worth 13 points. Avoid taking them!',
      },
      {
        icon: '🔄',
        title: 'Passing Cards',
        body: 'At the start of each round, select 3 cards to pass to another player. The direction rotates: left → right → across → no pass, then repeats.',
      },
      {
        icon: '2️⃣',
        title: 'Starting Play',
        body: 'The player with the 2 of Clubs leads first — and must lead it. You must follow the led suit if possible. You cannot lead hearts until hearts have been "broken."',
      },
      {
        icon: '♠',
        title: 'Queen of Spades',
        body: 'The Q♠ is worth 13 penalty points. Playing it also breaks hearts, allowing heart leads afterward. It cannot be played on the first trick.',
      },
      {
        icon: '🌙',
        title: 'Shooting the Moon',
        body: 'If one player takes ALL 13 hearts AND the Q♠ (all 26 points), they "shoot the moon" — instead of taking 26 points, every other player gets +26. High risk, high reward!',
      },
    ],
  },
};

export function HowToPlayModal({ game, onClose, panelBg }: {
  game: GameMode; onClose: () => void; panelBg: string;
}) {
  const { title, subtitle, rules } = RULES[game];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: panelBg,
        border: '1px solid rgba(201,168,76,0.5)',
        borderRadius: 16, padding: '28px 32px',
        width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <h2 style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', margin: 0, fontSize: 20 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: '1px solid rgba(201,168,76,0.3)',
              color: '#c9a84c', borderRadius: 6, padding: '2px 10px',
              cursor: 'pointer', fontSize: 14, lineHeight: '24px',
            }}
          >✕</button>
        </div>
        <p style={{ color: '#a8c4ad', margin: '0 0 24px', fontSize: 13 }}>{subtitle}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rules.map((rule, i) => (
            <div key={i} style={{
              background: 'rgba(0,0,0,0.18)',
              border: '1px solid rgba(201,168,76,0.12)',
              borderRadius: 10, padding: '12px 16px',
              display: 'flex', gap: 14, alignItems: 'flex-start',
            }}>
              <div style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{rule.icon}</div>
              <div>
                <div style={{ color: '#f5efe0', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{rule.title}</div>
                <div style={{ color: '#a8c4ad', fontSize: 12, lineHeight: 1.6 }}>{rule.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
