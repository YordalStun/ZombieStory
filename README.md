# Zombie Story

A top-down pixel-art survival game for the browser. You play Danny, a young
man whose ordinary morning routine is the last normal thing that happens to
him for a while.

This repo is the **foundation**: engine, art/audio pipeline, lighting, and
the opening slice (falling asleep to the news, waking up, getting ready,
driving off) — built to be extended into a much bigger game, not a one-off
demo.

## Running it

```
npm install
npm run dev       # dev server with hot reload, http://localhost:5173
npm run build     # typecheck + production build to dist/
npm run typecheck # tsc --noEmit only
```

Requires a browser with WebGL (used for the lighting pipeline — see below).

## What's playable right now

Main Menu → New Game → a silent, dark bedroom lit only by a flickering TV
playing a breaking-outbreak news broadcast → the player falls asleep → a
harsher morning broadcast → you gain control → free-roam the apartment
(bedroom, bathroom, kitchen), interact with the TV, dresser, sink, kitchen
counter, light switches, and keys → walk out to the driveway and get in the
car, which ends the current slice and returns to the menu (progress is
saved, so "Continue" resumes right at the morning free-roam).

## Stack

- **Vite + TypeScript** for tooling/build.
- **Phaser 3** (WebGL) for the game world: tilemap, sprites, physics
  (Arcade), and the **Light2D** lighting pipeline.
- **No external game art or audio files.** Every sprite is drawn at boot
  with the Canvas 2D API (`src/gfx/`), and every sound is synthesized with
  the Web Audio API (`src/core/audio/synth.ts`). This is intentional —
  Claude can write code but can't paint real pixel art or compose music.
  Swapping in real assets later is meant to be a drop-in job (see
  "Swapping in real art/audio" below).
- **Plain DOM/CSS for all UI text** (dialogue box, menus, HUD) instead of
  Phaser Text objects. The game world renders at a small internal
  resolution (480×270) and gets scaled up with crisp/pixelated scaling for
  the chunky-pixel look — but text rendered *inside* that same small
  canvas would scale up right along with it and go blurry/blocky. Instead
  the DOM layer sits on top of the canvas, kept pixel-aligned with it on
  every resize (`src/ui/dom/UIRoot.ts`), and renders text at full browser
  resolution regardless of how small the game world's canvas is.

## Project layout

```
src/
  main.ts                    Entry point: creates the Phaser.Game, boots the DOM UI layer
  config/constants.ts        Resolution, tile size, depth/z-order table, save keys, story flags
  styles.css                 Page/canvas chrome (not game UI — see ui/dom/ui.css)

  core/
    EventBus.ts               Single event emitter used for all Phaser-scene <-> DOM-UI communication
    SceneKeys.ts               Scene key constants
    managers/
      LightingManager.ts       Wraps Phaser's Light2D: named/toggleable lights, organic flicker,
                                and getLightLevelAt(x,y) — a reusable "how lit is this point"
                                query meant for a future stealth/detection system, not just the HUD
      AudioManager.ts           Procedural SFX/music playback, volume categories, looping beds
      SaveManager.ts             localStorage settings + checkpoint/flag persistence
      ObjectiveManager.ts         Single current objective string, shown in the HUD
    audio/synth.ts               Web Audio synthesis (tones, filtered noise, pads) -> AudioBuffer
    dialogue/
      DialogueTypes.ts            DialogueLine / DialogueScript shape
      DialoguePlayer.ts            Drives a script to completion via EventBus; DOM just renders
    entities/Player.ts             Arcade Physics sprite: movement, facing, walk anim, footsteps
    level/TileGrid.ts               Code-first tilemap builder (rooms, doorway cuts) — no Tiled
                                     available in this environment, so levels are authored in code

  gfx/                         Procedural placeholder art (all Canvas2D, run once at boot)
    palette.ts                   Shared color palette
    canvasUtils.ts                 rect/outline/speckle helpers
    tileset.ts                     Floor/wall/window/driveway/grass tile atlas + TILE index constants
    props.ts                       Furniture/prop sprites + their native sizes
    playerSpriteGen.ts              Player sprite frames (4 directions x idle/walk, 2 outfits) + anims
    backdrop.ts                     Main menu skyline backdrop

  data/
    levels/apartmentLevel.ts       The one level so far: tile layout + prop placement, built with TileGrid
    dialogue/
      newsBroadcast.ts              Night/morning TV broadcast scripts
      routineLines.ts                 Flavor lines for interacting with dresser/sink/counter/etc.

  scenes/
    BootScene.ts / PreloadScene.ts    Generate all textures + bake all audio, then go to the menu
    MainMenuScene.ts                    Atmospheric backdrop + wires DOM menu buttons to game actions
    ApartmentScene.ts                    The whole playable level: night cutscene, sleep transition,
                                          morning routine, interactions, lighting, checkpointing

  ui/dom/                       All on-screen text/UI, as real DOM elements over the canvas
    UIRoot.ts                     Builds the DOM skeleton, keeps it pixel-aligned with the canvas
    DialogueBoxUI.ts               Bottom text box: typewriter reveal, click/Space/E to advance
    HUDUI.ts                        Objective text, light-level indicator, floating interact prompts
    MenuUI.ts                        Main menu, settings, loading, end-of-slice screens
    FadeUI.ts                        Fullscreen fade to/from black (covers canvas + DOM alike)
    ui.css                           All UI styling
```

