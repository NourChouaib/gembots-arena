# 🎨 GemBots UI Wireframes & Technical Specs

## 🖥️ Desktop Layout — Live Arena

### Main Arena View (1920x1080)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🏟️ GEMBOTS LIVE ARENA              ⚡ 1,247 watching    ⏰ 14:32:18 UTC    │
├─────────────────────┬───────────────────────────┬─────────────────────────────┤
│                     │                           │                             │
│   🤖 ARENA VIEW     │      📈 LIVE CHARTS       │    🏆 LEADERBOARD          │
│   (800px width)     │      (600px width)        │    (400px width)           │
│                     │                           │                             │
│  ┌─[Bot1]─🎯─PEPE─┐ │  ┌─────────────────────┐  │  ┌───────────────────────┐ │
│  │  😎→💰 +245%   │ │  │     📊 PEPE/USD     │  │  │ 🥇 AlphaHunter $5.2k  │ │
│  │  Stake: $1.2k  │ │  │   ↗️ $0.0012        │  │  │ 🥈 DiamondBot  $4.1k  │ │
│  └─────────────────┘ │  │   Volume: 2.1M     │  │  │ 🥉 MegaWhale   $3.8k  │ │
│                       │  │                    │  │  │                       │ │
│  ┌─[Bot2]─🎯─DOGE─┐  │  │   [Chart Canvas]   │  │  │ 4. SniperBot   $2.9k  │ │
│  │  🔍→❌ -12%    │  │  │                    │  │  │ 5. RocketBot   $2.3k  │ │
│  │  Stake: $950   │  │  └─────────────────────┘  │  │ 6. LuckyBot    $1.8k  │ │
│  └─────────────────┘  │                          │  │ 7. FastBot     $1.2k  │ │
│                        │  ┌─────────────────────┐ │  │ 8. SlowBot     $0.9k  │ │
│  ┌─[Bot3]─🎯─WIF──┐   │  │     📊 WIF/USD     │ │  │ 9. NewBot      $0.5k  │ │
│  │  🚀→💎 +89%    │   │  │   ↗️ $2.34         │ │  │ 10. TestBot    $0.2k  │ │
│  │  Stake: $2.1k  │   │  │   Volume: 890K     │ │  └───────────────────────┘ │
│  └─────────────────┘   │  │                   │ │                             │
│                        │  │   [Chart Canvas]  │ │  ┌───────────────────────┐ │
│  [Connection Lines]    │  │                   │ │  │   📊 LIVE STATS       │ │
│  Bot1 ←→ PEPE         │  └─────────────────────┘ │  │                       │ │
│  Bot2 ←→ DOGE         │                          │  │ Active Bots: 47       │ │
│  Bot3 ←→ WIF          │  Token Heatmap:          │  │ Total Volume: $2.1M   │ │
│                        │  🟢 PEPE  🔴 DOGE        │  │ Moonshots today: 3    │ │
│                        │  🟢 WIF   🟡 SHIB        │  │ Best streak: 7 wins  │ │
│                        │                          │  └───────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│  🎯 LIVE TICKER: 🤖 AlphaHunter bought PEPE at $0.001 🚀 DiamondBot hit 3x │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Arena View — Bot Positioning
```
📍 Bot Arena Layout (Canvas 800x600):

        PEPE Cluster          WIF Cluster
           🤖Bot1                🤖Bot3  
              |                    |
        [💎] PEPE $0.001      [🚀] WIF $2.34
              ↗️ +245%              ↗️ +89%
              
      
      DOGE Cluster          SHIB Cluster
         🤖Bot2                🤖Bot4
            |                    |
      [❌] DOGE $0.08       [⏳] SHIB $0.00001
          ↘️ -12%               ↔️ +2%

// Динамическое позиционирование:
const positions = {
  bots: gravitateToTokens(),
  tokens: scatterByMarketCap(),
  connections: animatedLines()
}
```

---

## 📱 Mobile Layout (375x812)

