use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("ENAhq5nKQnQzjwj48bjUBefu8QvZ9vwArotgfWsbSax6");

// ============================================================================
// Constants
// ============================================================================

pub const MAX_MATCH_ID_LEN: usize = 64;
pub const MAX_BOT_NAME_LEN: usize = 32;
pub const MAX_FEE_BPS: u16 = 2000; // 20% max fee
pub const MIN_BET_LAMPORTS: u64 = 10_000_000; // 0.01 SOL
pub const MAX_BET_LAMPORTS: u64 = 100_000_000_000; // 100 SOL

// PDA seeds
pub const PLATFORM_SEED: &[u8] = b"platform";
pub const POOL_SEED: &[u8] = b"pool";
pub const BET_SEED: &[u8] = b"bet";
pub const VAULT_SEED: &[u8] = b"vault";

// ============================================================================
// Program
// ============================================================================

#[program]
pub mod gembots_betting {
    use super::*;

    /// Initialize the platform config (one-time setup by deployer).
    pub fn initialize(
        ctx: Context<Initialize>,
        treasury: Pubkey,
        default_fee_bps: u16,
    ) -> Result<()> {
        require!(default_fee_bps <= MAX_FEE_BPS, BettingError::FeeTooHigh);

        let config = &mut ctx.accounts.platform_config;
        config.authority = ctx.accounts.authority.key();
        config.treasury = treasury;
        config.default_fee_bps = default_fee_bps;
        config.total_volume = 0;
        config.total_matches = 0;
        config.bump = ctx.bumps.platform_config;

        emit!(PlatformInitialized {
            authority: config.authority,
            treasury: config.treasury,
            default_fee_bps: config.default_fee_bps,
        });

        Ok(())
    }

    /// Update platform config (authority only).
    pub fn update_config(
        ctx: Context<UpdateConfig>,
        new_treasury: Option<Pubkey>,
        new_fee_bps: Option<u16>,
        new_authority: Option<Pubkey>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.platform_config;

        if let Some(treasury) = new_treasury {
            config.treasury = treasury;
        }
        if let Some(fee_bps) = new_fee_bps {
            require!(fee_bps <= MAX_FEE_BPS, BettingError::FeeTooHigh);
            config.default_fee_bps = fee_bps;
        }
        if let Some(authority) = new_authority {
            config.authority = authority;
        }

        Ok(())
    }

    /// Create a new betting pool for a match.
    pub fn create_pool(
        ctx: Context<CreatePool>,
        match_id: String,
        bot_a_name: String,
        bot_b_name: String,
        custom_fee_bps: Option<u16>,
    ) -> Result<()> {
        require!(match_id.len() <= MAX_MATCH_ID_LEN, BettingError::MatchIdTooLong);
        require!(bot_a_name.len() <= MAX_BOT_NAME_LEN, BettingError::BotNameTooLong);
        require!(bot_b_name.len() <= MAX_BOT_NAME_LEN, BettingError::BotNameTooLong);

        let fee_bps = custom_fee_bps.unwrap_or(ctx.accounts.platform_config.default_fee_bps);
        require!(fee_bps <= MAX_FEE_BPS, BettingError::FeeTooHigh);

        let pool_key = ctx.accounts.betting_pool.key();
        let pool = &mut ctx.accounts.betting_pool;
        pool.authority = ctx.accounts.authority.key();
        pool.match_id = match_id.clone();
        pool.bot_a_name = bot_a_name;
        pool.bot_b_name = bot_b_name;
        pool.pool_a = 0;
        pool.pool_b = 0;
        pool.total_bets = 0;
        pool.status = PoolStatus::Open;
        pool.winner = None;
        pool.platform_fee_bps = fee_bps;
        pool.created_at = Clock::get()?.unix_timestamp;
        pool.resolved_at = None;
        pool.fees_collected = false;
        pool.bump = ctx.bumps.betting_pool;
        pool.vault_bump = ctx.bumps.vault;

        // Increment total matches on platform
        let config = &mut ctx.accounts.platform_config;
        config.total_matches = config.total_matches.checked_add(1).unwrap();

        emit!(PoolCreated {
            match_id,
            pool: pool_key,
            authority: pool.authority,
            fee_bps,
        });

        Ok(())
    }

