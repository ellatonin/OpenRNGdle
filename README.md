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

## Changes/Notes

Notable decisions and revisions made while building this, for anyone
comparing behavior against the real RNGdle or an earlier version of this repo:

- **Daily roll resets at local midnight**, not UTC.
- **Badge digit-highlighting is an approximation**, not a byte-exact port.
- **Roll tiers are percentile-driven**, computed by actually scanning all
  1,000,001 possible rolls.
- **Roll streaks**, tracked across local calendar days.
- **`config.js`** holds site-level settings

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
