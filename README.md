# 🃏 Card Deck Games

A collection of classic card games built with **React**, **TypeScript**, and **Vite**. This project brings together several popular single-player and multiplayer card games in one modern web application with a clean, responsive interface.

## Games Included

- ♠️ Solitaire (Klondike)
- 🕷️ Spider Solitaire
- ♥️ Hearts
- ♠️ Spades
- 🃏 Poker

Each game follows its traditional rules while providing an interactive and user-friendly experience.

## Features

- Multiple classic card games in one application
- Modern and responsive user interface
- Interactive card animations and gameplay
- Reusable card and deck components
- Built with TypeScript for improved reliability
- Fast development and build process using Vite

## Tech Stack

- React
- TypeScript
- Vite
- CSS
- Material UI
- shadcn/ui

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- npm

### Installation

Clone the repository:

```bash
git clone https://github.com/Prinstar/card-deck-games.git
```

Navigate to the project directory:

```bash
cd card-deck-games
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local development URL displayed in your terminal (typically `http://localhost:5173`).

## Build for Production

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Project Structure

```text
card-deck-games/
├── src/
│   ├── components/
│   ├── games/
│   │   ├── solitaire/
│   │   ├── spider/
│   │   ├── hearts/
│   │   ├── poker/
│   │   └── spades/
│   ├── assets/
│   └── ...
├── public/
├── package.json
├── vite.config.ts
└── README.md
```

## Gameplay

### Solitaire (Klondike)
Arrange all cards into four foundation piles by suit from Ace to King.

### Spider Solitaire
Build complete sequences of cards from King to Ace to remove them from the table.

### Hearts
Avoid collecting hearts and the Queen of Spades while trying to finish with the lowest score.

### Spades
A trick-taking partnership game where spades are always the trump suit.

### Poker
Play classic poker using standard hand rankings such as Pair, Straight, Flush, Full House, Four of a Kind, and Royal Flush.

## Future Improvements

- Additional card games
- Multiplayer support
- AI opponents
- Game statistics and achievements
- Save and resume games
- Sound effects and animations
- Dark mode
- Accessibility improvements

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Push your branch.
5. Open a Pull Request.

## License

This project is licensed under the MIT License unless otherwise specified.

## Author

**Prinstar**

GitHub: https://github.com/Prinstar/card-deck-games
