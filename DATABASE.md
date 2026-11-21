# MAFFIN BINGO — Database structure

Storage: browser `localStorage` (offline, on the device). Three keys:

| Key | Content |
|---|---|
| `maffin.v1` | settings + all games (JSON) — rewritten after every action |
| `maffin.v1.prev` | the previous version of `maffin.v1` (automatic safety copy; used if the main key is ever corrupt) |
| `maffin.v1.cards` | the card pool (JSON array) — only appended to |

### Settings (`maffin.v1 → settings`)
`lang` en/am · `theme` dark/light · `pinHash`, `salt`, `recHash` (salted SHA-256 of PIN / recovery code — the PIN itself is never stored) · `price` (ETB, ≥ 20) · `commission` (%, 0–90) · `voiceOn`, `voiceLang`, `volume`, `rate`, `sfx`, `autoSecs`, `lastBackup`.

### Card — `{ id, n }`
`id` unique, sequential integer (never reused) · `n` 25 numbers, row-major, centre (index 12) = 0 = FREE. Column ranges B 1–15, I 16–30, N 31–45, G 46–60, O 61–75, no duplicates in a card. No two cards have the same number layout.

### Game
```
id            "G-YYYYMMDD-NNN" unique
createdAt, startedAt, endedAt    timestamps (ms)
status        upcoming | active | completed | cancelled
price         ETB per card, frozen when the game is created
commission    % frozen when the game is created
sales[]       { id, player, phone, cardIds[], at }
called[]      numbers in the order they were called (1–75, no repeats)
winner        null | { cardId, player, phone, patterns[], at, prize, atCall }
cancelReason  text
resets[]      audit log of "restart draw" actions (old called list kept)
```
Derived (not stored): `cardsSold`, `revenue = sold × price`, `commission = revenue × %`, `prize = revenue − commission`.

### Backup file
`{ app:"MAFFIN BINGO", v:1, exportedAt, data:<maffin.v1>, cards:<card pool> }` — a plain JSON file.

### Protection rules
Games can never be deleted — only *cancelled* (needs PIN). Completed/cancelled games are read-only. Card sales lock when a game starts. Restoring a backup needs the PIN and keeps the previous data in `maffin.v1.prev`.