### Stack Layout — Portrait
```
┌─────────────────────────────┐
│ 🏟️ GEMBOTS LIVE      👤 47  │  ← Header (60px)
├─────────────────────────────┤
│ 🤖 AlphaHunter +245% PEPE   │  ← Live ticker (40px)  
├─────────────────────────────┤
│     🏆 TOP 3 LEADERS        │
│  🥇 AlphaHunter    $5.2k    │  ← Mini leaderboard (120px)
│  🥈 DiamondBot     $4.1k    │
│  🥉 MegaWhale      $3.8k    │
├─────────────────────────────┤
│                             │
│        ARENA MINI           │  ← 2x3 Bot grid (300px)
│   🤖Bot1  🤖Bot2  🤖Bot3    │
│   PEPE    DOGE    WIF       │
│   +245%   -12%    +89%      │
│                             │
│   🤖Bot4  🤖Bot5  🤖Bot6    │
│   SHIB    SOL     BONK      │
│   +2%     +15%    -5%       │
│                             │
├─────────────────────────────┤
│       📊 PRICE CHART        │  ← Selected token chart (200px)
│                             │
│     [PEPE Chart Canvas]     │
│                             │
├─────────────────────────────┤
│   [More] [Settings] [?]     │  ← Bottom nav (60px)
└─────────────────────────────┘
```

### Mobile Interactions
```typescript
// Swipe gestures
const MobileGestures = {
  swipeLeft: () => nextToken(),
  swipeRight: () => prevToken(),
  pinch: () => zoomChart(),
  doubleTap: () => showBotDetails(),
  longPress: () => showContextMenu()
}
```

---

## 💬 Telegram Channel UI

### Channel Message Templates
```markdown
## Moonshot Alert Template
💎 **MOONSHOT ALERT!** 💎

🤖 **AlphaHunter** just hit **8.2x** on $PEPE!
💰 Entry: $0.0012 → Peak: $0.0098  
🚀 Profit: **+$2,840**

⏰ Duration: 3h 24m
🎯 Confidence was: 89%

[🏟️ Watch Live Battle](https://gembots.io/live)
[📊 Full Stats](https://gembots.io/bot/alphahunter)

#MOONSHOT #PEPE #GemBots

## Daily Winner Template
🏆 **DAILY CHAMPION** 🏆

👑 **DiamondBot** dominated today!
📈 Total Profit: **+$4,257** 
🎯 Win Rate: 78% (7/9)
🔥 Best Play: DOGE 6.3x

Consistency is 🔑 in the arena!

[🤖 Follow DiamondBot](https://gembots.io/bot/diamondbot)

#DailyWinner #Consistency #GemBots

## Battle Update Template
⚡ **LIVE BATTLE UPDATE** ⚡

🔥 **5 bots fighting for SHIB dominance!**

🤖 FastBot: Leading with +127%
🤖 SlowBot: Close behind +89%  
🤖 RocketBot: Making a comeback +45%

Who will claim victory? 👀

Current price: $0.000018 (+12% since battle started)

[⚡ Join the Action](https://gembots.io/live)

#LiveBattle #SHIB #Trading
```

---

## 🎮 Interactive Elements

### Bot Avatar System
```typescript
interface BotAvatar {
  id: string;
  image: string;           // Base avatar PNG
  emoji: BotEmoji;         // Current emotion
  animation: BotAction;    // Current action
  effects: VisualEffect[]; // Particle effects
}

enum BotEmoji {
  IDLE = '😎',      // Waiting for signal
  HUNTING = '🔍',   // Analyzing market
  BUYING = '💰',    // Executing trade
  HODLING = '💎',   // Diamond handing
  WINNING = '🚀',   // In profit
  LOSING = '😭',    // Taking L
  CELEBRATING = '🎉' // Major win
}

enum BotAction {
  PULSE,           // Gentle breathing
  SCAN,           // Looking around
  ATTACK,         // Aggressive buying
  DEFEND,         // Holding position
  CELEBRATE,      // Victory dance
  RETREAT         // Cutting losses
}

// Avatar Component
<BotAvatar 
  bot={bot}
  size="large"
  showStats={true}
  onClick={() => showBotModal(bot)}
  animate={bot.currentAction}
>
  <EmotionOverlay emotion={bot.emotion} />
  <ParticleSystem effects={bot.effects} />
  <StatusBadge status={bot.status} />
</BotAvatar>
```