    /// Place a bet on a side (A or B).
    pub fn place_bet(ctx: Context<PlaceBet>, side: Side, amount: u64) -> Result<()> {
        require!(amount >= MIN_BET_LAMPORTS, BettingError::BetTooSmall);
        require!(amount <= MAX_BET_LAMPORTS, BettingError::BetTooLarge);

        let pool = &ctx.accounts.betting_pool;
        require!(pool.status == PoolStatus::Open, BettingError::PoolNotOpen);

        // Transfer SOL from bettor to vault PDA
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.bettor.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            amount,
        )?;

        // Update pool totals
        let pool = &mut ctx.accounts.betting_pool;
        match side {
            Side::A => {
                pool.pool_a = pool.pool_a.checked_add(amount).ok_or(BettingError::Overflow)?;
            }
            Side::B => {
                pool.pool_b = pool.pool_b.checked_add(amount).ok_or(BettingError::Overflow)?;
            }
        }
        pool.total_bets = pool.total_bets.checked_add(1).ok_or(BettingError::Overflow)?;

        // Update platform volume
        let config = &mut ctx.accounts.platform_config;
        config.total_volume = config.total_volume.checked_add(amount).ok_or(BettingError::Overflow)?;

        // Initialize bet account
        let bet = &mut ctx.accounts.bet;
        bet.pool = ctx.accounts.betting_pool.key();
        bet.bettor = ctx.accounts.bettor.key();
        bet.side = side;
        bet.amount = amount;
        bet.claimed = false;
        bet.payout = 0;
        bet.timestamp = Clock::get()?.unix_timestamp;
        bet.bump = ctx.bumps.bet;

        emit!(BetPlaced {
            pool: bet.pool,
            bettor: bet.bettor,
            side,
            amount,
        });

