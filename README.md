# Solitaire Game

A web-based Solitaire game built with **React**, **TypeScript**, and **Vite**. This project recreates the classic single-player card game with a clean interface and interactive gameplay.

## Features

- Classic Solitaire card layout
- Interactive card movement
- Stock, waste, tableau, and foundation piles
- Responsive web interface
- Built with modern frontend tools
- Styled with CSS and UI components

## Tech Stack

- React
- TypeScript
- Vite
- CSS
- Material UI
- shadcn/ui components

## Getting Started

### Prerequisites

Make sure you have **Node.js** and **npm** installed.

### Installation

Clone the repository:

```bash
git clone https://github.com/Prinstar/card-deck-games.git
```

Navigate into the project folder:

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

Open the local server URL shown in your terminal to play the game.

## Available Scripts

```bash
npm run dev
```

Starts the development server.

```bash
npm run build
```

Builds the project for production.

## Project Structure

```text
card-deck-games/
├── src/
├── guidelines/
├── index.html
├── package.json
├── vite.config.ts
├── default_shadcn_theme.css
├── ATTRIBUTIONS.md
└── README.md
```

## How to Play

The goal of Solitaire is to move all cards into the foundation piles, organized by suit from Ace to King.

Basic rules:

- Build tableau columns in descending order.
- Alternate card colors when stacking cards.
- Move Aces to the foundation piles first.
- Build each foundation pile upward by suit.
- Draw from the stock pile when no moves are available.
- Win by moving all cards to the foundations.

## Credits

This project was generated from a Figma design bundle. The original design is linked in the existing project README. Some components are from **shadcn/ui**, and images may be sourced from **Unsplash**.

## Author

Created by **Prinstar**.

GitHub: https://github.com/Prinstar
