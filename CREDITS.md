# Credits & Licenses

## Game art

All in-game graphics in Heart Wars are **generated procedurally at runtime**
using Phaser's `Graphics` API (see `src/game/scenes/PreloadScene.js`). No
third-party image files are bundled, fetched, or hotlinked. Emoji shown in the
HUD, spell icons, and result screen are rendered by the player's own system
font.

Because no third-party image assets are used, **no CC-BY attribution is
currently required.** The in-game "Credits & licenses" footer states this.

## If you add real art later

The project is set up to source assets only from free libraries:

- **Kenney.nl** — CC0, no attribution required. Primary source for sprites, UI,
  particles.
- **game-icons.net** — CC-BY 3.0. Requires credit. Good for spell/potion icons.
- **OpenGameArt.org** — filter to CC0 / CC-BY only.

When you add any asset pack, download it into `public/assets/` (do **not**
hotlink), then log it here with its author, source URL, and license. Any CC-BY
asset must also be surfaced in the in-game attribution footer
(`src/pages/Attribution.jsx`).

Example entry format:

```
- Kenney "Top-down Shooter" pack — CC0 — https://kenney.nl/assets/top-down-shooter
- "Broken heart" icon by Lorc — CC-BY 3.0 — https://game-icons.net/1x1/lorc/broken-heart.html
```

## Libraries

- **Phaser 3** — MIT License — https://phaser.io
- **React** — MIT License — https://react.dev
- **Vite** — MIT License — https://vite.dev
- **Tailwind CSS** — MIT License — https://tailwindcss.com
- **Firebase JS SDK** — Apache-2.0 License — https://firebase.google.com
