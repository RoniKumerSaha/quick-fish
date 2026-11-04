# 🐟 Pixel Fishing — One More Cast!

A tiny, addictive pixel-art fishing game. Cast a rod, catch fish of increasing
rarity, sell them at the market, upgrade your gear, and work your way down to
the Abyss where the really strange things live.

Everything you see and hear is generated in code — there are **no image or
audio assets** in this repository. The sprites are character grids, the fish
are painted parametrically, the font is a bitmap table, and the music is a
generative pentatonic loop.

## Running it

```bash
npm start       # serves on http://localhost:5173
```

`tools/serve.js` is a zero-dependency static file server; any static server
works just as well. The game itself has **no runtime dependencies** — open
`index.html` from a server and it runs.

## Deploying

The game is a static site, so it deploys anywhere that can serve files.

```bash
npm run build     # stages the site into public/
npm run preview   # serves public/ on http://localhost:5173
```

`build.js` does not transpile anything — the game is already plain ES
modules the browser runs as-is. It only copies `index.html` and `src/` into
`public/`, the directory the host publishes.

**Vercel** works out of the box: `vercel.json` sets the build command to
`npm run build` and the output directory to `public`. Without that file
Vercel guesses the project is a Node server, runs `npm start` as the build
step, and the build hangs on the dev server instead of producing output.

**GitHub Pages / Netlify / Cloudflare Pages**: set the build command to
`npm run build` and the publish directory to `public`.

The `.js` files are served with the correct `text/javascript` content type,
which is required for the browser to accept them as ES modules.

## Controls

| Action | Key |
| --- | --- |
| Cast / confirm | `Space` or click |
| Reel in (hold) | hold `Space` or hold the mouse button over the water |
| Upgrades | `U` |
| Fish market | `S` |
| Collection book | `C` |
| Travel | `M` |
| Statistics | `Tab` |
| Close a panel | `Esc` |

## The core loop

**Cast → Catch → Sell → Upgrade → Explore → Repeat**

1. **Cast.** Press `Space`. The bobber lands and the line waits for a bite.
2. **Hook.** When the bobber dips, press `Space` in the bite window to set the
   hook. Miss it and the fish is gone.
3. **Reel.** Hold to reel. A tension gauge fills as you hold; let go and it
   eases. Keep the marker inside the green safe zone — too high and the line
   snaps, too low and the fish wears you down. The fish periodically surges.
4. **Sell.** Your catch lands in the basket. Open the market (`S`) and sell it.
5. **Upgrade.** Spend coins on Rod, Line, Bait, Boat and Fish Finder.
6. **Explore.** Travel to new locations once you have the coins *and* the gear.

### Bait

Bait is a consumable. Every cast uses one, and bait level boosts your odds of
pulling something better than a mackerel. Buy more at the market (`S`).

### Gear gates

Locations are gated on both coins and gear. Reaching The Abyss needs Boat 4,
Rod 3, Line 3 and Bait 3 — you cannot simply rush there with money, and
without the right gear you will not even be able to land the fish that live
there.

### Locations

| Location | Unlock |
| --- | --- |
| Sunny Bay | — |
| Rocky Shore | 1200 coins, Boat 1, Rod 1, Line 1 |
| Deep Ocean | 4500 coins, Boat 2, Rod 2, Line 2, Bait 1 |
| Coral Reef | 14000 coins, Boat 3, Rod 2, Line 2, Bait 1 |
| The Abyss | 20000 coins, Boat 4, Rod 3, Line 3, Bait 3 |

### Jokes

67 species are in the game, and not all of them are fish. There is an old
shoe. A fish that steals your bait. A bottle with a note in it. A golden
toilet seat, which is genuinely legendary.

## Saving

Progress autosaves to `localStorage` (debounced, plus a save on page unload).
The save is schema-versioned and migrated on load, and unknown or invalid
values are pruned rather than crashing the game. Use `wipeSave()` in
`src/game/state.js` to reset.

## Project layout

```
index.html            canvas host + boot overlay
build.js              stages the site into public/ for static hosting
vercel.json           Vercel build + output config
tools/
  serve.js            zero-dependency static file server (dev only)
src/
  main.js             boot: canvas, input, audio, loop
  engine/
    font.js           5x7 bitmap font (glyph table -> fillRect runs)
    gfx.js            rect/frame/panel/bar/sprite helpers
    input.js          keyboard + mouse, edge-triggered presses
    audio.js          WebAudio SFX and generative music
    display.js        sizes the canvas to the window at device pixel ratio
    view.js           the live viewport (logical size, reference scale)
    loop.js           fixed-timestep loop
  game/
    content.js        all tuning data: fish, tiers, locations, upgrades
    state.js          save/load, migration, unlock rules
    fishing.js        the session state machine and tension minigame
    screens.js        screen flow and per-screen render/handling
  render/
    sprites.js        procedural sprites and the fish painter
    scene.js          sky, water, waves, scenery, the angler
    ui.js             HUD, panels, popups, the collection book
```

## Rendering

The canvas fills the browser tab with no letterbox frame. It is sized to the
window in CSS pixels and backed at the device pixel ratio, so the vector art
stays sharp on any screen. The logical viewport (`src/engine/view.js`) is a
live binding that every layout module imports, so a window resize is picked up
automatically. The scene itself is authored against a **960×540** reference
frame and scaled to fit whatever space is available, so proportions hold on
any window shape.

Simulation runs at a fixed 1/60s timestep with a clamped delta, so behaviour
does not change with frame rate.

## License

MIT