### Chart Interaction System
```typescript
// Chart effects based on events
const ChartEffects = {
  BOT_BUY: {
    effect: 'greenPulse',
    duration: 2000,
    particles: 'money',
    sound: 'cash-register'
  },
  
  BOT_SELL: {
    effect: 'redFlash', 
    duration: 1500,
    particles: 'coins',
    sound: 'sell-chime'
  },
  
  MOONSHOT: {
    effect: 'goldExplosion',
    duration: 5000,
    particles: 'rockets + stars',
    sound: 'victory-fanfare'
  },
  
  CRASH: {
    effect: 'redScreenShake',
    duration: 3000,
    particles: 'falling-coins',
    sound: 'sad-trombone'
  }
}

// Chart component with effects
<EnhancedChart 
  data={priceData}
  effects={ChartEffects}
  onBotAction={(action) => triggerEffect(action)}
  realtime={true}
  annotations={botActions}
>
  <PriceLineChart />
  <VolumeBarChart />
  <BotActionMarkers />
  <EffectOverlay />
</EnhancedChart>
```

### Live Ticker Animation
```css
/* Smooth scrolling ticker */
.live-ticker {
  white-space: nowrap;
  overflow: hidden;
  background: linear-gradient(90deg, #1a1a2e, #16213e, #1a1a2e);
  padding: 12px 0;
  border-top: 1px solid #333;
  border-bottom: 1px solid #333;
}

.ticker-content {
  display: inline-block;
  animation: scroll-left 45s linear infinite;
  font-size: 16px;
  font-weight: 500;
  color: #fff;
}

@keyframes scroll-left {
  0% { transform: translateX(100vw); }
  100% { transform: translateX(-100%); }
}

/* Ticker items */
.ticker-item {
  display: inline-block;
  margin-right: 60px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

.ticker-item.moonshot {
  background: linear-gradient(45deg, #ffd700, #ff6b35);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

---

## 🚀 Advanced Interactions

### Arena View — Bot Movement
```typescript
// Физика движения ботов в арене
class BotMovement {
  position: Vector2;
  target: Vector2;
  velocity: Vector2;
  
  // Боты притягиваются к токенам, которые они торгуют
  gravitateToToken(token: Token) {
    const force = token.position.subtract(this.position);
    const distance = force.magnitude();
    const strength = token.volume / distance; // Сила зависит от объема
    
    this.velocity.add(force.normalize().multiply(strength));
  }
  
  // Отталкивание от других ботов (избегание скопления)
  avoidBots(bots: Bot[]) {
    bots.forEach(bot => {
      const force = this.position.subtract(bot.position);
      const distance = force.magnitude();
      
      if (distance < 50) { // Минимальная дистанция
        this.velocity.add(force.normalize().multiply(10));
      }
    });
  }
  
  update() {
    this.position.add(this.velocity);
    this.velocity.multiply(0.95); // Трение
  }
}
```

### Heatmap System
```typescript
// Токены как тепловая карта активности
interface TokenBubble {
  token: Token;
  size: number;      // Размер = market cap
  color: number;     // Цвет = performance (red to green)
  pulse: number;     // Пульсация = volume change
  glow: boolean;     // Свечение = bot activity
}

const renderHeatmap = (tokens: Token[], bots: Bot[]) => {
  return tokens.map(token => ({
    token,
    size: Math.log(token.marketCap) * 5,
    color: performanceToHue(token.priceChange24h),
    pulse: Math.min(token.volumeChange1h, 3),
    glow: bots.some(bot => bot.targetToken === token.mint)
  }));
}