## Engine concepts worth knowing before extending this

**Scenes vs. the DOM layer.** Phaser scenes own game state and the pixel-art
world. They never touch text directly — they call `EventBus.emit(...)` (or
the small dialogue/HUD helper APIs) and the DOM layer reacts. Going the
other way, DOM buttons emit events (`Events.MENU_NEW_GAME`, etc.) that a
scene listens for. This keeps "crisp text at any resolution" free — nothing
Phaser draws needs to be legible text.

**Lighting is real, not faked.** `LightingManager` sits on top of Phaser's
Light2D pipeline. Any sprite or tile layer that should react to light needs
`lighting.makeLit(obj)` called on it once. Point lights are added with
`lighting.addLight(id, x, y, radius, color, intensity, flickerConfig?)` and
can be toggled with `setEnabled(id, bool)` (see the bathroom/kitchen light
switches for a working example) or repositioned/removed. `getLightLevelAt`
is the one to reuse for anything gameplay-relevant later — e.g. "can this
zombie see the player" is the same query as "should the HUD say IN THE
LIGHT," just with a different threshold and caller.

**Levels are code, not a Tiled file.** There's no map editor available in
this environment, so `TileGrid` (rectangular rooms + doorway cuts) is the
level-authoring tool. If you later use Tiled locally, its JSON export is a
drop-in replacement for `buildApartmentLevel()`'s `{ tiles, props }` output
— nothing else in `ApartmentScene` needs to change.

**Depth/y-sorting.** See `DEPTH` in `config/constants.ts`. Floor and walls
use fixed depths; the player and every solid prop use
`ACTOR_SORT_BASE + worldY`, so they naturally sort against each other by
vertical position without any manual layering.

**Checkpoints.** `SaveManager` persists two independent things in
`localStorage`: settings (volumes, fullscreen — always loaded) and progress
(a `Checkpoint` string + a flag bag). Right now there are two checkpoints,
`NIGHT_CUTSCENE` and `MORNING_ROUTINE`; "Continue" just starts
`ApartmentScene` with whichever checkpoint was last saved. Adding a new
checkpoint later is: add it to the `Checkpoint` type, save it at the right
moment, and branch on it in `ApartmentScene.create()`.

## Swapping in real art/audio

Nothing outside `gfx/` and `core/audio/synth.ts` knows or cares that the
art/audio is procedural — everything else just references texture/sound
keys (`PropTex.TV_ON`, `SfxKey.FOOTSTEP`, etc.). To use real assets:

- **Art**: load real images in `PreloadScene` under the *same* keys instead
  of calling the `generate*` functions (or alongside them, keeping the
  procedural versions as a fallback). A tileset needs to stay a single
  image sliced at `TILE_SIZE` so `addTilesetImage` keeps working.
- **Audio**: load a real file into `scene.cache.audio` under the same
  `SfxKey`/`MusicKey` value instead of calling the matching `synth*`
  function in `AudioManager.init`.

## What's deliberately not built yet

This is a foundation, not a full game — the obvious next layers (not
started): an inventory system, a day/night/calendar clock, NPCs, the
zombies themselves and any AI/combat, a real quest system (there's only a
single `ObjectiveManager` string right now), and a scene for the drive to
work. The architecture (managers, EventBus, DEPTH-based sorting, the
lighting query) was written with these in mind, but none of them exist yet.
