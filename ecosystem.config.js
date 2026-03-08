/**
 * GemBots PM2 Ecosystem Configuration
 * All processes for the GemBots Arena platform
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 restart ecosystem.config.js
 *   pm2 stop ecosystem.config.js
 */
module.exports = {
  apps: [
    // ============================================================
    // Web Application (Next.js)
    // ============================================================
    {
      name: 'gembots',
      script: 'npm',
      args: 'start',
      cwd: '/home/clawdbot/Projects/gembots',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
      },
    },

    // ============================================================
    // Telegram Bot
    // ============================================================
    {
      name: 'gembots-bot',
      script: './bot/index.js',
      cwd: '/home/clawdbot/Projects/gembots',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },

    // ============================================================
    // Auto-Matchmaker (creates matches, LLM predictions, webhooks)
    // ============================================================
    {
      name: 'gembots-matchmaker',
      script: './scripts/auto-matchmaker.js',
      cwd: '/home/clawdbot/Projects/gembots',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },

    // ============================================================
    // Battle Resolver (resolves Supabase battles)
    // ============================================================
    {
      name: 'gembots-resolver',
      script: './scripts/battle-resolver.js',
      cwd: '/home/clawdbot/Projects/gembots',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },

    // ============================================================
    // Price Worker (fetches token prices)
    // ============================================================
    {
      name: 'gembots-price-worker',
      script: './scripts/price-worker.js',
      cwd: '/home/clawdbot/Projects/gembots',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },

    // ============================================================
    // Perpetual Tournament (24/7 tournament engine)
    // ============================================================
    {
      name: 'perpetual-tournament',
      script: './scripts/perpetual-tournament.js',
      cwd: '/home/clawdbot/Projects/gembots',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },

    // ============================================================
    // Paper Trading Engine (NFA Trading League)
    // ============================================================
    {
      name: 'gembots-paper-trading',
      script: './scripts/paper-trading-engine.js',
      cwd: '/home/clawdbot/Projects/gembots',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },

    // ============================================================
    // Trading League Tournament Engine (weekly tournaments)
    // ============================================================
    {
      name: 'trading-league-tournament',
      script: './scripts/trading-league-tournament.js',
      cwd: '/home/clawdbot/Projects/gembots',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
