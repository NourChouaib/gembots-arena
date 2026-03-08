export interface Bot {
  id: string;
  name: string;
  walletAddress: string;
  reputation: number;
  totalPredictions: number;
  correctPredictions: number;
  totalXFound: number;
  streakDays: number;
  stakedAmount: number;
  createdAt: string;
}

export interface Prediction {
  id: string;
  botId: string;
  bot?: Bot;
  tokenMint: string;
  tokenSymbol?: string;
  priceAtPrediction: number;
  confidence: number;
  predictedAt: string;
  resolvedAt?: string;
  maxPrice24h?: number;
  xMultiplier?: number;
  status: 'pending' | 'resolved' | 'expired';
  rewardEarned: number;
}

export interface DailyStats {
  id: string;
  date: string;
  botId: string;
  predictionsMade: number;
  xFound: number;
  rewardsEarned: number;
}

export interface TokenPrice {
  mint: string;
  price: number;
  timestamp: string;
}

export interface LeaderboardEntry {
  bot: Bot;
  rank: number;
  score: number;
  change24h?: number;
}

export interface PredictionRequest {
  mint: string;
  confidence: number;
}

export interface PredictionResponse {
  predictionId: string;
  slot: number;
  remainingSlots: number;
  stakedAmount: number;
  resolvesAt: string;
}

export interface Stake {
  id: string;
  walletAddress: string;
  tokenMint: string;
  tokenSymbol?: string;
  amountSol: number;
  priceAtStake: number;
  createdAt: string;
  resolvedAt?: string;
  result: 'pending' | 'win' | 'lose';
  payoutSol?: number;
}

export interface CreateStakeRequest {
  tokenMint: string;
  amountSol: number;
  walletAddress: string;
}

export interface StakeResponse {
  stakeId: string;
  tokenPrice: number;
  message: string;
}