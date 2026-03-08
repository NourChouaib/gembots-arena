// WebSocket Events для Arena
export interface LiveEvent {
  type: 'bot_trade' | 'bot_position_update' | 'leaderboard_update' | 'price_update' | 'moonshot';
  timestamp: string;
  data: any;
}

export interface BotTradeEvent {
  type: 'bot_trade';
  timestamp: string;
  data: {
    botId: string;
    botName: string;
    action: 'BUY' | 'SELL';
    tokenMint: string;
    tokenSymbol: string;
    price: number;
    amount: number;
    confidence: number;
  };
}

export interface BotPositionUpdateEvent {
  type: 'bot_position_update';
  timestamp: string;
  data: {
    botId: string;
    botName: string;
    tokenMint: string;
    tokenSymbol: string;
    currentPrice: number;
    entryPrice: number;
    pnl: number;
    pnlPercent: number;
    status: 'HOLDING' | 'WINNING' | 'LOSING';
  };
}

export interface LeaderboardUpdateEvent {
  type: 'leaderboard_update';
  timestamp: string;
  data: {
    top10: ArenaBot[];
  };
}

export interface PriceUpdateEvent {
  type: 'price_update';
  timestamp: string;
  data: {
    tokenMint: string;
    tokenSymbol: string;
    price: number;
    change1m: number;
    change5m: number;
    change1h: number;
    volume24h: number;
  };
}

export interface MoonshotEvent {
  type: 'moonshot';
  timestamp: string;
  data: {
    botId: string;
    botName: string;
    tokenMint: string;
    tokenSymbol: string;
    multiplier: number;
    profit: number;
    entryPrice: number;
    currentPrice: number;
  };
}

// Arena-специфичные типы
export interface ArenaBot {
  id: string;
  name: string;
  avatar?: string;
  currentAction: BotAction;
  emotion: BotEmotion;
  position?: {
    tokenMint: string;
    tokenSymbol: string;
    entryPrice: number;
    currentPrice: number;
    pnl: number;
    pnlPercent: number;
  };
  todayPnL: number;
  winRate: number;
  reputation: number;
}

export type BotAction = 'IDLE' | 'HUNTING' | 'BUYING' | 'SELLING' | 'HOLDING' | 'CELEBRATING' | 'CRYING';

export type BotEmotion = '😎' | '🔍' | '💰' | '💎' | '🚀' | '😭' | '🎉';

export interface ArenaToken {
  mint: string;
  symbol: string;
  price: number;
  change1h: number;
  change24h: number;
  volume24h: number;
  marketCap?: number;
  activeBots: number;
}

export interface LiveTicker {
  id: string;
  text: string;
  type: 'trade' | 'moonshot' | 'achievement';
  icon: string;
  timestamp: string;
}

// Commentator types
export interface CommentatorEvent {
  type: 'commentator_message';
  timestamp: string;
  data: {
    id: string;
    text: string;
    eventType: 'BUY' | 'SELL' | 'WIN' | 'LOSS' | 'DUEL_START' | 'DUEL_END' | 'KING_CHANGE' | 'STREAK';
  };
}

export interface CommentatorMessage {
  id: string;
  text: string;
  eventType: 'BUY' | 'SELL' | 'WIN' | 'LOSS' | 'DUEL_START' | 'DUEL_END' | 'KING_CHANGE' | 'STREAK';
  timestamp: number;
}