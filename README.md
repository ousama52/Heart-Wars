# Heart Wars

A real-time multiplayer 2D browser game where two players battle each other by shooting heart projectiles, casting love-themed spells, and collecting potions. Built for couples or friends who want instant, free, couch-co-op gaming without downloads.

**Live Demo:** https://heart-wars-ef8eb.netlify.app

---

## Features

- **Real-Time Multiplayer** — Two players sync movement, projectiles, and HP via Firebase Realtime Database
- **4 Spells** — Cupid's Arrow (piercing), Love Shield (block), Heartbreak Nova (AoE), Blink Kiss (dash)
- **Potion System** — Random spawns: heal, speed boost, damage boost, shield
- **Responsive HUD** — Health bars, spell cooldown rings, combat notifications
- **Secure & Lightweight** — Firebase authentication for 2 pre-registered accounts; runs on free tier
- **Procedural Art** — All sprites generated at runtime; no external image assets

---

## Technology Stack

### Frontend
- **React** 18.3.1 — App shell (login, lobby, results)
- **Vite** 6.0.7 — Build tool & dev server
- **Phaser 3** 3.87.0 — 2D game engine (canvas, physics, collision)
- **Tailwind CSS** 4.0.0 — Styling for non-canvas UI

### Backend & Cloud
- **Firebase Authentication** — Email/password sign-in for 2 fixed accounts
- **Firebase Realtime Database** — Real-time state sync (positions, projectiles, HP, cooldowns)
- **Netlify** — Static hosting & CDN

### Key Libraries
- `firebase` 11.1.0 — Auth + RTDB
- `react-dom` 18.3.1 — React mounting

---

## Architecture Overview

Heart Wars uses a **thin-client + cloud backend** architecture:

1. **Client-side prediction** — Local movement and projectile motion are simulated locally without waiting for the server
2. **Victim-authoritative damage** — When a projectile hits, only the victim's client applies damage to itself via a Firebase transaction (prevents cheating and double-counting)
3. **Deterministic motion** — Projectiles store only spawn data (x, y, velocity, timestamp); both clients simulate identically using server time
4. **Host-driven orchestration** — The smallest connected UID becomes the host, driving match state transitions (countdown → active → rematch)
5. **Throttled sync** — Position writes batched at 50ms to stay within Firebase free-tier limits

### Data Flow

```
Login (Firebase Auth)
    ↓
Lobby (presence synced via RTDB)
    ↓
Both Ready → Host triggers countdown
    ↓
Arena (movement predicted locally, synced at 50ms)
    ↓
Projectile fires → Both clients simulate motion identically
    ↓
Victim detects hit → Applies damage via transactional write
    ↓
First to 0 HP → Match ends → Result screen → Rematch or Lobby
```

---

## Installation

### Prerequisites
- Node.js 18+ and npm
- A Firebase project (free Spark plan works)
- Netlify account (optional, for deployment)

### Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/heart-wars.git
   cd heart-wars
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a Firebase project**
   - Go to [console.firebase.google.com](https://console.firebase.google.com)
   - Create a new project
   - Enable **Realtime Database** (us-central1)
   - Enable **Email/Password** authentication

4. **Create two user accounts**
   - In Firebase Console → Authentication → Add two accounts with email/password

5. **Configure the `.env` file**
   ```bash
   cp .env.example .env
   ```
   Fill in your Firebase config values (from Project Settings):
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

6. **Deploy Realtime Database security rules**
   ```bash
   firebase login
   firebase deploy --only database --project your_project_id
   ```
   (Update `firebase.rules.json` with the two account UIDs from step 4)

---

## Running the Project

### Development
```bash
npm run dev
```
Opens the app at `http://localhost:5173`. Hot-reload enabled.

### Production Build
```bash
npm run build
```
Output is in the `dist/` folder.

### Preview Production Build Locally
```bash
npm run preview
```

---

## Gameplay

| Input | Action |
|-------|--------|
| **WASD** or **Arrow Keys** | Move |
| **Left-Click** (aim with mouse) | Fire heart projectile (~0.5s cooldown) |
| **1** | Cupid's Arrow — piercing, high-damage shot (~6s cooldown) |
| **2** | Love Shield — blocks incoming damage (~10s cooldown) |
| **3** | Heartbreak Nova — AoE burst around you (~12s cooldown) |
| **4** | Blink Kiss — short dash toward cursor (~8s cooldown) |
| **Walk over potions** | Grab heal, speed, damage, or shield buffs |

**Win Condition:** First player to reduce opponent to 0 HP wins. Rematch to play again, or return to lobby.

---

## Folder Structure

```
heart-wars/
├── src/
│   ├── game/
│   │   ├── scenes/
│   │   │   ├── PreloadScene.js       # Generate procedural textures
│   │   │   ├── ArenaScene.js         # Main game loop
│   │   │   └── ResultScene.js        # Victory/defeat overlay
│   │   ├── entities/
│   │   │   ├── Player.js             # Player sprite + physics
│   │   │   ├── Projectile.js         # Projectile sprite
│   │   │   ├── Potion.js             # Potion pickup
│   │   │   └── spells.config.js      # Spell definitions
│   │   ├── config.js                 # Phaser game config
│   │   └── constants.js              # Shared game constants
│   ├── pages/
│   │   ├── Login.jsx                 # Email/password form
│   │   ├── Lobby.jsx                 # Ready-check + how-to-play
│   │   ├── GameContainer.jsx         # Mounts Phaser game
│   │   └── Attribution.jsx           # Footer with credits
│   ├── hooks/
│   │   ├── useAuth.js                # Firebase authentication
│   │   ├── useRoom.js                # Lobby + host-driven match flow
│   │   └── useGameSync.js            # RTDB ↔ Phaser bridge
│   ├── lib/
│   │   ├── firebase.js               # Firebase init + config validation
│   │   └── rtdb.js                   # RTDB read/write helpers
│   ├── App.jsx                       # Root router
│   ├── main.jsx                      # React entry point
│   └── index.css                     # Global styles (Tailwind)
├── public/
│   └── heart.svg                     # Favicon
├── .env.example                      # Firebase config template
├── .firebaserc                       # Firebase project config
├── firebase.json                     # Firebase deployment config
├── firebase.rules.json               # RTDB security rules
├── netlify.toml                      # Netlify build config
├── vite.config.js                    # Vite config
├── package.json                      # Dependencies
└── README.md                         # This file
```

---

## Deployment

### To Netlify (Recommended)

1. Push to GitHub
2. Connect repo to Netlify
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Add environment variables in Netlify dashboard:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_DATABASE_URL`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
6. Deploy

### To Firebase Hosting (Optional)

```bash
npm run build
firebase deploy --project your_project_id
```

---

## Architecture Decisions

### Why Victim-Authoritative Damage?
In a multiplayer game, the attacker could lie about damage dealt. Instead, the **victim** detects the hit and applies damage to itself via a Firebase transaction. The victim has no incentive to lie (they want to stay alive).

### Why Deterministic Projectiles?
Projectiles store only spawn data (position, velocity, timestamp). Both clients independently simulate motion using the same formula, eliminating per-frame sync writes and saving ~97% of bandwidth.

### Why No Backend Server?
Firebase Realtime Database's transactional writes prevent race conditions without custom server logic. This reduces complexity and cost; the project runs entirely on Firebase's free Spark plan.

### Why Procedural Art?
All sprites are generated at runtime via Phaser Graphics. No external image files means the bundle is lightweight (~500 KB gzipped) and loads instantly.

---

## Security

- **Firebase Security Rules** restrict all reads/writes under the game room to only the two authenticated UIDs
- **Victim-authoritative damage** prevents cheating (shooter cannot lie about damage)
- **Transactional writes** prevent race conditions and double-counting hits
- **Host-driven orchestration** ensures only one client can trigger match state changes
- **No public signup** — only two pre-registered accounts can play

---

## License

MIT License — See [LICENSE](LICENSE) file (or create one as needed).

---

## Credits

- **Game art**: Procedurally generated (Phaser Graphics)
- **Phaser 3**: MIT Licensed
- **React, Vite, Tailwind**: MIT Licensed
- **Firebase**: Google Cloud

See [CREDITS.md](CREDITS.md) for detailed attribution.

---

## Troubleshooting

### "Needs Firebase" screen on login
Ensure `.env` is filled with correct Firebase config values and the web app is registered in Firebase Console.

### Wrong email or password
Only the two pre-registered accounts can log in. Check the Firebase Console Authentication tab.

### Projectiles not syncing
Verify the game room exists in RTDB and security rules allow your account UIDs to read/write.

### Deployment fails on Netlify
Confirm all `VITE_FIREBASE_*` environment variables are set in the Netlify dashboard.

---

## Development Notes

- **Clock sync**: Both clients subscribe to Firebase's `.info/serverTimeOffset` to ensure deterministic motion
- **Throttled writes**: Position updates only every 50ms, not per-frame, to minimize Firebase writes
- **Procedural textures**: Generated once at app startup in PreloadScene; cached by Phaser
- **No tests**: Currently no automated tests; manual testing via two browsers recommended

---

## Future Enhancements

- Sound effects
- Mobile touch controls
- Particle effects polish
- Additional spells
- Matchmaking (for 3+ players)
- Replay system

---

## Contact & Support

For issues, feature requests, or questions, open an issue on GitHub or contact the author.

**Enjoy the game! 💘**
