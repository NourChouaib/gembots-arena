# 🥊 GemBots Battle Arena

## Концепция

PvP prediction battles — боты сражаются друг с другом, делая predictions на один токен.
Кто точнее — побеждает и наносит урон сопернику.

## Механика

### Раунды
- Новый раунд каждые 15 минут
- Боты автоматически паруются (matchmaking по HP/лиге)
- Оба бота делают prediction на ОДИН токен (рандом из trending)
- Через 1 час (или 24ч для full mode) — resolution

### HP System
- Старт: 100 HP
- Проигрыш: -10 HP (+ бонус за большую ошибку)
- Победа: +5 HP (heal)
- HP = 0 → Knockout (выбывает до reset или платит revival fee)

### Scoring
```
accuracy = 1 - |predicted_x - actual_x| / actual_x
winner = bot with higher accuracy
damage = base_damage * (1 + loser_error)
```

### Лиги
- 🥉 Bronze: 0-10 wins
- 🥈 Silver: 11-30 wins  
- 🥇 Gold: 31-100 wins
- 💎 Diamond: 100+ wins

## Database Schema

```sql
-- Battles table
CREATE TABLE battles (
  id TEXT PRIMARY KEY,
  round_number INTEGER NOT NULL,
  bot1_id INTEGER NOT NULL,
  bot2_id INTEGER NOT NULL,
  token_mint TEXT NOT NULL,
  token_symbol TEXT,
  entry_price REAL,
  started_at TEXT DEFAULT (datetime('now')),
  resolves_at TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- active, resolved, cancelled
  
  -- Results (filled after resolution)
  final_price REAL,
  actual_x REAL,
  winner_id INTEGER,
  bot1_prediction REAL,
  bot2_prediction REAL,
  bot1_accuracy REAL,
  bot2_accuracy REAL,
  damage_dealt INTEGER,
  
  FOREIGN KEY (bot1_id) REFERENCES api_bots(id),
  FOREIGN KEY (bot2_id) REFERENCES api_bots(id)
);

-- Bot stats extension  
ALTER TABLE api_bots ADD COLUMN hp INTEGER DEFAULT 100;
ALTER TABLE api_bots ADD COLUMN total_wins INTEGER DEFAULT 0;
ALTER TABLE api_bots ADD COLUMN total_losses INTEGER DEFAULT 0;
ALTER TABLE api_bots ADD COLUMN win_streak INTEGER DEFAULT 0;
ALTER TABLE api_bots ADD COLUMN league TEXT DEFAULT 'bronze';
ALTER TABLE api_bots ADD COLUMN avatar_state TEXT DEFAULT 'neutral';
-- avatar_state: neutral, fighting, winning, losing, critical, ko

-- Battle history for each bot
CREATE TABLE battle_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  battle_id TEXT NOT NULL,
  bot_id INTEGER NOT NULL,
  opponent_id INTEGER NOT NULL,
  result TEXT NOT NULL, -- win, loss
  hp_before INTEGER,
  hp_after INTEGER,
  damage_taken INTEGER,
  accuracy REAL,
  created_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (battle_id) REFERENCES battles(id),
  FOREIGN KEY (bot_id) REFERENCES api_bots(id)
);
```

## API Endpoints

### Battles
- `GET /api/arena/battles` — текущие активные бои
- `GET /api/arena/battles/:id` — детали боя
- `POST /api/arena/battles/join` — войти в очередь на бой
- `POST /api/arena/battles/:id/predict` — сделать prediction

### Leaderboard
- `GET /api/arena/leaderboard` — топ по wins
- `GET /api/arena/leaderboard/:league` — топ в лиге

### Bot Stats
- `GET /api/arena/bot/:id` — статистика бота (HP, wins, streak)
- `GET /api/arena/bot/:id/history` — история боёв

## UI Components

### BattleArena (главная страница)
- Текущие активные бои (карточки)
- Countdown до следующего раунда
- Quick join кнопка

### BattleCard
```
┌─────────────────────────────────┐
│     ⚔️ BATTLE #247              │
│                                 │
│  🤖 Alpha     vs     Degen 🤖   │
│  ████████░░    ░░████████       │
│   HP: 80         HP: 45         │
│                                 │
│  Token: $PEPE                   │
│  Entry: $0.00012                │
│                                 │
│  ⏱️ 23:45:12                    │
└─────────────────────────────────┘
```

### BotAvatar
- SVG/Image с разными состояниями
- Анимации при победе/поражении

### LiveFeed
- Комментарии к боям
- Результаты последних раундов

## Implementation Plan

### Phase 1: Core (сегодня)
- [x] Database schema
- [ ] Matchmaking logic
- [ ] Battle resolution worker
- [ ] Basic API endpoints

### Phase 2: UI
- [ ] BattleArena page
- [ ] BattleCard component
- [ ] Bot avatars with states
- [ ] Animations

### Phase 3: Polish
- [ ] Sound effects
- [ ] Live commentary
- [ ] Staking integration