        Ok(())
    }

    /// Lock the pool (no more bets, match is starting).
    pub fn lock_pool(ctx: Context<LockPool>) -> Result<()> {
        let pool_key = ctx.accounts.betting_pool.key();
        let pool = &mut ctx.accounts.betting_pool;
        require!(pool.status == PoolStatus::Open, BettingError::PoolNotOpen);

        pool.status = PoolStatus::Locked;

        emit!(PoolLocked {
            pool: pool_key,
            pool_a: pool.pool_a,
            pool_b: pool.pool_b,
            total_bets: pool.total_bets,
        });

        Ok(())
    }

    /// Resolve the match — declare a winner.
    pub fn resolve(ctx: Context<Resolve>, winner: Side) -> Result<()> {
        let pool_key = ctx.accounts.betting_pool.key();
        let pool = &mut ctx.accounts.betting_pool;
        require!(
            pool.status == PoolStatus::Open || pool.status == PoolStatus::Locked,
            BettingError::PoolNotResolvable
        );

        pool.status = PoolStatus::Resolved;
        pool.winner = Some(winner);
        pool.resolved_at = Some(Clock::get()?.unix_timestamp);

        emit!(PoolResolved {
            pool: pool_key,
            winner,
            pool_a: pool.pool_a,
            pool_b: pool.pool_b,
        });

        Ok(())
    }

    /// Winner claims their payout.
    /// Formula: payout = (bet_amount / winning_pool) * total_pool * (1 - fee)
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let pool = &ctx.accounts.betting_pool;
        let bet = &ctx.accounts.bet;

        require!(pool.status == PoolStatus::Resolved, BettingError::PoolNotResolved);
        require!(!bet.claimed, BettingError::AlreadyClaimed);

        let winner = pool.winner.ok_or(BettingError::NoWinner)?;
        require!(bet.side == winner, BettingError::NotWinner);

        let winning_pool = match winner {
            Side::A => pool.pool_a,
            Side::B => pool.pool_b,
        };

        // If nobody bet on the winning side (shouldn't happen if bet.side == winner), bail
        require!(winning_pool > 0, BettingError::EmptyPool);

        let total_pool = pool.pool_a.checked_add(pool.pool_b).ok_or(BettingError::Overflow)?;

        // Calculate payout using u128 to prevent overflow
        // payout = (bet_amount * total_pool * (10000 - fee_bps)) / (winning_pool * 10000)
        let payout = calculate_payout(
            bet.amount,
            total_pool,
            winning_pool,
            pool.platform_fee_bps,
        )?;

        require!(payout > 0, BettingError::ZeroPayout);

        // Transfer from vault PDA to bettor using invoke_signed
        let pool_key = ctx.accounts.betting_pool.key();
        let vault_seeds: &[&[u8]] = &[
            VAULT_SEED,
            pool_key.as_ref(),
            &[pool.vault_bump],
        ];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.bettor.to_account_info(),
                },
                &[vault_seeds],
            ),
            payout,
        )?;

        // Mark as claimed and record payout
        let bet = &mut ctx.accounts.bet;
        bet.claimed = true;
        bet.payout = payout;

        emit!(PayoutClaimed {
            pool: bet.pool,
            bettor: bet.bettor,
            payout,
        });

        Ok(())
    }

    /// Cancel match — all bettors can claim refunds.
    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        let pool_key = ctx.accounts.betting_pool.key();
        let pool = &mut ctx.accounts.betting_pool;
        require!(
            pool.status == PoolStatus::Open || pool.status == PoolStatus::Locked,
            BettingError::PoolNotCancellable
        );

        pool.status = PoolStatus::Cancelled;

        emit!(PoolCancelled {
            pool: pool_key,
            pool_a: pool.pool_a,
            pool_b: pool.pool_b,
        });

        Ok(())
    }

    /// Claim refund for a cancelled match.
    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        let pool = &ctx.accounts.betting_pool;
        let bet = &ctx.accounts.bet;

        require!(pool.status == PoolStatus::Cancelled, BettingError::PoolNotCancelled);
        require!(!bet.claimed, BettingError::AlreadyClaimed);
        require!(bet.amount > 0, BettingError::ZeroPayout);

        let refund_amount = bet.amount;

        // Transfer from vault PDA to bettor using invoke_signed
        let pool_key = ctx.accounts.betting_pool.key();
        let vault_seeds: &[&[u8]] = &[
            VAULT_SEED,
            pool_key.as_ref(),
            &[pool.vault_bump],
        ];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.bettor.to_account_info(),
                },
                &[vault_seeds],
            ),
            refund_amount,
        )?;

        // Mark as claimed
        let bet = &mut ctx.accounts.bet;
        bet.claimed = true;
        bet.payout = refund_amount;

        emit!(RefundClaimed {
            pool: bet.pool,
            bettor: bet.bettor,
            amount: refund_amount,
        });

        Ok(())
    }

    /// Collect platform fees from a resolved pool → treasury.
    pub fn collect_fees(ctx: Context<CollectFees>) -> Result<()> {
        let pool_key = ctx.accounts.betting_pool.key();
        let treasury_key = ctx.accounts.treasury.key();
        let pool = &ctx.accounts.betting_pool;

        require!(pool.status == PoolStatus::Resolved, BettingError::PoolNotResolved);
        require!(!pool.fees_collected, BettingError::FeesAlreadyCollected);

        let winner = pool.winner.ok_or(BettingError::NoWinner)?;
        let winning_pool = match winner {
            Side::A => pool.pool_a,
            Side::B => pool.pool_b,
        };

        // If the losing side had 0, no fees to collect
        let total_pool = pool.pool_a.checked_add(pool.pool_b).ok_or(BettingError::Overflow)?;
        let losing_pool = total_pool.checked_sub(winning_pool).ok_or(BettingError::Overflow)?;
        let fee_bps = pool.platform_fee_bps;

        if losing_pool == 0 {
            // No losers → no profit → no fee. Just mark collected.
            let pool = &mut ctx.accounts.betting_pool;
            pool.fees_collected = true;
            return Ok(());
        }

        // Fee = losing_pool * fee_bps / 10000
        let fee_amount = (losing_pool as u128)
            .checked_mul(fee_bps as u128)
            .ok_or(BettingError::Overflow)?
            .checked_div(10_000u128)
            .ok_or(BettingError::Overflow)? as u64;

        if fee_amount > 0 {
            // Transfer from vault PDA to treasury using invoke_signed
            let pool_pubkey = ctx.accounts.betting_pool.key();
            let vault_seeds: &[&[u8]] = &[
                VAULT_SEED,
                pool_pubkey.as_ref(),
                &[ctx.accounts.betting_pool.vault_bump],
            ];

            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.vault.to_account_info(),
                        to: ctx.accounts.treasury.to_account_info(),
                    },
                    &[vault_seeds],
                ),
                fee_amount,
            )?;
        }

        let pool = &mut ctx.accounts.betting_pool;
        pool.fees_collected = true;

        emit!(FeesCollected {
            pool: pool_key,
            treasury: treasury_key,
            amount: fee_amount,
        });

        Ok(())
    }

    /// Close a bet account and reclaim rent (only after claim/refund).
    pub fn close_bet(ctx: Context<CloseBet>) -> Result<()> {
        let bet = &ctx.accounts.bet;
        require!(bet.claimed, BettingError::NotYetClaimed);
        // Account will be closed by Anchor's `close` attribute
        Ok(())
    }
}

