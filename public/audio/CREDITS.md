# Sound pack credits

These files back the "Sound pack" option in Settings (the alternative to the
game's built-in procedurally-generated audio). All are free to use here,
including commercially, under their original licenses; none require this
project to be non-commercial.

All source files were trimmed, downmixed to mono, and gain-adjusted to match
this game's existing mix — the sounds themselves are unmodified performances/
recordings from the original authors.

## CC0 (public domain, no attribution required)

- **Kenney** (kenney.nl) — Interface Sounds, RPG Audio, Impact Sounds, Digital
  Audio packs.
  Used for: `sfx_ui_click`, `sfx_ui_hover`, `sfx_footstep`, `sfx_interact`,
  `sfx_door`, `sfx_tv_off`, `sfx_bang`, `sfx_elevator_ding`.
- **Fupicat / Freesound** — ["Busy Office No People Loop"](https://freesound.org/people/Fupicat/sounds/534123/).
  Used for: `sfx_office_ambience`.
- **qubodup / OpenGameArt** — ["Rain (loopable)"](https://opengameart.org/content/rain-loopable).
  Used for: `sfx_rain`, `sfx_rain_glass`.
- **OpenGameArt contributor** — ["wind1"](https://opengameart.org/content/wind1).
  Used for: `sfx_wind`.
- **OpenGameArt contributor** — ["Frequency Static Sound Effects"](https://opengameart.org/content/frequency-static-sound-effects).
  Used for: `sfx_tv_hum`.
- **OpenGameArt contributor** — ["Zombies Sound Pack"](https://opengameart.org/content/zombies-sound-pack)
  (made for the FOSS RPG *Summoning Wars*).
  Used for: `sfx_groan`.
- **Juhani Junkala** — ["Post Apocalyptic Wastelands (Loop Ready)"](https://opengameart.org/content/horror-atmosphere).
  Used for: `music_menu`.

## In-house (not third-party — made for this project)

- `sfx_talk_blip.wav` — the "pack" variant of the dialogue voice blip.
  There's no single third-party recording behind this one: it's a second,
  more textured render of the same idea as the live-generated version
  (see `synth.ts`'s `synthTalkBlip()`), baked offline in Python/numpy for
  extra grain. No attribution needed since it's original work, but noted
  here so this file stays an accurate map of what came from where.

Not currently sourced (still uses the generated sound in both modes):
`sfx_car_engine`, `sfx_drip`, `music_tension`.
