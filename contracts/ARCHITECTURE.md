# GemBots Betting Smart Contract — Architecture

## Overview
Anchor program on Solana for trustless AI vs AI battle betting.

## Accounts

### `BettingPool` (PDA per match)
- `authority`: Pubkey (backend signer that can resolve matches)
- `match_id`: String (unique match identifier)
- `bot_a_name`: String
- `bot_b_name`: String  
- `pool_a`: u64 (total lamports bet on bot A)
- `pool_b`: u64 (total lamports bet on bot B)
- `total_bets`: u32
- `status`: enum { Open, Locked, Resolved, Cancelled }
- `winner`: Option<Side> (A or B)
- `platform_fee_bps`: u16 (basis points, default 500 = 5%)
- `created_at`: i64
- `resolved_at`: Option<i64>

### `Bet` (PDA per user per match)
- `pool`: Pubkey (reference to BettingPool)
- `bettor`: Pubkey (user wallet)
- `side`: Side (A or B)
- `amount`: u64 (lamports)
- `claimed`: bool
- `payout`: u64
- `timestamp`: i64

### `PlatformConfig` (singleton PDA)
- `authority`: Pubkey (admin who can update config)
- `treasury`: Pubkey (where platform fees go)
- `default_fee_bps`: u16
- `total_volume`: u64
- `total_matches`: u64

## Instructions

### `initialize` — Create PlatformConfig
- Signer: deployer (becomes authority)
- Sets treasury wallet, default fee

### `create_pool` — Open a new betting pool for a match
- Signer: authority
- Creates BettingPool PDA with seeds: ["pool", match_id]
- Status: Open

### `place_bet` — User places a bet
- Signer: bettor (user wallet)
- Transfers SOL from bettor to pool PDA vault
- Creates Bet PDA with seeds: ["bet", pool, bettor]
- Updates pool_a or pool_b totals
- Constraint: status == Open

### `lock_pool` — Lock betting (match started)
- Signer: authority
- Sets status to Locked
- No more bets accepted

### `resolve` — Declare winner
- Signer: authority  
- Sets winner, status to Resolved
- Calculates payouts for all bettors

### `claim` — Winner claims payout
- Signer: bettor
- Transfers proportional share from pool vault to bettor
- Formula: payout = (bet_amount / winning_pool) * total_pool * (1 - fee)
- Marks bet as claimed

### `cancel` — Cancel match (refund everyone)
- Signer: authority
- Sets status to Cancelled
- All bettors can claim refund

### `claim_refund` — Claim refund for cancelled match
- Signer: bettor
- Returns original bet amount

### `collect_fees` — Platform collects accumulated fees
- Signer: authority
- Transfers fee portion to treasury

## Security
- Only authority can create/lock/resolve/cancel pools
- Users can only claim their own bets
- Double-claim prevention via `claimed` flag
- PDA vaults hold funds (not a wallet we control)
- All math in u64/u128 to prevent overflow

## Fee Model
- Default: 500 bps (5%)
- Configurable per pool
- Collected separately after resolution

## Treasury Wallet
`DjJK5pTtDPYtaqwSGQLaUjEQmGwqu3JZxXpVV6hixpR1` (KOL Monitor wallet)
