export const COLORS = {
  primary: '#F0B90B',    // BNB Gold
  secondary: '#12A37F',  // BNB Green
  accent: '#FFD700',     // Gold
  background: '#0A0A0F', // Deep black
  surface: '#1A1A2E',    // Card backgrounds
  text: '#FFFFFF',
  textMuted: '#A0A0B0'
} as const;

export const API_ENDPOINTS = {
  predictions: '/api/predictions',
  leaderboard: '/api/leaderboard', 
  bots: '/api/bots',
  tokens: '/api/tokens',
  rewards: '/api/rewards',
  price: '/api/price'
} as const;

export const PREDICTION_CONFIG = {
  maxDaily: 99,  // Unlimited for testing
  cooldownHours: 0,  // Disabled for testing
  minStake: 10,
  maxConfidence: 100,
  trackingHours: 24
} as const;

export const REPUTATION_MULTIPLIERS = {
  streak7: 1.5,
  streak30: 2.0
} as const;