// ============================================================================
// Math helpers
// ============================================================================

/// Calculate payout for a winning bet.
/// Formula: payout = (bet_amount / winning_pool) * total_pool * (1 - fee_bps / 10000)
/// 
/// Rearranged to avoid precision loss:
/// payout = bet_amount * total_pool * (10000 - fee_bps) / (winning_pool * 10000)
///
/// All intermediate calculations use u128.
fn calculate_payout(
    bet_amount: u64,
    total_pool: u64,
    winning_pool: u64,
    fee_bps: u16,
) -> Result<u64> {
    let bet_amount = bet_amount as u128;
    let total_pool = total_pool as u128;
    let winning_pool = winning_pool as u128;
    let fee_multiplier = (10_000u128).checked_sub(fee_bps as u128).ok_or(BettingError::Overflow)?;

    let numerator = bet_amount
        .checked_mul(total_pool)
        .ok_or(BettingError::Overflow)?
        .checked_mul(fee_multiplier)
        .ok_or(BettingError::Overflow)?;

    let denominator = winning_pool
        .checked_mul(10_000u128)
        .ok_or(BettingError::Overflow)?;

    require!(denominator > 0, BettingError::EmptyPool);

    let payout = numerator
        .checked_div(denominator)
        .ok_or(BettingError::Overflow)?;

    // Ensure payout fits in u64
    require!(payout <= u64::MAX as u128, BettingError::Overflow);

    Ok(payout as u64)
}

