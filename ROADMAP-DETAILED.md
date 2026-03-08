# 🤖 GemBots — Детальный план развития

> **Дата:** 2026-02-08  
> **Статус:** Phase 1 завершена, готовимся к Phase 2  
> **Сайт:** https://gembots.space  
> **Stack:** Next.js 16 + Supabase + Framer Motion + Solana + PM2

---

## 📋 Оглавление

1. [Текущее состояние проекта](#-текущее-состояние-проекта)
2. [Оптимальная длина битвы](#-оптимальная-длина-битвы)
3. [Визуальные WOW-эффекты](#-визуальные-wow-эффекты)
4. [Геймификация](#-геймификация)
5. [UI/UX улучшения](#-uiux-улучшения)
6. [Battle Page Redesign](#-battle-page-redesign)
7. [Social Features](#-social-features)
8. [Telegram Mini App](#-telegram-mini-app)
9. [Монетизация](#-монетизация)
10. [Фазы реализации](#-фазы-реализации)

---

## 📊 Текущее состояние проекта

### Что уже работает (Phase 1):

| Фича | Статус | Файл/Компонент |
|-------|--------|-----------------|
| Два режима: Human / Bot | ✅ | `src/app/page.tsx` — `Step` type |
| 5 стратегий (Trend, Whale, Chaos, Mean Reversion, Smart AI) | ✅ | `src/lib/strategies.ts` |
| Guest mode (без кошелька) | ✅ | `getGuestId()` в `page.tsx` |
| LiveBattleCard (countdown, simulated price, winning highlight) | ✅ | `src/components/LiveBattleCard.tsx` |
| BattleResult (victory/defeat с confetti) | ✅ | `src/components/BattleResult.tsx` |
| WinAnimation (canvas-confetti) | ✅ | `src/components/WinAnimation.tsx` |
| Auto-matchmaker (каждые 30с) | ✅ | `scripts/auto-matchmaker.js` |
| Battle resolver (каждые 10с) | ✅ | `scripts/battle-resolver.js` |
| Bot API (register, predict, battles) | ✅ | `src/app/api/v1/bot/*` |
| Leaderboard | ✅ | `src/app/leaderboard/page.tsx` |
| Arena page (WebSocket, live chart) | ✅ | `src/app/arena/page.tsx` + `components/arena/*` |
| Create Challenge + Join | ✅ | `CreateChallengeModal.tsx`, `ChallengeModal.tsx` |
| Toast notifications | ✅ | `src/components/Toast.tsx` |
| Framer Motion transitions | ✅ | Везде AnimatePresence |
| Levels system (Newbie → Legend) | ✅ | `src/lib/levels.ts` |

### Что НЕ работает / отложено:

| Фича | Статус | Проблема |
|-------|--------|----------|
| ELO рейтинг | ❌ | Не реализован |
| Реальные SOL ставки | ❌ | Deposit pool не сделан |
| Мобильная адаптивность | ⚠️ | Частично (не протестировано) |
| Звуковые эффекты | ❌ | Полностью отсутствуют |
| Streaks / Achievements | ❌ | Не реализованы |
| Live price graph в бою | ⚠️ | Есть `LiveChart.tsx` в arena, но в battle — нет |
| HP visual | ⚠️ | Только число, нет HP bar |
| Telegram Mini App | ❌ | Не начато |

### Текущие баги:

- ⚠️ Supabase schema gaps: `battles` не имеет `bot1_name`, `bot2_name`, `bot1_wallet`, `bot2_wallet`, `stake_amount`, `finished_at`
- ⚠️ `bots` не имеет `is_active`, `strategy`
- ⚠️ LiveBattleCard симулирует цену фейково (`Math.random()`), не реальные данные
- ⚠️ Battle resolver использует `priceChange5m` как прокси для actual_x

---

## ⏱ Оптимальная длина битвы

### Анализ текущей ситуации

Сейчас: **60 секунд** (hardcoded в `auto-matchmaker.js`: `Date.now() + 60000`, и `battle-resolver.js` проверяет `resolves_at`).

| Длительность | Pros | Cons | Для кого |
|-------------|------|------|----------|
| **15-30с** | Быстрый дофамин, много боёв/час, mobile-friendly | Нет времени наблюдать, нет драмы, рандомно | Casual scrollers, TikTok-аудитория |
| **60с** | Достаточно для наблюдения, быстрый turnaround | Маловато драмы, цена не успевает показать тренд | Текущий стандарт |
| **2-3 мин** | Настоящая драма, lead changes, больше данных для стратегий | Может быть скучно без контента на экране | Engaged users, spectators |
| **5+ мин** | Максимальная точность стратегий, реальный рынок | Слишком долго для casual, внимание теряется | Hardcore / tournaments |

### 📌 Рекомендация: **Три режима длительности**

```
┌─────────────────────────────────────────────────────┐
│  ⚡ Quick Battle    │  30 секунд  │  Free only       │
│  ⚔️ Standard Battle │  60 секунд  │  Free + Stakes    │
│  🔥 Epic Battle     │  3 минуты   │  Stakes only      │
└─────────────────────────────────────────────────────┘
```

**Обоснование:**
1. **Quick (30с)** — для мобильных пользователей и telegram. "Залетел, кнопку нажал, результат получил". Идеально для привлечения. Бесплатный только — порог входа ноль.
2. **Standard (60с)** — текущий основной режим. Работает. Не трогаем.
3. **Epic (3 мин)** — premium experience. Больше драмы, lead changes, повышенные ставки. Создаёт ощущение "важного матча". Только для стейков — повышает ценность.

**Реализация:**
- В `auto-matchmaker.js` добавить `battle_duration` поле в rooms/battles
- Room creator выбирает режим при создании
- `resolves_at = Date.now() + duration_ms`
- LiveBattleCard уже поддерживает любой countdown (считает от `battle.countdown`)

**Специальные ивенты:**
- **Weekend Wars** — Epic battles × 2 rewards
- **Speed Demon Hour** — только Quick battles, X боёв за час
- **Tournament Finals** — Epic (5 мин) с bracket

---

## 🎆 Визуальные WOW-эффекты

### Текущий стек эффектов
- `framer-motion` — основные анимации (scale, opacity, y-transitions)
- `canvas-confetti` — конфетти при победе (`WinAnimation.tsx`)
- CSS — `animate-pulse` для статусов

### 2.1 Эффекты ВО ВРЕМЯ БОЯ

#### 🔄 Анимация цены (Price Pulse)

**Что:** Текущая цена (тот самый `{simulatedX.toFixed(2)}x` в `LiveBattleCard.tsx`) пульсирует и меняет размер при резких движениях.

**Сейчас:** Есть маленькая анимация `initial={{ scale: 1.1 }} animate={{ scale: 1 }}` при каждом обновлении.

**Улучшение:**
```tsx
// LiveBattleCard.tsx — улученная анимация цены
const priceChange = Math.abs(simulatedX - prevPrice);
const isVolatile = priceChange > 0.1;
const direction = simulatedX > prevPrice ? 'up' : 'down';

<motion.div
  className={`text-3xl font-black font-mono ${
    simulatedX >= 1.5 ? 'text-green-400' : 
    simulatedX <= 0.7 ? 'text-red-400' : 'text-cyan-400'
  }`}
  animate={{
    scale: isVolatile ? [1, 1.3, 1] : 1,
    textShadow: isVolatile 
      ? `0 0 20px ${direction === 'up' ? '#10b981' : '#ef4444'}` 
      : 'none',
  }}
  transition={{ duration: 0.3 }}
>
  {simulatedX.toFixed(2)}x
  {isVolatile && (
    <motion.span 
      className="text-sm ml-1"
      initial={{ opacity: 0, y: direction === 'up' ? 10 : -10 }}
      animate={{ opacity: [1, 0], y: direction === 'up' ? -20 : 20 }}
    >
      {direction === 'up' ? '📈' : '📉'}
    </motion.span>
  )}
</motion.div>
```

**Приоритет:** 🟢 Легко (1-2 часа) | Высокий WOW

---

#### 📳 Screen Shake (при приближении к prediction)

**Что:** Когда текущая цена приближается к prediction одного из ботов (разница < 5%), карточка начинает дрожать.

**Когда:** `Math.abs(simulatedX - bot.prediction) < 0.05`

```tsx
// В LiveBattleCard.tsx
const bot1CloseCall = Math.abs(simulatedX - battle.bot1.prediction) < 0.05;
const bot2CloseCall = Math.abs(simulatedX - battle.bot2.prediction) < 0.05;

<motion.div
  animate={
    (bot1CloseCall || bot2CloseCall) ? {
      x: [0, -2, 2, -2, 2, 0],
      transition: { duration: 0.4, repeat: Infinity, repeatDelay: 0.5 }
    } : {}
  }
>
  {/* card content */}
</motion.div>
```

**Приоритет:** 🟢 Легко (30 мин) | Средний WOW

---

#### 🎨 Dynamic Background Color

**Что:** Фон карточки боя плавно меняет оттенок в зависимости от того, кто побеждает.

**Как:**
```tsx
const winningColor = bot1Winning 
  ? 'from-green-900/10 to-emerald-900/10'   // Bot 1 — зелёный оттенок
  : 'from-red-900/10 to-orange-900/10';      // Bot 2 — красный оттенок

// При lead change — flash
const [leadJustChanged, setLeadJustChanged] = useState(false);
// Track previous winner, flash for 500ms on change
```

**Приоритет:** 🟢 Легко (1 час) | Средний WOW

---

#### 💓 Heartbeat Effect (countdown < 10с)

**Что:** Когда до конца боя осталось < 10 секунд, таймер начинает "стучать" как сердце. Размер увеличивается/уменьшается с нарастающей частотой.

**Сейчас:** Есть `isEnding = countdown <= 10` и `animate-pulse` — но это слабо.

```tsx
// Heartbeat timer
{isEnding && (
  <motion.span
    className="text-red-400 font-mono text-2xl font-black"
    animate={{
      scale: [1, 1.15, 1, 1.15, 1],
      opacity: [1, 1, 0.7, 1, 1],
    }}
    transition={{
      duration: Math.max(0.3, countdown / 20), // Ускоряется к концу
      repeat: Infinity,
    }}
  >
    {countdown}
  </motion.span>
)}
```

**Дополнительно:** Красная виньетка по краям карточки:
```tsx
{isEnding && (
  <motion.div 
    className="absolute inset-0 pointer-events-none rounded-xl"
    animate={{ 
      boxShadow: [
        'inset 0 0 30px rgba(239, 68, 68, 0.3)',
        'inset 0 0 60px rgba(239, 68, 68, 0.5)',
        'inset 0 0 30px rgba(239, 68, 68, 0.3)',
      ]
    }}
    transition={{ duration: 1, repeat: Infinity }}
  />
)}
```

**Приоритет:** 🟢 Легко (1 час) | Высокий WOW 🔥

---

#### 🔊 Sound Effects

**Что:** Звуки событий в бою.

| Событие | Звук | Триггер |
|---------|------|---------|
| Бой начался | Epic whoosh + "FIGHT!" | Battle status → active |
| Countdown tick (< 10с) | Tick-tock, ускоряющийся | `countdown <= 10 && countdown > 0` |
| Lead change | Swoosh + hit | `bot1Winning !== prevBot1Winning` |
| Price spike | Ka-ching / explosion | `priceChange > 0.2` |
| Battle end | Drum roll → result | `countdown === 0` |
| Victory | Triumphant fanfare | `result.won === true` |
| Defeat | Low bass + glass shatter | `result.won === false` |

**Реализация:**
```tsx
// src/lib/sounds.ts
class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;

  constructor() {
    // Preload sounds
    const soundFiles = {
      tick: '/sounds/tick.mp3',
      whoosh: '/sounds/whoosh.mp3',
      hit: '/sounds/hit.mp3',
      victory: '/sounds/victory.mp3',
      defeat: '/sounds/defeat.mp3',
      leadChange: '/sounds/swoosh.mp3',
      countdown: '/sounds/countdown.mp3',
      explosion: '/sounds/explosion.mp3',
    };
    
    Object.entries(soundFiles).forEach(([key, path]) => {
      const audio = new Audio(path);
      audio.preload = 'auto';
      this.sounds.set(key, audio);
    });
  }

  play(name: string, volume = 0.5) {
    if (!this.enabled) return;
    const sound = this.sounds.get(name);
    if (sound) {
      sound.volume = volume;
      sound.currentTime = 0;
      sound.play().catch(() => {}); // Ignore autoplay restrictions
    }
  }

  toggle() { this.enabled = !this.enabled; }
  get isEnabled() { return this.enabled; }
}

export const soundManager = new SoundManager();
```

**Где взять звуки:**
- [freesound.org](https://freesound.org) — бесплатные звуки (CC0)
- [mixkit.co](https://mixkit.co) — бесплатные game sounds
- Сгенерировать через jsfxr.frozenfractal.com (8-bit стиль)

**Приоритет:** 🟡 Средне (3-4 часа) | Очень высокий WOW 🔥🔥

---

### 2.2 Эффекты ПРИ ПОБЕДЕ

#### 🎊 Улученный Confetti Explosion

**Сейчас:** 20 emoji-"частиц" через framer-motion в `BattleResult.tsx` + `canvas-confetti` в `WinAnimation.tsx`. Два конкурирующих подхода!

**Улучшение:** Объединить. Использовать `canvas-confetti` как основной (уже есть в зависимостях):

```tsx
// При победе — трёхстадийный взрыв
import confetti from 'canvas-confetti';

function celebrateVictory(intensity: 'normal' | 'epic' | 'perfect') {
  // Stage 1: Начальный burst (0ms)
  confetti({
    particleCount: intensity === 'perfect' ? 200 : intensity === 'epic' ? 150 : 80,
    spread: 100,
    origin: { y: 0.6 },
    colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#9945FF'],
    gravity: 0.8,
  });

  // Stage 2: Side cannons (200ms)
  setTimeout(() => {
    confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.65 } });
    confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.65 } });
  }, 200);

  // Stage 3: Rain (500ms) — только для epic/perfect
  if (intensity !== 'normal') {
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 160,
        origin: { y: 0 },
        gravity: 1.5,
        ticks: 300,
        colors: ['#FFD700', '#FFC107'],
      });
    }, 500);
  }
}
```

**Приоритет:** 🟢 Легко (30 мин, рефактор) | Высокий WOW

---

#### 🏆 "VICTORY" / "DEFEAT" анимация

**Сейчас:** В `BattleResult.tsx` есть базовая анимация: emoji крутится, текст fade-in. Неплохо, но можно лучше.

**Победа — улучшение:**
```tsx
// Текст "VICTORY" с золотым свечением
<motion.h1
  className="text-6xl font-black text-transparent bg-clip-text 
             bg-gradient-to-r from-yellow-300 via-yellow-500 to-orange-500"
  initial={{ scale: 0, rotate: -10, opacity: 0 }}
  animate={{ 
    scale: [0, 1.3, 1], 
    rotate: [10, -5, 0],
    opacity: 1,
    textShadow: [
      '0 0 0px rgba(255,215,0,0)',
      '0 0 40px rgba(255,215,0,0.8)',
      '0 0 20px rgba(255,215,0,0.4)',
    ]
  }}
  transition={{ 
    duration: 0.8, 
    type: 'spring', 
    bounce: 0.4 
  }}
>
  ⚡ VICTORY ⚡
</motion.h1>
```

**Поражение — эффект разбитого стекла:**
```tsx
// Glass shatter effect — CSS-based
<motion.div className="relative">
  <motion.h1
    className="text-6xl font-black text-red-500"
    initial={{ scale: 1, opacity: 1 }}
    animate={{ 
      scale: [1, 1.05, 1],
      opacity: 1,
    }}
  >
    DEFEAT
  </motion.h1>
  
  {/* Cracks overlay */}
  <motion.div
    className="absolute inset-0 pointer-events-none"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.3 }}
    style={{
      backgroundImage: 'url(/images/crack-overlay.png)',
      backgroundSize: 'cover',
      mixBlendMode: 'overlay',
    }}
  />
  
  {/* Red flash */}
  <motion.div
    className="fixed inset-0 bg-red-600 pointer-events-none z-40"
    initial={{ opacity: 0.6 }}
    animate={{ opacity: 0 }}
    transition={{ duration: 0.5 }}
  />
</motion.div>
```

**Приоритет:** 🟢 Легко (2 часа) | Высокий WOW

---

#### ❤️ HP Bar анимация (Damage Dealt)

**Что:** Показать визуально сколько HP потерял проигравший.

**Сейчас:** HP отображается только как число (`HP: 100/100`) в bot dashboard.

```tsx
// Animated HP bar в BattleResult
function HPBar({ current, max, damage, isWinner }: { current: number; max: number; damage: number; isWinner: boolean }) {
  const percent = (current / max) * 100;
  const damagePercent = (damage / max) * 100;
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span>{isWinner ? '💪 Your HP' : '💀 Opponent HP'}</span>
        <span>{current}/{max}</span>
      </div>
      <div className="h-4 bg-gray-800 rounded-full overflow-hidden relative">
        {/* Damage flash (shows original HP, then drains) */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-red-500/50"
          initial={{ width: `${percent + damagePercent}%` }}
          animate={{ width: `${percent}%` }}
          transition={{ delay: 0.5, duration: 1, ease: 'easeInOut' }}
        />
        {/* Current HP */}
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${
            percent > 50 ? 'bg-green-500' : percent > 25 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          initial={{ width: `${percent + damagePercent}%` }}
          animate={{ width: `${percent}%` }}
          transition={{ delay: 1, duration: 0.8, ease: 'easeInOut' }}
        />
        {/* Damage number popup */}
        {damage > 0 && (
          <motion.span
            className="absolute top-[-20px] right-0 text-red-400 font-bold text-sm"
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: -20, opacity: 0 }}
            transition={{ delay: 1.5, duration: 1 }}
          >
            -{damage} HP
          </motion.span>
        )}
      </div>
    </div>
  );
}
```

**Приоритет:** 🟡 Средне (2 часа) | Средний WOW

---

#### 🔥 Streak Notification

**Что:** При серии побед — уведомление с нарастающей драматичностью.

```tsx
// Streak notifications в BattleResult
const streakMessages: Record<number, { emoji: string; text: string; color: string }> = {
  3:  { emoji: '🔥', text: '3 WIN STREAK!', color: 'text-orange-400' },
  5:  { emoji: '⚡', text: 'UNSTOPPABLE! 5 WINS!', color: 'text-yellow-400' },
  7:  { emoji: '💀', text: 'DOMINATING! 7 WINS!', color: 'text-red-400' },
  10: { emoji: '👑', text: 'LEGENDARY! 10 WIN STREAK!', color: 'text-purple-400' },
};

// Show streak popup with special animation
{streak >= 3 && (
  <motion.div
    initial={{ scale: 0, rotate: -180 }}
    animate={{ scale: 1, rotate: 0 }}
    className={`mt-4 text-center ${streakMessages[streak]?.color || 'text-orange-400'}`}
  >
    <span className="text-4xl">{streakMessages[streak]?.emoji || '🔥'}</span>
    <div className="text-xl font-black mt-1">
      {streakMessages[streak]?.text || `${streak} WIN STREAK!`}
    </div>
  </motion.div>
)}
```

**Приоритет:** 🟡 Средне (нужен streak tracking в БД) | Высокий WOW

---

### 2.3 Эффекты СПЕЦИАЛЬНЫХ МОМЕНТОВ

#### ⭐ PERFECT PREDICTION

**Триггер:** `|myPrediction - actualX| / actualX < 0.05` (в пределах 5% от реальности)

**Эффект:**
```
┌──────────────────────────────┐
│        ✨ PERFECT ✨          │
│     PREDICTION              │
│                             │
│   Your: 1.52x               │
│   Actual: 1.54x             │
│   Accuracy: 98.7%           │
│                             │
│   🌟 +50 bonus ELO          │
│   🏅 Achievement unlocked!   │
└──────────────────────────────┘
```

- Золотое свечение вокруг карточки результата
- Специальный звук (achievement unlock)
- Bonus ELO (+50 вместо стандартного +25)
- Canvas-confetti: золотые звёзды

---

#### 😱 UPSET

**Триггер:** Бот с ELO на 200+ ниже побеждает бота с более высоким ELO.

**Эффект:**
```
┌──────────────────────────────┐
│        😱 UPSET! 😱          │
│                             │
│   Bronze bot DESTROYED a     │
│   Gold league veteran!       │
│                             │
│   🎰 +2x ELO bonus          │
└──────────────────────────────┘
```

- Screen flash yellow
- "UPSET!" text с тряской
- Двойной ELO бонус для underdog

---

#### 💥 CRITICAL HIT

**Триггер:** Разница predictions > 2x (`|bot1.prediction - bot2.prediction| > 2.0`)

**Эффект:**
- Показать: "⚡ CRITICAL HIT! Predictions were MILES apart!"
- Extra HP damage для проигравшего (15 вместо 10)
- Explosion анимация

---

#### 🏆 League Promotion

**Триггер:** ELO пересекает порог лиги вверх.

**Эффект:**
```
┌──────────────────────────────────────────┐
│                                          │
│     🏆 PROMOTED! 🏆                      │
│                                          │
│     ┌─────────┐    ┌─────────┐          │
│     │ 🥉      │ → │ 🥈      │          │
│     │ BRONZE  │    │ SILVER  │          │
│     │  950    │    │  1012   │          │
│     └─────────┘    └─────────┘          │
│                                          │
│  New perks: Custom bot avatar unlocked!  │
│                                          │
└──────────────────────────────────────────┘
```

- Full-screen overlay с particles
- League badge animation (old → new)
- Sound: royal fanfare

---

#### 💀 ELIMINATED

**Триггер:** HP бота достигает 0.

**Эффект:**
```
┌──────────────────────────────────────────┐
│                                          │
│         💀 ELIMINATED 💀                 │
│                                          │
│      [Bot avatar shatters]              │
│                                          │
│   CryptoKing lived for 47 battles.       │
│   Final record: 28W - 19L               │
│   Peak ELO: 1,247 (Silver)              │
│                                          │
│   [🔄 Revive for 0.1 SOL]              │
│   [🆕 Create new bot (free)]            │
│                                          │
└──────────────────────────────────────────┘
```

- Dramatic slowdown
- Shatter/dissolve animation
- Memorial stats
- Монетизация: revive за SOL!

---

## 🎮 Геймификация

### 3.1 ELO Рейтинг

**Формула (стандартный ELO с модификациями):**

```
Expected(A) = 1 / (1 + 10^((Rb - Ra) / 400))

New_Ra = Ra + K * (S - Expected(A))

где:
  Ra, Rb = текущий ELO игроков A и B
  S = 1 (победа), 0 (поражение), 0.5 (ничья)
  K = K-factor (см. ниже)
```

**K-factor (определяет скорость изменения рейтинга):**

| Условие | K-factor | Причина |
|---------|----------|---------|
| Первые 30 боёв бота | K = 40 | Быстрый калибровочный период |
| ELO < 1000 (Bronze) | K = 32 | Легче расти из Bronze |
| ELO 1000-1499 (Silver) | K = 28 | Стандартный рост |
| ELO 1500-1999 (Gold) | K = 24 | Сложнее расти |
| ELO 2000+ (Diamond) | K = 20 | Самый медленный — Diamond нужно заслужить |

**Начальный рейтинг:** 800 ELO (средний Bronze)

**Бонусы:**
- Perfect Prediction: +50% к ELO gain
- Upset victory: +100% к ELO gain
- Win streak (5+): +25% к ELO gain

**Пример:**
```
Bot A (ELO 1200) vs Bot B (ELO 1000)
Expected(A) = 1 / (1 + 10^((1000-1200)/400)) = 0.76
Expected(B) = 0.24

Если A побеждает (ожидаемо):
  A: 1200 + 28 * (1 - 0.76) = 1200 + 6.72 = 1207
  B: 1000 + 32 * (0 - 0.24) = 1000 - 7.68 = 992

Если B побеждает (upset!):
  B: 1000 + 32 * (1 - 0.24) * 2.0 = 1000 + 48.64 = 1049 (+ upset bonus)
  A: 1200 + 28 * (0 - 0.76) = 1200 - 21.28 = 1179
```

**Реализация:**
```typescript
// src/lib/elo.ts
export function calculateElo(
  winnerElo: number, 
  loserElo: number, 
  winnerBattles: number,
  isPerfect: boolean = false,
  isUpset: boolean = false,
  winStreak: number = 0,
): { newWinnerElo: number; newLoserElo: number } {
  const kWinner = getKFactor(winnerElo, winnerBattles);
  const kLoser = getKFactor(loserElo, winnerBattles); // loser's own battles should be used

  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 - expectedWinner;

  let multiplier = 1;
  if (isPerfect) multiplier *= 1.5;
  if (isUpset) multiplier *= 2.0;
  if (winStreak >= 5) multiplier *= 1.25;

  const newWinnerElo = Math.round(winnerElo + kWinner * (1 - expectedWinner) * multiplier);
  const newLoserElo = Math.round(loserElo + kLoser * (0 - expectedLoser));

  return { 
    newWinnerElo: Math.max(0, newWinnerElo), 
    newLoserElo: Math.max(0, newLoserElo) 
  };
}

function getKFactor(elo: number, totalBattles: number): number {
  if (totalBattles < 30) return 40;
  if (elo < 1000) return 32;
  if (elo < 1500) return 28;
  if (elo < 2000) return 24;
  return 20;
}
```

---

### 3.2 Лиги

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  🥉 BRONZE    │  0 - 999 ELO     │  Все начинают  │
│  🥈 SILVER    │  1000 - 1499 ELO │  Хорошие боты  │
│  🥇 GOLD      │  1500 - 1999 ELO │  Элита         │
│  💎 DIAMOND   │  2000+ ELO       │  Легенды       │
│                                                     │
│  🌟 CHAMPION  │  Top 3 Diamond   │  Seasonal      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Каждая лига даёт:**

| Лига | Цвет | Перки |
|------|------|-------|
| 🥉 Bronze | `#CD7F32` | Базовые скины |
| 🥈 Silver | `#C0C0C0` | Custom avatar border, 1 free daily Epic battle |
| 🥇 Gold | `#FFD700` | Animated avatar border, priority matchmaking, 3 free daily Epic |
| 💎 Diamond | `#B9F2FF` | Holographic border, spectator chat priority, unlimited Epic |
| 🌟 Champion | `#FF4500` | Crown animation, name in gold on leaderboard, "Champion" title |

**Matchmaking по лигам:**
- Приоритет: матчить ботов из одной лиги
- Допуск: ±1 лига (Silver может драться с Bronze или Gold)
- Diamond+ может драться с кем угодно (если нет оппонентов)

---

### 3.3 Streaks

| Streak | Бонус | Визуал |
|--------|-------|--------|
| 🔥 3 wins | +10% ELO bonus | Flame icon у имени |
| ⚡ 5 wins | +25% ELO bonus | Lightning animation |
| 💀 7 wins | +50% ELO bonus | Skull flame icon |
| 👑 10 wins | +100% ELO bonus | Crown + special animation |
| 🌋 15 wins | +150% ELO + achievement | Full volcanic animation |

**Loss streak protection:**
- 3+ losses: -10% ELO penalty reduction (мягче падаешь)
- 5+ losses: -25% ELO penalty reduction
- Предотвращает derank spiral

**Реализация:** Добавить `win_streak` и `loss_streak` поля в `bots` таблицу. Resolver обновляет при каждом бое.

---

### 3.4 Achievements (25 ачивок)

| # | Ачивка | Описание | Условие | Награда |
|---|--------|----------|---------|---------|
| 1 | 🎉 First Blood | Win your first battle | 1 win | +10 ELO |
| 2 | ⚔️ Veteran | Win 10 battles | 10 wins | Bronze badge |
| 3 | 🏆 Warrior | Win 50 battles | 50 wins | Silver badge |
| 4 | 👑 Champion | Win 100 battles | 100 wins | Gold badge |
| 5 | 💎 Legend | Win 500 battles | 500 wins | Diamond badge |
| 6 | 🎯 Sharpshooter | Perfect prediction | 1 perfect pred | +50 ELO |
| 7 | 🎯 Sniper | 5 Perfect predictions | 5 perfects | Custom crosshair avatar |
| 8 | 😱 Giant Slayer | Beat a bot 300+ ELO above you | 1 upset | Slingshot icon |
| 9 | 🔥 On Fire | 5 win streak | 5 streak | Fire border |
| 10 | 💀 Unstoppable | 10 win streak | 10 streak | Skull crown |
| 11 | 🥉 Bronze Elite | Reach Silver league | 1000 ELO | Silver frame |
| 12 | 🥈 Silver Climber | Reach Gold league | 1500 ELO | Gold frame |
| 13 | 🥇 Gold Standard | Reach Diamond league | 2000 ELO | Diamond frame |
| 14 | 🌙 Night Owl | Win a battle between 00:00-05:00 UTC | Time check | Moon icon |
| 15 | 📊 Data Nerd | Use Smart AI strategy for 50 wins | Strategy + wins | Brain icon |
| 16 | 🎲 Lucky Bastard | Win 10 times with Chaos Bot | Strategy + wins | Dice icon |
| 17 | 🐋 Whale Hunter | Win 10 times with Whale Watcher | Strategy + wins | Whale icon |
| 18 | 💪 Survivor | Win with < 10 HP remaining | HP check | Heart icon |
| 19 | 🤝 Social Butterfly | Have 5 followers | Social | Butterfly badge |
| 20 | 📡 API Master | Win 20 battles via API bot | API flag + wins | Robot badge |
| 21 | 🏟️ Gladiator | Fight 100 battles (win or lose) | Total battles | Sword badge |
| 22 | 📈 Bull Run | Correctly predict 3 pumps in a row | prediction > 1.5 + win | Bull horns |
| 23 | 📉 Bear Hunter | Correctly predict 3 dumps in a row | prediction < 0.8 + win | Bear claw |
| 24 | 💰 High Roller | Win a battle with 1 SOL stake | Stake + win | Money bag |
| 25 | 🏅 Season Champion | Finish top-3 in a season | Season rank | Trophy + title |

**Хранение:** Новая таблица `achievements`:
```sql
CREATE TABLE achievements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id integer REFERENCES bots(id),
  achievement_key text NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(bot_id, achievement_key)
);
```

---

### 3.5 Daily Challenges

Каждый день 3 новых челленджа:

**Примеры:**
```
📋 Daily Challenges (Feb 8):

1. ⚔️ Win 3 battles today              [1/3] → Reward: +30 ELO
2. 🎯 Get a Perfect Prediction          [0/1] → Reward: +50 ELO  
3. 🥈 Beat a Silver+ league bot         [0/1] → Reward: Achievement point
```

**Генерация:** Рандомный выбор из пула ~20 шаблонов. Seed = дата + bot_id (у каждого свои).

**Reward за выполнение всех 3:** Bonus chest (random: ELO, cosmetic, или XP boost на 24ч).

---

### 3.6 Seasons

**Длительность:** 1 месяц (1-го числа каждого месяца — reset)

**Что ресетится:**
- Season rank/placement (не ELO — ELO остаётся навсегда!)
- Season-specific challenges
- Daily challenge completion

**Что НЕ ресетится:**
- ELO рейтинг
- Achievements
- Cosmetics
- Battle history

**Season Rewards:**

| Место | Награда |
|-------|---------|
| 🥇 #1 | "Season Champion" title + exclusive skin + 1 SOL |
| 🥈 #2-3 | "Season Elite" title + rare skin + 0.5 SOL |
| 🥉 #4-10 | "Season Veteran" title + uncommon skin + 0.1 SOL |
| Top 25% | Season badge |

**Season Pass (premium, Phase 4):**
- Free track: basic rewards every 10 season levels
- Premium track ($5/month): exclusive skins, ELO boosts, early access

---

## 🎨 UI/UX улучшения

### 4.1 Мобильная адаптивность

**Текущие проблемы (из кода):**
- `page.tsx`: `grid-cols-1 md:grid-cols-2` — стратегии ОК на мобильном
- `LiveBattleCard.tsx`: compact mode уже есть — хорошо для мобильного!
- `LeaderboardPage.tsx`: таблица — плохо на мобильном
- Header: `WalletMultiButton` может overflow на мобильном

**Фиксы:**

1. **Leaderboard → Card view на мобильном:**
```tsx
// На мобильном: карточки вместо таблицы
<div className="hidden md:block">{/* Table view */}</div>
<div className="md:hidden space-y-3">{/* Card view */}</div>
```

2. **Bottom Navigation (mobile):**
```
┌──────────────────────────────┐
│  🏠 Home  │ ⚔️ Arena │ 🏆 Top │ 👤 Me │
└──────────────────────────────┘
```

3. **Safe area + touch targets:** все кнопки ≥ 44px высота (Apple guideline)

4. **Swipe gestures:** Swipe left/right между battle cards

---

### 4.2 Анимации переходов

**Сейчас:** `AnimatePresence mode="wait"` с fade + y-slide. Работает, но однообразно.

**Предложения:**
- Из choose-mode → arena: Slide up + scale from center
- Battle start: Zoom into battle card
- Battle result: Dramatic slowdown → freeze → result overlay
- Page transitions: Shared layout animations (framer-motion `layoutId`)

---

### 4.3 Loading States

**Сейчас:** В leaderboard есть spinner. В main page — нет loading states.

**Skeleton screens:**
```tsx
// Skeleton для battle card
function BattleCardSkeleton() {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 animate-pulse">
      <div className="h-4 bg-gray-700 rounded w-1/3 mb-3" />
      <div className="flex justify-between mb-3">
        <div className="h-12 w-12 bg-gray-700 rounded-full" />
        <div className="h-6 w-6 bg-gray-700 rounded" />
        <div className="h-12 w-12 bg-gray-700 rounded-full" />
      </div>
      <div className="h-10 bg-gray-700 rounded-lg" />
    </div>
  );
}
```

---

### 4.4 Notification System

**In-app (Phase 2.1):**
- Toast notifications уже есть (`Toast.tsx`)
- Добавить: notification bell icon в header
- Notification center: list последних 20 событий

**Push notifications (Phase 3):**
- Web Push API для browser
- Telegram Bot для TG users
- Events: battle result, promotion, daily challenge reset, streak broken

---

### 4.5 Sound Toggle

```tsx
// В header рядом с wallet
<button
  onClick={() => soundManager.toggle()}
  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
  title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
>
  {soundEnabled ? '🔊' : '🔇'}
</button>
```

Состояние в localStorage: `gembots_sound_enabled`.

---

### 4.6 Design System — Dark Neon Aesthetic

**Цветовая палитта (уже частично в `constants.ts`):**

```
Background:       #0A0A0F (deep black)
Surface/Cards:    #1A1A2E (dark blue-gray)
Border:           #2A2A3E (subtle)
Border Hover:     #9945FF40 (purple glow)

Primary:          #9945FF (Solana purple)
Secondary:        #14F195 (Solana green)
Accent:           #FFD700 (gold)
Danger:           #EF4444 (red)
Info:             #00F0FF (cyan)

Neon Glow FX:
  Purple glow:    box-shadow: 0 0 20px rgba(153, 69, 255, 0.3)
  Green glow:     box-shadow: 0 0 20px rgba(20, 241, 149, 0.3)
  Gold glow:      box-shadow: 0 0 20px rgba(255, 215, 0, 0.3)
```

**Gradient presets:**
```css
.gradient-primary   { background: linear-gradient(135deg, #9945FF, #FF00FF); }
.gradient-win       { background: linear-gradient(135deg, #FFD700, #FF6B00); }
.gradient-lose      { background: linear-gradient(135deg, #EF4444, #7F1D1D); }
.gradient-surface   { background: linear-gradient(180deg, #1A1A2E, #0A0A0F); }
```

---

### 4.7 Typography

| Элемент | Font | Reason |
|---------|------|--------|
| Заголовки | `Inter` или `Space Grotesk` | Modern, clean, tech feel |
| Цифры/цены | `JetBrains Mono` или `Fira Code` | Monospace, tabular figures |
| Body text | `Inter` | System font alternative |
| Logo | `Orbitron` | Futuristic, gaming feel |

```css
/* В globals.css или tailwind config */
.font-mono-price {
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
}
```

---

## 🏟️ Battle Page Redesign

### 5.1 Full-Screen Battle View

**Сейчас:** Бои — маленькие карточки в grid на главной. Нет отдельной battle page.

**Идея:** Переход `/battle/[id]` — полноэкранный immersive battle experience.

### Layout:

```
┌──────────────────────────────────────────────────────────┐
│ ← Back                    ⏱ 47s               🔊 Sound  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐                          ┌──────────┐     │
│  │ 🤖       │                          │ 🤖       │     │
│  │ CryptoAI │                          │ MoonBot  │     │
│  │ ELO:1247 │                          │ ELO:1089 │     │
│  │ 🔥5 streak│                          │          │     │
│  │          │                          │          │     │
│  │ Pred:    │      💰 $TOKEN            │ Pred:    │     │
│  │ 1.52x    │                          │ 2.10x    │     │
│  │          │    ╭──────────────╮      │          │     │
│  │ ████████ │    │   1.67x      │      │ ████░░░░ │     │
│  │  HP 80   │    │  CURRENT     │      │  HP 40   │     │
│  └──────────┘    ╰──────────────╯      └──────────┘     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  📈 Live Price Chart (last 60 seconds)           │   │
│  │  ┌─────────────────────────────────┐              │   │
│  │  │      ╱╲   ╱╲  ← 1.52x (Bot1)   │              │   │
│  │  │    ╱    ╲╱    ╲                  │              │   │
│  │  │  ╱              ╲               │              │   │
│  │  │╱                  ╲── current   │              │   │
│  │  │                    ╲            │              │   │
│  │  │   ← 2.10x (Bot2)    ╲          │              │   │
│  │  └─────────────────────────────────┘              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────────────┐     │
│  │ 👁 12 spectators  │  │ 💬 "Let's go CryptoAI!" │     │
│  └──────────────────┘  └──────────────────────────┘     │
│                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ (progress)    │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Live Price Chart

**Библиотека:** `chart.js` + `react-chartjs-2` (уже в dependencies!).

**Данные:** Real-time price points каждые 2 секунды (30 точек за 60 секунд).

```tsx
// src/components/BattleLiveChart.tsx
import { Line } from 'react-chartjs-2';

function BattleLiveChart({ 
  priceHistory, 
  bot1Prediction, 
  bot2Prediction 
}: Props) {
  const data = {
    labels: priceHistory.map((_, i) => `${i * 2}s`),
    datasets: [
      {
        label: 'Price',
        data: priceHistory,
        borderColor: '#00F0FF',
        backgroundColor: 'rgba(0, 240, 255, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Prediction lines as horizontal annotations
  const options = {
    plugins: {
      annotation: {
        annotations: {
          bot1Line: {
            type: 'line',
            yMin: bot1Prediction,
            yMax: bot1Prediction,
            borderColor: '#10B981',
            borderDash: [5, 5],
            label: { content: `Bot1: ${bot1Prediction}x`, display: true },
          },
          bot2Line: {
            type: 'line',
            yMin: bot2Prediction,
            yMax: bot2Prediction,
            borderColor: '#EF4444',
            borderDash: [5, 5],
            label: { content: `Bot2: ${bot2Prediction}x`, display: true },
          },
        },
      },
    },
  };

  return <Line data={data} options={options} />;
}
```

### 5.3 Prediction Markers

Горизонтальные линии на графике:
- 🟢 Зелёная пунктирная — prediction бота 1
- 🔴 Красная пунктирная — prediction бота 2
- 🔵 Синяя сплошная — текущая цена

Когда цена приближается к prediction линии — линия начинает пульсировать.

### 5.4 Spectator Mode

**URL:** `/battle/[id]` — доступен всем без авторизации.

**Фичи:**
- Read-only view текущего боя
- Real-time updates через polling (каждые 3с)
- Spectator count badge
- Chat (Phase 3)
- "Share" button для приглашения друзей

**Реализация:** 
- API endpoint `/api/v1/arena/room/[id]/status` уже существует
- Добавить spectator counter (Redis или Supabase Realtime)
- Отдельный layout без controls

---

## 🤝 Social Features

### 6.1 Share Battle Result Card

**Что:** Генерация картинки-карточки результата боя для шеринга в Twitter/Telegram.

**Дизайн карточки:**
```
┌──────────────────────────────────┐
│  🤖 GemBots Arena               │
│                                  │
│  ⚔️ CryptoKing vs MoonHunter    │
│  Token: $BONK                    │
│                                  │
│  🏆 CryptoKing WINS!            │
│                                  │
│  Predicted: 1.52x                │
│  Actual:    1.54x (98.7% acc!)   │
│                                  │
│  gembots.space              │
└──────────────────────────────────┘
```

**Генерация:**
- **Вариант A (простой):** HTML → canvas → PNG через `html2canvas`
- **Вариант B (красивый):** Server-side через `@vercel/og` (или `satori` + `resvg`)
- **Вариант C (самый простой):** Template image + text overlay через `canvas` API

**Рекомендация:** Вариант B — `/api/og/battle/[id]` endpoint, возвращает PNG. Можно использовать как og:image для SEO.

---

### 6.2 "Watch Live" — приглашение

```
🔴 LIVE BATTLE!
CryptoKing vs MoonHunter
Token: $BONK | 42s remaining

👉 Watch: gembots.space/battle/abc123
```

- Share button на каждой LiveBattleCard
- Генерация short link
- Deep link в Telegram Mini App

---

### 6.3 Spectator Chat (Phase 3)

**Реализация:** Supabase Realtime channels.

```tsx
// Каждый бой = отдельный channel
const channel = supabase.channel(`battle:${battleId}`);

channel
  .on('broadcast', { event: 'chat' }, (payload) => {
    addMessage(payload.message);
  })
  .subscribe();

// Отправка
channel.send({
  type: 'broadcast',
  event: 'chat',
  payload: { 
    user: displayName,
    message: text,
    timestamp: Date.now(),
  },
});
```

**Ограничения:**
- Rate limit: 1 msg / 3 seconds
- Max 100 chars
- No links (anti-spam)
- Profanity filter (simple word list)

---

### 6.4 Follow Bot

- "Follow" button на странице бота / leaderboard
- Notifications при: бой начался, бой завершился, promotion, streak
- Хранение: `follows` таблица (follower_id, bot_id, created_at)
- In-app notification center

---

## 📱 Telegram Mini App

### 7.1 Как выглядит

Telegram Mini App = WebApp, открывается внутри Telegram. Используем наш Next.js сайт с Telegram SDK.

```
┌─ Telegram ─────────────────────────┐
│ ← GemBots                    ⋮    │
├────────────────────────────────────┤
│                                    │
│     🤖 GemBots Arena              │
│                                    │
│  Your Bot: CryptoKing              │
│  ELO: 1247 🥈 Silver              │
│  Record: 28W - 12L                 │
│  🔥 5 win streak                   │
│                                    │
│  ┌────────────────────────────┐   │
│  │  ⚡ Quick Battle (30s)     │   │
│  │  Free • Tap to start       │   │
│  └────────────────────────────┘   │
│                                    │
│  ┌────────────────────────────┐   │
│  │  ⚔️ Standard Battle (60s)  │   │
│  │  Free or 0.1 SOL stake     │   │
│  └────────────────────────────┘   │
│                                    │
│  🔴 3 Live Battles                 │
│  ┌─ CryptoAI vs Moon 34s ─────┐  │
│  ├─ AlphaBot vs Degen 12s ────┤  │
│  └─ TurboX vs Whale 51s ──────┘  │
│                                    │
│  📊 Leaderboard  │  📖 History    │
│                                    │
│  [───────── Bottom Nav ──────────] │
│  🏠 Home  ⚔️ Battle  🏆 Top  👤 Me│
└────────────────────────────────────┘
```

### 7.2 Telegram-specific фичи

| Фича | Telegram API |
|------|-------------|
| User auth | `Telegram.WebApp.initDataUnsafe.user` |
| Haptic feedback | `Telegram.WebApp.HapticFeedback.impactOccurred()` |
| Notification | `Telegram.WebApp.showPopup()` |
| Share | `Telegram.WebApp.switchInlineQuery()` |
| Back button | `Telegram.WebApp.BackButton` |
| Theme | `Telegram.WebApp.themeParams` |
| Payment (future) | Telegram Stars / TON |

### 7.3 Quick Battle из Telegram

1. User открывает Mini App
2. Нажимает "⚡ Quick Battle"
3. Matchmaker находит оппонента (или NPC)
4. 30 секунд боя (prediction = bot's strategy auto)
5. Result → push notification в Telegram

**Telegram Bot notifications:**
```
🤖 GemBots Result!

⚔️ CryptoKing vs AlphaBot
Token: $BONK

🏆 YOU WIN!
Your prediction: 1.52x
Actual: 1.54x (98.7% accuracy!)

ELO: 1247 → 1273 (+26)
🔥 6 Win Streak!

[🎮 Play Again] [📊 Stats]
```

### 7.4 Реализация

1. Создать Telegram Bot через @BotFather
2. Настроить Menu Button → ссылка на Mini App
3. В Next.js: определять `typeof Telegram !== 'undefined'`
4. Адаптировать UI под Telegram theme
5. Использовать `telegram_id` из `initData` для auth

**Файлы для создания:**
- `src/lib/telegram.ts` — SDK wrapper
- `src/hooks/useTelegram.ts` — React hook
- Conditional import Telegram WebApp JS SDK

---

## 💰 Монетизация

### 8.1 Free vs Premium (Phase 3+)

| Feature | Free | Premium ($4.99/mo) |
|---------|------|---------------------|
| Quick Battles | ✅ Unlimited | ✅ Unlimited |
| Standard Battles | ✅ 10/day | ✅ Unlimited |
| Epic Battles | ❌ | ✅ 5/day |
| SOL Stakes | ✅ Up to 0.1 SOL | ✅ Up to 5 SOL |
| Bot Skins | ❌ Basic only | ✅ All skins |
| Analytics | ❌ Basic stats | ✅ Advanced analytics |
| Daily Challenges | ✅ 2/day | ✅ 5/day + premium challenges |
| Ads | ✅ Occasional | ❌ No ads |
| Season Pass | ❌ Free track | ✅ Premium track |

### 8.2 SOL Stakes (Phase 2.2)

**Deposit Pool модель (уже решено в архитектуре):**

```
User → Deposit SOL → Platform Wallet → Balance in DB
       ↓
     Play battles with balance
       ↓
     Withdraw SOL ← Platform Wallet ← Balance in DB
```

**Rake:** 5% от выигрыша (платформа забирает)

**Пример:**
- Player A ставит 1 SOL, Player B ставит 1 SOL
- Pool = 2 SOL
- Winner получает: 2 SOL - 5% rake = 1.9 SOL (profit = 0.9 SOL)
- Platform получает: 0.1 SOL

**Anti-abuse:**
- Min stake: 0.01 SOL
- Max stake per battle: 5 SOL
- Daily withdrawal limit: 10 SOL
- KYC optional (can play without, limits apply)

### 8.3 Tournaments (Phase 3)

**Формат:** 8 или 16 ботов, single elimination bracket.

**Entry fee:** 0.1 - 1 SOL

**Prize pool distribution:**
- 1st: 50%
- 2nd: 25%
- 3rd-4th: 10% each
- Platform: 5%

**Пример 16-bot tournament с 0.5 SOL entry:**
- Total pool: 8 SOL
- 1st: 4 SOL, 2nd: 2 SOL, 3rd-4th: 0.8 SOL each
- Platform: 0.4 SOL

### 8.4 Bot Skins / Cosmetics

| Category | Examples | Price |
|----------|----------|-------|
| Avatar Frames | Neon, Fire, Ice, Diamond | 0.05 - 0.5 SOL |
| Name Colors | Gold, Rainbow, Holographic | 0.02 - 0.1 SOL |
| Victory Animations | Custom confetti, explosions, memes | 0.1 - 0.3 SOL |
| Bot Emojis | Custom emoji instead of 🤖 | 0.01 - 0.05 SOL |
| Titles | "The Destroyer", "Moon Lord", etc. | 0.02 - 0.1 SOL |
| Sound Packs | Custom battle/victory sounds | 0.1 - 0.5 SOL |

**Marketplace (Phase 4):** Users can trade skins with each other (Solana NFTs).

### 8.5 Referral Program

```
Invite a friend → They sign up → Both get:
  - 🎁 100 bonus ELO
  - 🎁 1 free Epic battle
  - 🎁 Random cosmetic item

If friend makes first SOL deposit:
  - 💰 Referrer gets 10% of their first deposit (max 1 SOL)
```

**Tracking:** Referral code in URL: `gembots.space?ref=ABC123`

---

## 📅 Фазы реализации

### Phase 2.1 — WOW Week (7 дней) 🎯

> **Цель:** Максимальный визуальный и эмоциональный эффект с минимальными усилиями.

| День | Задача | Effort | Impact |
|------|--------|--------|--------|
| 1 | 💓 Heartbeat effect (countdown < 10s) | 1 час | 🔥🔥🔥 |
| 1 | 🔄 Price pulse animation (volatile movements) | 2 часа | 🔥🔥🔥 |
| 1 | 🎨 Dynamic background color (who's winning) | 1 час | 🔥🔥 |
| 2 | 🎊 Улучить confetti (объединить WinAnimation + BattleResult) | 1 час | 🔥🔥 |
| 2 | 🏆 Улучить VICTORY / DEFEAT анимации | 2 часа | 🔥🔥🔥 |
| 2 | 📳 Screen shake при close call | 30 мин | 🔥🔥 |
| 3 | 🔊 Sound effects system (SoundManager class) | 2 часа | 🔥🔥🔥🔥 |
| 3 | 🔊 Добавить 5 базовых звуков | 2 часа | 🔥🔥🔥 |
| 4 | ❤️ HP Bar visual component | 2 часа | 🔥🔥 |
| 4 | 💀 ELIMINATED dramatic effect | 2 часа | 🔥🔥🔥 |
| 5 | ⭐ Special moments: PERFECT, UPSET, CRITICAL | 3 часа | 🔥🔥🔥 |
| 5 | 🔥 Win streak notification | 1 час | 🔥🔥 |
| 6 | 📱 Mobile responsive fixes | 4 часа | 🔥🔥 |
| 6 | 🔇 Sound toggle button | 30 мин | 🔥 |
| 7 | 🧪 Testing, polish, bug fixes | Full day | — |

**Итого Phase 2.1:** ~24 часа работы, 7 дней.  
**Результат:** Бои станут ВИЗУАЛЬНО захватывающими. Каждый бой — маленькое шоу.

---

### Phase 2.2 — Геймификация (2 недели)

| Неделя | Задача | Effort |
|--------|--------|--------|
| W1 D1-2 | ELO system (`src/lib/elo.ts`) + migration script | 8 часов |
| W1 D2-3 | Supabase schema fixes (добавить все missing columns!) | 4 часа |
| W1 D3-4 | Leagues visual (badges, colors, borders) | 6 часов |
| W1 D4-5 | Matchmaking по ELO/лигам в auto-matchmaker | 4 часа |
| W1 D5 | Streaks tracking (win_streak, loss_streak fields) | 3 часа |
| W2 D1-2 | Achievements system (таблица + проверки в resolver) | 8 часов |
| W2 D2-3 | League promotion animation | 4 часа |
| W2 D3-4 | Battle page (`/battle/[id]`) — full-screen view | 8 часов |
| W2 D4-5 | Live price chart в battle page (chart.js) | 6 часов |
| W2 D5 | Duration modes (Quick / Standard / Epic) | 3 часа |

**Итого Phase 2.2:** ~54 часа работы, 2 недели.  
**Результат:** Полноценная competitive система. Игроки чувствуют прогресс.

---

### Phase 3 — Full Product (1 месяц)

| Неделя | Фокус | Задачи |
|--------|-------|--------|
| W1 | 📱 Telegram Mini App | Bot создание, TG auth, Quick Battle, notifications |
| W2 | 💰 SOL Stakes | Deposit/Withdraw UI, balance system, rake |
| W3 | 🤝 Social | Share cards, spectator mode, follow system |
| W4 | 📊 Analytics + Polish | Dashboard redesign, advanced stats, daily challenges, season system |

**Итого Phase 3:** ~160 часов работы.  
**Результат:** Полноценный продукт готовый к публичному запуску.

---

### Phase 4 — Масштабирование (2+ месяца)

| Месяц | Фокус | Задачи |
|-------|-------|--------|
| M1 | 🏆 Tournaments | Bracket system, entry fees, prize pools |
| M1 | 🎨 Cosmetics | Skin shop, avatar customization |
| M2 | 💎 Premium | Season pass, premium features, ads for free |
| M2 | 🤖 Advanced Bots | Custom strategy builder (visual), backtesting |
| M2+ | 🌐 Growth | Referral program, marketing, partnerships |
| M2+ | ⛓️ On-chain | NFT skins, on-chain battles (optional) |

---

## 🎯 Ключевые метрики

| Метрика | Phase 2 Target | Phase 3 Target | Phase 4 Target |
|---------|----------------|----------------|----------------|
| DAU | 50 | 500 | 5,000 |
| Battles/day | 200 | 2,000 | 20,000 |
| Avg session | 5 min | 10 min | 15 min |
| Retention D1 | 30% | 40% | 50% |
| Retention D7 | 10% | 20% | 30% |
| Revenue/month | $0 | $500 | $10,000 |

---

## 🧑‍💻 Технический долг (исправить ДО Phase 2)

1. **Supabase Schema:** Добавить все missing columns (`finished_at`, `bot1_name`, `bot2_name`, `bot1_wallet`, `bot2_wallet`, `stake_amount` в `battles`; `is_active`, `strategy` в `bots`)
2. **Real price в LiveBattleCard:** Заменить `Math.random()` симуляцию на реальные данные из price-worker
3. **Battle resolver:** Использовать snapshot-цену при создании боя, а не текущую при resolve
4. **Error handling:** Обернуть все API calls в try/catch с user-friendly errors
5. **Rate limiting:** Добавить rate limits на API endpoints

---

> **Последнее обновление:** 2026-02-08  
> **Автор:** Эдичка (AI Agent)  
> **Статус:** Готов к Phase 2.1
