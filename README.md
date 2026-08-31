# OpenRNGdle

An open-source clone of [RNGdle](https://www.rngdle.com) — a daily browser game
about making one random number feel meaningful. Once a day you roll a number
from 0 to 1,000,000, and it gets checked against a big library of numeric
patterns (palindromes, primes, repeated digits, meme numbers, math constants,
digit shapes, and more) for badges and EP (experience points).

Static HTML/CSS/JS, no build step, no backend — everything runs client-side
with `localStorage` for state.

> **Unofficial fan project.** OpenRNGdle is not affiliated with, endorsed by,
> or connected to RNGdle or its creators. It's meant for situations where
> rngdle.com itself isn't reachable — offline, air-gapped, or otherwise
> restricted networks — not as a replacement or competitor. It collects no
> account information, no personal data, and makes no network requests at
> all; the only thing it stores is your local `localStorage` roll history, on
> your own device.

## Changes

Notable decisions and revisions made while building this, for anyone
comparing behavior against the real RNGdle or an earlier version of this repo:

- **Daily roll resets at local midnight**, not UTC.
- **Badge digit-highlighting is an approximation, not a byte-exact port.**
  Substring/suffix/single-digit badges highlight the exact digits responsible;
  whole-number properties (primality, digit sum, distinct-digit count, etc.)
  highlight every digit, since the property depends on all of them. A handful
  of the more intricate badges (consecutive-integer splits, Mountain/Valley
  pivots) use a reasonable interpretation of the stated rule rather than
  chasing pixel-for-pixel parity with rngdle.com's own highlighting.
- **Roll tiers are percentile-driven**, computed by actually scanning all
  1,000,001 possible rolls (`scripts/gen-percentiles.js`) rather than
  estimating — matching how the real game computes "Top X%" rather than a
  curve-fit approximation.
- **The roll itself plays a slot-machine-style reveal**: digits flicker every
  0.05s, linger for ~3s, then lock in left-to-right about 1.2s apart. Rolls
  shorter than 6 digits visibly shrink (leading slots drop out) rather than
  padding with zeros. Badges and EP then cascade in, paced by rarity tier,
  with lifetime EP ticking up live alongside the roll's own total.
- **A previously-rolled result restores instantly on reload** — the
  animation and staggered reveal only play once, right when you roll; coming
  back to an already-completed day's result skips straight to the final
  state.
- **Share text mirrors the real game's format** (roll, tier line, top 3
  badges, "+N more", EP total) rather than a plain summary, but omits a link
  since this project isn't hosted anywhere.
- **Roll streaks**, tracked across local calendar days (not added by the real
  RNGdle's own scoring, but a natural fit for a daily-roll game). A streak
  survives the day right after your last roll — you still have until local
  midnight to extend it — but has lapsed if you go a full day without
  rolling; your longest streak is kept separately and never decreases.
- **`config.js`** holds site-level settings — currently just
  `streak_grace_days`, how many consecutive missed days a streak forgives
  before breaking. It's a flat count rather than tied to weekends, so it
  covers irregular schedules too (e.g. 4-on-3-off), not just a Mon–Fri work
  week (set it to 2 for that). Defaults to 0 (must roll every day); edit the
  file and reload to change it.

## Provenance

The real badge names, EP values, rarity thresholds, and family groupings are
sourced from a community reverse-engineering project
([CubityFirst/rngdle-ep-calculator](https://github.com/CubityFirst/rngdle-ep-calculator))
that documented the live game's public badge economy. That repository carries
no license, so OpenRNGdle reuses only those facts — the pattern-matching logic
in `badges.js` is an independent implementation written from each badge's
stated rule, not copied code.

## License

[MIT](LICENSE)
