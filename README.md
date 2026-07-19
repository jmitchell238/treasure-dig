# Treasure Dig

Tap sand tiles to dig up shells, stars, and beach treasures. Soft minesweeper energy **without bombs**. Built for ages **4–6**.

**Play:** https://jmitchell238.github.io/treasure-dig/

Part of [Arcade Hub](https://jmitchell238.github.io/arcade-hub/).

---

## Modes

| Mode | Grid | Treasures | Boards |
|------|------|-----------|--------|
| **Free Dig** | 4×4 | 4 | Endless |
| **Beach Day** | 4×5 | 5 | 4 |
| **Deep Dig** | 5×5 | 7 | 6 |
| **Treasure Pro** | 5×6 | 9 | 8 |

## Features

- Beach sandbox grid — dig sand piles
- Treasures: shell, star, crab, coin, pearl, anchor, fish, gem
- Empty tiles say “Almost!” — never punish
- Soft sparkle trail after ~7s idle
- Sound mute + reduced motion
- Progress in `localStorage`
- Installable PWA

## Stack

Static HTML / CSS / Canvas. No build step.

## Versioning

- `GAME_VERSION` in `js/config.js`
- Keep `CACHE` in `sw.js` in sync: `'treasure-dig-' + GAME_VERSION`

## Local preview

```bash
python3 -m http.server 8080
```

## Parents

- No lives, ads, accounts, fail screens, or bombs
- Wrong digs are soft sand only
- **Calm motion** for sensitive kids

## License

Personal project for family Arcade Hub.