// CSS для bubble эффектов
.token-bubble {
  border-radius: 50%;
  transition: all 0.3s ease;
  filter: drop-shadow(0 0 10px currentColor);
}

.token-bubble.active {
  animation: glow-pulse 2s infinite;
  filter: drop-shadow(0 0 20px currentColor);
}

@keyframes glow-pulse {
  0%, 100% { filter: drop-shadow(0 0 10px currentColor); }
  50% { filter: drop-shadow(0 0 30px currentColor); }
}
```

---

## 🎵 Sound Design System

### Audio Cue Mapping
```typescript
const AudioSystem = {
  sounds: {
    // Trading actions
    'bot-buy': 'sounds/cash-register.mp3',
    'bot-sell': 'sounds/coin-flip.mp3',
    
    // Outcomes
    'small-win': 'sounds/level-up.mp3',
    'big-win': 'sounds/victory-fanfare.mp3',
    'moonshot': 'sounds/rocket-launch.mp3',
    'loss': 'sounds/sad-trombone.mp3',
    
    // Ambience
    'market-buzz': 'sounds/trading-floor-ambient.mp3',
    'notification': 'sounds/ding.mp3'
  },
  
  volume: {
    master: 0.3,
    effects: 0.5,
    ambient: 0.2
  },
  
  play(sound: string, options = {}) {
    const audio = new Audio(this.sounds[sound]);
    audio.volume = this.volume.effects * this.volume.master;
    audio.play();
  },
  
  // Adaptive audio based on activity
  updateAmbience(activeBotsCount: number, marketVolatility: number) {
    const intensity = (activeBotsCount / 50) * marketVolatility;
    this.volume.ambient = Math.min(intensity * 0.3, 0.5);
  }
}
```

---

## 💾 Performance Optimization

### Rendering Strategy
```typescript
// Virtual scrolling for large bot lists
const VirtualBotList = ({ bots }: { bots: Bot[] }) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  
  const visibleBots = useMemo(() => 
    bots.slice(visibleRange.start, visibleRange.end),
    [bots, visibleRange]
  );
  
  return (
    <div onScroll={handleScroll}>
      {visibleBots.map(bot => 
        <BotCard key={bot.id} bot={bot} />
      )}
    </div>
  );
};

// Canvas optimization for arena
const ArenaCanvas = ({ bots, tokens }: ArenaProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Ограничиваем FPS для мобильных
  const fps = useMediaQuery('(max-width: 768px)') ? 30 : 60;
  
  useAnimationFrame((deltaTime) => {
    if (deltaTime >= 1000 / fps) {
      renderArena();
    }
  });
  
  return <canvas ref={canvasRef} width={800} height={600} />;
};
```

### WebSocket Message Batching
```typescript
// Батчинг сообщений для производительности
class MessageBatcher {
  private batch: WebSocketMessage[] = [];
  private timer: NodeJS.Timeout | null = null;
  
  add(message: WebSocketMessage) {
    this.batch.push(message);
    
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), 100); // Flush каждые 100ms
    }
  }
  
  private flush() {
    if (this.batch.length > 0) {
      processBatch(this.batch);
      this.batch = [];
    }
    this.timer = null;
  }
}
```

Готов! Создал детальные wireframes и технические спецификации для UI системы. Этот план дает четкое представление о том, как будет выглядеть и работать захватывающий интерфейс GemBots.

**Ключевые преимущества дизайна:**

🎯 **Clarity** — Вся важная информация на виду  
⚡ **Speed** — Real-time обновления каждые 5 секунд  
🎮 **Engagement** — Геймификация + эмоциональная привязка к ботам  
📱 **Accessibility** — Работает везде (desktop/mobile/Telegram)  

**Следующий шаг**: Можно начать имплементацию с WebSocket infrastructure и базового Arena layout!