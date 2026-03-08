import { NextResponse } from 'next/server';

const DEFAULT_STRATEGIES = [
  {
    id: 'momentum_default',
    name: 'Momentum Rider',
    description: 'Ride the trend, catch the wave. Classic momentum following.',
    base_style: 'momentum',
    params: {
      entry_threshold: 0.005,
      exit_threshold: 0.003,
      trend_lookback: 5,
      position_size_pct: 50,
      max_hold_ticks: 8,
      stop_loss_pct: 3.0,
      take_profit_pct: 8.0,
      noise_factor: 0.01,
      boredom_trade_chance: 0.3,
    },
  },
  {
    id: 'mean_reversion_default',
    name: 'Mean Machine',
    description: 'Buy dips, sell rips — always revert to the mean.',
    base_style: 'mean_reversion',
    params: {
      entry_threshold: 0.005,
      exit_threshold: 0.005,
      trend_lookback: 5,
      position_size_pct: 50,
      max_hold_ticks: 9,
      stop_loss_pct: 4.0,
      take_profit_pct: 6.0,
      noise_factor: 0.01,
      boredom_trade_chance: 0.25,
    },
  },
  {
    id: 'scalper_default',
    name: 'Lightning Scalper',
    description: 'Lightning-fast micro trades with tight risk.',
    base_style: 'scalper',
    params: {
      entry_threshold: 0.001,
      exit_threshold: 0.001,
      trend_lookback: 3,
      position_size_pct: 25,
      max_hold_ticks: 3,
      stop_loss_pct: 1.5,
      take_profit_pct: 3.0,
      noise_factor: 0.005,
      boredom_trade_chance: 0.8,
    },
  },
  {
    id: 'swing_default',
    name: 'Swing King',
    description: 'Patient macro moves, big swings for big gains.',
    base_style: 'swing',
    params: {
      entry_threshold: 0.01,
      exit_threshold: 0.008,
      trend_lookback: 8,
      position_size_pct: 75,
      max_hold_ticks: 12,
      stop_loss_pct: 5.0,
      take_profit_pct: 12.0,
      noise_factor: 0.01,
      boredom_trade_chance: 0.15,
    },
  },
  {
    id: 'contrarian_default',
    name: 'Contrarian Wolf',
    description: 'Bet against the crowd. The herd is usually wrong.',
    base_style: 'contrarian',
    params: {
      entry_threshold: 0.005,
      exit_threshold: 0.008,
      trend_lookback: 5,
      position_size_pct: 50,
      max_hold_ticks: 7,
      stop_loss_pct: 3.0,
      take_profit_pct: 10.0,
      noise_factor: 0.01,
      boredom_trade_chance: 0.35,
    },
  },
];

export async function GET() {
  return NextResponse.json({
    strategies: DEFAULT_STRATEGIES,
    count: DEFAULT_STRATEGIES.length,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.base_style || !body.params) {
      return NextResponse.json(
        { error: 'Missing required fields: name, base_style, params' },
        { status: 400 }
      );
    }

    // Future: save to Supabase
    // For now, return the strategy back with an ID
    return NextResponse.json({
      success: true,
      strategy: {
        id: `custom_${Date.now()}`,
        ...body,
        created_at: new Date().toISOString(),
      },
      message: 'Strategy saved (in-memory only — Supabase integration coming soon)',
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }
}