// ============================================================================
// Account structures
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct PlatformConfig {
    /// Authority that can create pools, resolve, cancel, update config.
    pub authority: Pubkey,
    /// Treasury wallet where platform fees are sent.
    pub treasury: Pubkey,
    /// Default fee in basis points (500 = 5%).
    pub default_fee_bps: u16,
    /// Cumulative volume in lamports across all pools.
    pub total_volume: u64,
    /// Total number of matches created.
    pub total_matches: u64,
    /// PDA bump.
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BettingPool {
    /// Authority (backend) that can lock/resolve/cancel.
    pub authority: Pubkey,
    /// Unique match identifier.
    #[max_len(64)]
    pub match_id: String,
    /// Bot A display name.
    #[max_len(32)]
    pub bot_a_name: String,
    /// Bot B display name.
    #[max_len(32)]
    pub bot_b_name: String,
    /// Total lamports bet on side A.
    pub pool_a: u64,
    /// Total lamports bet on side B.
    pub pool_b: u64,
    /// Number of bets placed.
    pub total_bets: u32,
    /// Current pool status.
    pub status: PoolStatus,
    /// Winner side (set on resolve).
    pub winner: Option<Side>,
    /// Fee in basis points for this pool.
    pub platform_fee_bps: u16,
    /// Creation unix timestamp.
    pub created_at: i64,
    /// Resolution unix timestamp.
    pub resolved_at: Option<i64>,
    /// Whether fees have been collected from this pool.
    pub fees_collected: bool,
    /// PDA bump for pool.
    pub bump: u8,
    /// PDA bump for the vault.
    pub vault_bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Bet {
    /// The betting pool this bet belongs to.
    pub pool: Pubkey,
    /// The bettor's wallet.
    pub bettor: Pubkey,
    /// Which side the bet is on.
    pub side: Side,
    /// Amount in lamports.
    pub amount: u64,
    /// Whether winnings/refund have been claimed.
    pub claimed: bool,
    /// Actual payout (set on claim).
    pub payout: u64,
    /// Bet placement unix timestamp.
    pub timestamp: i64,
    /// PDA bump.
    pub bump: u8,
}

// ============================================================================
// Enums
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum PoolStatus {
    Open,
    Locked,
    Resolved,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum Side {
    A,
    B,
}

// ============================================================================
// Instruction Contexts
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + PlatformConfig::INIT_SPACE,
        seeds = [PLATFORM_SEED],
        bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        seeds = [PLATFORM_SEED],
        bump = platform_config.bump,
        has_one = authority,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct CreatePool<'info> {
    #[account(
        mut,
        seeds = [PLATFORM_SEED],
        bump = platform_config.bump,
        has_one = authority,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        init,
        payer = authority,
        space = 8 + BettingPool::INIT_SPACE,
        seeds = [POOL_SEED, match_id.as_bytes()],
        bump,
    )]
    pub betting_pool: Account<'info, BettingPool>,

    /// CHECK: Vault PDA that holds the pool's SOL. 
    /// It's a plain system account used as an escrow.
    #[account(
        mut,
        seeds = [VAULT_SEED, betting_pool.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(
        mut,
        seeds = [PLATFORM_SEED],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        mut,
        seeds = [POOL_SEED, betting_pool.match_id.as_bytes()],
        bump = betting_pool.bump,
    )]
    pub betting_pool: Account<'info, BettingPool>,

    /// CHECK: Vault PDA for this pool.
    #[account(
        mut,
        seeds = [VAULT_SEED, betting_pool.key().as_ref()],
        bump = betting_pool.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        init,
        payer = bettor,
        space = 8 + Bet::INIT_SPACE,
        seeds = [BET_SEED, betting_pool.key().as_ref(), bettor.key().as_ref()],
        bump,
    )]
    pub bet: Account<'info, Bet>,

    #[account(mut)]
    pub bettor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LockPool<'info> {
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform_config.bump,
        has_one = authority,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        mut,
        seeds = [POOL_SEED, betting_pool.match_id.as_bytes()],
        bump = betting_pool.bump,
    )]
    pub betting_pool: Account<'info, BettingPool>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct Resolve<'info> {
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform_config.bump,
        has_one = authority,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        mut,
        seeds = [POOL_SEED, betting_pool.match_id.as_bytes()],
        bump = betting_pool.bump,
    )]
    pub betting_pool: Account<'info, BettingPool>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(
        seeds = [POOL_SEED, betting_pool.match_id.as_bytes()],
        bump = betting_pool.bump,
    )]
    pub betting_pool: Account<'info, BettingPool>,

    /// CHECK: Vault PDA for this pool.
    #[account(
        mut,
        seeds = [VAULT_SEED, betting_pool.key().as_ref()],
        bump = betting_pool.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [BET_SEED, betting_pool.key().as_ref(), bettor.key().as_ref()],
        bump = bet.bump,
        has_one = bettor,
        has_one = pool @ BettingError::BetPoolMismatch,
    )]
    pub bet: Account<'info, Bet>,

    /// The pool pubkey constraint on the bet.
    /// CHECK: We use has_one on bet to ensure pool == betting_pool.
    #[account(address = betting_pool.key())]
    pub pool: AccountInfo<'info>,

    #[account(mut)]
    pub bettor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Cancel<'info> {
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform_config.bump,
        has_one = authority,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        mut,
        seeds = [POOL_SEED, betting_pool.match_id.as_bytes()],
        bump = betting_pool.bump,
    )]
    pub betting_pool: Account<'info, BettingPool>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(
        seeds = [POOL_SEED, betting_pool.match_id.as_bytes()],
        bump = betting_pool.bump,
    )]
    pub betting_pool: Account<'info, BettingPool>,

    /// CHECK: Vault PDA for this pool.
    #[account(
        mut,
        seeds = [VAULT_SEED, betting_pool.key().as_ref()],
        bump = betting_pool.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [BET_SEED, betting_pool.key().as_ref(), bettor.key().as_ref()],
        bump = bet.bump,
        has_one = bettor,
        has_one = pool @ BettingError::BetPoolMismatch,
    )]
    pub bet: Account<'info, Bet>,

    /// CHECK: Pool pubkey constraint.
    #[account(address = betting_pool.key())]
    pub pool: AccountInfo<'info>,

    #[account(mut)]
    pub bettor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CollectFees<'info> {
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform_config.bump,
        has_one = authority,
        has_one = treasury,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        mut,
        seeds = [POOL_SEED, betting_pool.match_id.as_bytes()],
        bump = betting_pool.bump,
    )]
    pub betting_pool: Account<'info, BettingPool>,

    /// CHECK: Vault PDA for this pool.
    #[account(
        mut,
        seeds = [VAULT_SEED, betting_pool.key().as_ref()],
        bump = betting_pool.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    /// CHECK: Treasury wallet to receive fees. Validated by has_one on platform_config.
    #[account(mut)]
    pub treasury: AccountInfo<'info>,

    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseBet<'info> {
    #[account(
        seeds = [POOL_SEED, betting_pool.match_id.as_bytes()],
        bump = betting_pool.bump,
    )]
    pub betting_pool: Account<'info, BettingPool>,

    #[account(
        mut,
        seeds = [BET_SEED, betting_pool.key().as_ref(), bettor.key().as_ref()],
        bump = bet.bump,
        has_one = bettor,
        close = bettor,
    )]
    pub bet: Account<'info, Bet>,

    #[account(mut)]
    pub bettor: Signer<'info>,
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct PlatformInitialized {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub default_fee_bps: u16,
}

