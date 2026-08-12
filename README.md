# 👑 Kings Tac Toe

A real-time, 2-4 player LAN party web adaptation of the classic board game **Kingdoms**. 

Players compete over 3 rounds to place castles and claim resources on a shared board. With real-time multiplayer synchronization, dynamic animations, and an automated scoring engine, this project brings the tabletop experience seamlessly to your browser.

---

## ✨ Features

- **Real-Time LAN Multiplayer:** Powered by FastAPI WebSockets with an exponential backoff reconnect system to survive LAN party network hiccups.
- **Optimized Performance:** Assets utilize highly compressed `Animated WebP` and `MP4` formats, ensuring fast load times and low memory usage even on older laptops.
- **Dynamic Animations:** Features custom SVG line-drawing logos, FLIP-animated flying tiles using Framer Motion, screen-traversing "Travelers", and celebratory particle effects.
- **Automated Complex Scoring:** The game engine handles all line-of-sight calculations, special tile overrides (Dragons, Wizards, Mountains, Goldmines), and multiplier logic instantly.
- **Persistent High Scores:** Local `.txt` file-based leaderboard separated by player count (2P, 3P, 4P).

---

## 🛠️ Tech Stack

**Frontend:**
- **React 19** + **TypeScript**
- **Vite** (Build Tool & Dev Server)
- **Framer Motion** (Complex animations & layout transitions)
- **CSS3** (Custom keyframes, CSS Grid layouts)

**Backend:**
- **Python 3.x**
- **FastAPI** (API routing and WebSocket management)
- **Uvicorn** (ASGI server)
- **Pydantic** (Data validation)

---

## 🚀 Installation & Setup

### Prerequisites
Make sure you have the following installed on your machine:
- [Python 3.8+](https://www.python.org/downloads/)
- [Node.js 18+](https://nodejs.org/)
- [pnpm](https://pnpm.io/installation) (Package manager)

### 1. Install Backend Dependencies
Navigate to the project root and install the Python requirements:
```bash
pip install -r requirements.txt

2. Install Frontend Dependencies

Install the Node modules for the React app:
code Bash

pnpm install

3. Start the Game Servers

If you are on a Linux environment (GNOME), you can use the provided startup script to launch both the frontend and backend simultaneously:
code Bash

chmod +x kingstactoe.sh
./kingstactoe.sh

To start manually (or on Windows/Mac):
Open two terminal windows.

    Terminal 1 (Backend): python main.py (Starts on port 3000)

    Terminal 2 (Frontend): pnpm run dev (Starts Vite server)

4. Join the LAN Party

Players on the same network can access the game by opening their browser and navigating to the Host's IP address and Vite port (e.g., http://192.168.1.XX:5173).
📜 How to Play
Goal

Have the most points after 3 Rounds.
Turn Actions

On your turn, you must perform one of the following actions:

    Place a Castle: Place one of your colored castles onto an empty space on the board.

    Draw & Place a Tile: Draw a random tile from the bag and place it on an empty space.

    Play your Hole Tile: Place the secret tile you were dealt at the start of the round.

    Pass: If you have no moves remaining, you pass.

Scoring

The round ends when the board is completely full. Points are awarded based on rows and columns:

    (Row/Col Value) × (Castle Rank)

Special Tiles

    ⛰️ Mountain: Blocks line of sight. Scoring for a row/column stops when it hits a mountain.

    🐉 Dragon: Cancels all positive (+) tiles in that row and column.

    💰 Goldmine: Doubles the final total value of the row and column.

    🧙‍♂️ Wizard: Boosts the rank of all directly adjacent castles by +1.

Castles

Each player has a set of Rank 1, 2, 3, and 4 castles.

    Rank 1 castles are returned to you at the end of every round.

    Ranks 2-4 are single-use only. Once placed, they are gone for the rest of the game!

📁 Project Structure
code Text

├── main.py                   # FastAPI backend, GameState logic, WebSocket Manager
├── src/
│   ├── components/           # React Components (GameBoard, Lobby, PlayerActions, etc.)
│   ├── hooks/                # Custom React Hooks (WebSockets, Animations, API actions)
│   ├── styles/               # CSS Files
│   ├── types.ts              # TypeScript Interfaces
│   ├── utils.ts              # Asset mapping and game utilities
│   └── App.tsx               # Main React application entry point
├── public/                   # Static assets (WebP tiles, MP4 videos, Sounds, Fonts)
├── package.json              # Frontend dependencies
├── requirements.txt          # Backend dependencies
└── kingstactoe.sh            # Quick-start bash script

📝 License

This is a personal adaptation project intended for private LAN parties. Kingdoms is a registered trademark of its respective publisher/designer (Reiner Knizia).