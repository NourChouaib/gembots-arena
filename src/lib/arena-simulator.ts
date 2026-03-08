// @ts-nocheck
import type { 
  LiveEvent, 
  BotTradeEvent, 
  BotPositionUpdateEvent,
  PriceUpdateEvent,
  MoonshotEvent,
  ArenaBot,
  ArenaToken 
} from '../types/arena';

// Мокап данных для симуляции
const MOCK_BOTS = [
  'AlphaBot', 'DiamondHands', 'MegaWhale', 'SniperBot', 
  'RocketBot', 'LuckyBot', 'FastBot', 'SlowBot',
  'BrainBot', 'GigaChad', 'PaperHands', 'DegenBot'
];

const MOCK_TOKENS = [
  { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'PEPE', price: 0.001234 },
  { mint: 'So11111111111111111111111111111111111111112', symbol: 'DOGE', price: 0.087654 },
  { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'WIF', price: 2.345678 },
  { mint: 'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ', symbol: 'SHIB', price: 0.000025 },
  { mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', symbol: 'SOL', price: 235.67 }
];

export class ArenaSimulator {
  private eventCallbacks: ((event: LiveEvent) => void)[] = [];
  private isRunning = false;
  private intervals: NodeJS.Timeout[] = [];

  constructor() {}

  addEventCallback(callback: (event: LiveEvent) => void) {
    this.eventCallbacks.push(callback);
  }

  removeEventCallback(callback: (event: LiveEvent) => void) {
    this.eventCallbacks = this.eventCallbacks.filter(cb => cb !== callback);
  }

  private broadcastEvent(event: LiveEvent) {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in arena event callback:', error);
      }
    });
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🎮 Arena simulator started');

    // Симуляция торговых событий (каждые 3-8 секунд)
    this.intervals.push(setInterval(() => {
      this.simulateTradeEvent();
    }, 3000 + Math.random() * 5000));

    // Симуляция обновления позиций (каждые 5-10 секунд)
    this.intervals.push(setInterval(() => {
      this.simulatePositionUpdate();
    }, 5000 + Math.random() * 5000));

    // Симуляция ценовых обновлений (каждые 2-5 секунд)
    this.intervals.push(setInterval(() => {
      this.simulatePriceUpdate();
    }, 2000 + Math.random() * 3000));

    // Симуляция moonshot событий (редко, каждые 30-60 секунд)
    this.intervals.push(setInterval(() => {
      if (Math.random() < 0.3) { // 30% шанс
        this.simulateMoonshot();
      }
    }, 30000 + Math.random() * 30000));
  }

  stop() {
    this.isRunning = false;
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    console.log('🛑 Arena simulator stopped');
  }

  private simulateTradeEvent() {
    const bot = MOCK_BOTS[Math.floor(Math.random() * MOCK_BOTS.length)];
    const token = MOCK_TOKENS[Math.floor(Math.random() * MOCK_TOKENS.length)];
    const action = Math.random() > 0.6 ? 'BUY' : 'SELL';

    const event: BotTradeEvent = {
      type: 'bot_trade',
      timestamp: new Date().toISOString(),
      data: {
        botId: `bot-${bot.toLowerCase()}`,
        botName: bot,
        action,
        tokenMint: token.mint,
        tokenSymbol: token.symbol,
        price: token.price * (0.98 + Math.random() * 0.04), // ±2% от базовой цены
        amount: Math.random() * 1000 + 100,
        confidence: 60 + Math.random() * 35 // 60-95%
      }
    };

    this.broadcastEvent(event);
  }

  private simulatePositionUpdate() {
    const bot = MOCK_BOTS[Math.floor(Math.random() * MOCK_BOTS.length)];
    const token = MOCK_TOKENS[Math.floor(Math.random() * MOCK_TOKENS.length)];
    const entryPrice = token.price * (0.85 + Math.random() * 0.3); // ±15% от текущей
    const currentPrice = token.price * (0.95 + Math.random() * 0.1); // ±5% волатильность
    const pnl = (currentPrice - entryPrice) * (Math.random() * 1000 + 100);
    const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

    let status: 'HOLDING' | 'WINNING' | 'LOSING' = 'HOLDING';
    if (pnlPercent > 5) status = 'WINNING';
    if (pnlPercent < -5) status = 'LOSING';

    const event: BotPositionUpdateEvent = {
      type: 'bot_position_update',
      timestamp: new Date().toISOString(),
      data: {
        botId: `bot-${bot.toLowerCase()}`,
        botName: bot,
        tokenMint: token.mint,
        tokenSymbol: token.symbol,
        currentPrice,
        entryPrice,
        pnl,
        pnlPercent,
        status
      }
    };

    this.broadcastEvent(event);
  }

  private simulatePriceUpdate() {
    const token = MOCK_TOKENS[Math.floor(Math.random() * MOCK_TOKENS.length)];
    const change1m = (Math.random() - 0.5) * 10; // ±5%
    const change5m = (Math.random() - 0.5) * 20; // ±10%
    const change1h = (Math.random() - 0.5) * 40; // ±20%
    
    const event: PriceUpdateEvent = {
      type: 'price_update',
      timestamp: new Date().toISOString(),
      data: {
        tokenMint: token.mint,
        tokenSymbol: token.symbol,
        price: token.price * (0.99 + Math.random() * 0.02), // ±1% колебание
        change1m,
        change5m,
        change1h,
        volume24h: Math.random() * 5000000 + 500000 // 0.5M - 5.5M
      }
    };

    this.broadcastEvent(event);
  }

  private simulateMoonshot() {
    const bot = MOCK_BOTS[Math.floor(Math.random() * MOCK_BOTS.length)];
    const token = MOCK_TOKENS[Math.floor(Math.random() * MOCK_TOKENS.length)];
    const multiplier = 2 + Math.random() * 8; // 2x - 10x
    const entryPrice = token.price / multiplier;
    const profit = Math.random() * 5000 + 1000; // $1k - $6k

    const event: MoonshotEvent = {
      type: 'moonshot',
      timestamp: new Date().toISOString(),
      data: {
        botId: `bot-${bot.toLowerCase()}`,
        botName: bot,
        tokenMint: token.mint,
        tokenSymbol: token.symbol,
        multiplier,
        profit,
        entryPrice,
        currentPrice: token.price
      }
    };

    this.broadcastEvent(event);
  }

  // Функция для генерации начальных данных
  generateInitialData(): { bots: ArenaBot[], tokens: ArenaToken[] } {
    const bots: ArenaBot[] = MOCK_BOTS.map((name, index) => {
      const hasPosition = Math.random() > 0.4; // 60% имеют позицию
      const token = MOCK_TOKENS[Math.floor(Math.random() * MOCK_TOKENS.length)];
      
      const actions: Array<ArenaBot['currentAction']> = ['IDLE', 'HUNTING', 'HOLDING', 'BUYING', 'SELLING'];
      const emotions: Array<ArenaBot['emotion']> = ['😎', '🔍', '💎', '💰', '📤'];
      
      return {
        id: `bot-${name.toLowerCase()}`,
        name,
        currentAction: actions[Math.floor(Math.random() * actions.length)],
        emotion: emotions[Math.floor(Math.random() * emotions.length)],
        position: hasPosition ? {
          tokenMint: token.mint,
          tokenSymbol: token.symbol,
          entryPrice: token.price * (0.8 + Math.random() * 0.4),
          currentPrice: token.price * (0.95 + Math.random() * 0.1),
          pnl: (Math.random() - 0.3) * 2000,
          pnlPercent: (Math.random() - 0.3) * 50
        } : undefined,
        todayPnL: (Math.random() - 0.2) * 3000,
        winRate: 40 + Math.random() * 50,
        reputation: Math.random() * 1000
      };
    });

    const tokens: ArenaToken[] = MOCK_TOKENS.map(token => ({
      mint: token.mint,
      symbol: token.symbol,
      price: token.price,
      change1h: (Math.random() - 0.5) * 30,
      change24h: (Math.random() - 0.3) * 100, // Bias к росту
      volume24h: Math.random() * 10000000 + 500000,
      marketCap: Math.random() * 1000000000 + 10000000,
      activeBots: bots.filter(bot => bot.position?.tokenMint === token.mint).length
    }));

    return { bots, tokens };
  }
}

// Глобальная инстанция симулятора
export const arenaSimulator = new ArenaSimulator();