#[event]
pub struct PoolCreated {
    pub match_id: String,
    pub pool: Pubkey,
    pub authority: Pubkey,
    pub fee_bps: u16,
}

#[event]
pub struct BetPlaced {
    pub pool: Pubkey,
    pub bettor: Pubkey,
    pub side: Side,
    pub amount: u64,
}

#[event]
pub struct PoolLocked {
    pub pool: Pubkey,
    pub pool_a: u64,
    pub pool_b: u64,
    pub total_bets: u32,
}

#[event]
pub struct PoolResolved {
    pub pool: Pubkey,
    pub winner: Side,
    pub pool_a: u64,
    pub pool_b: u64,
}

#[event]
pub struct PayoutClaimed {
    pub pool: Pubkey,
    pub bettor: Pubkey,
    pub payout: u64,
}

#[event]
pub struct PoolCancelled {
    pub pool: Pubkey,
    pub pool_a: u64,
    pub pool_b: u64,
}

#[event]
pub struct RefundClaimed {
    pub pool: Pubkey,
    pub bettor: Pubkey,
    pub amount: u64,
}

#[event]
pub struct FeesCollected {
    pub pool: Pubkey,
    pub treasury: Pubkey,
    pub amount: u64,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum BettingError {
    #[msg("Fee exceeds maximum allowed (20%)")]
    FeeTooHigh,

    #[msg("Match ID too long (max 64 chars)")]
    MatchIdTooLong,

    #[msg("Bot name too long (max 32 chars)")]
    BotNameTooLong,

    #[msg("Bet amount too small (min 0.01 SOL)")]
    BetTooSmall,

    #[msg("Bet amount too large (max 100 SOL)")]
    BetTooLarge,

    #[msg("Pool is not open for betting")]
    PoolNotOpen,

    #[msg("Pool is not in a resolvable state")]
    PoolNotResolvable,

    #[msg("Pool is not resolved")]
    PoolNotResolved,

    #[msg("Pool is not cancelled")]
    PoolNotCancelled,

    #[msg("Pool is not in a cancellable state")]
    PoolNotCancellable,

    #[msg("Bet already claimed")]
    AlreadyClaimed,

    #[msg("No winner set")]
    NoWinner,

    #[msg("Bettor is not on the winning side")]
    NotWinner,

    #[msg("Winning pool is empty")]
    EmptyPool,

    #[msg("Arithmetic overflow")]
    Overflow,

    #[msg("Zero payout")]
    ZeroPayout,

    #[msg("Insufficient funds in vault")]
    InsufficientVaultFunds,

    #[msg("Fees already collected for this pool")]
    FeesAlreadyCollected,

    #[msg("Bet does not belong to this pool")]
    BetPoolMismatch,

    #[msg("Bet not yet claimed — cannot close")]
    NotYetClaimed,
}
