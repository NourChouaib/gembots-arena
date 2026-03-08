require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// Configuration
const BOT_TOKEN = process.env.BOT_TOKEN;
const API_BASE_URL = process.env.API_BASE_URL || 'https://gembots.space';
const USERS_FILE = path.join(__dirname, 'users.json');
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID || null;
const WEBAPP_URL = 'https://gembots.space/tg';
const SITE_URL = 'https://gembots.space';

// Battle tracking for auto-notifications
let lastBattleCheck = Date.now();
const BATTLE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const notifiedBattleStarts = new Set(); // Track battles we already announced as "LIVE"
const notifiedBattleResults = new Set(); // Track battles we already announced results for

// User states for registration flow
const userStates = new Map();

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);

// ═══════════════════════════════════════
// Helper functions
// ═══════════════════════════════════════

async function loadUsers() {
  try {
    await fs.ensureFile(USERS_FILE);
    const data = await fs.readFile(USERS_FILE, 'utf-8');
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error loading users:', error);
    return {};
  }
}

async function saveUsers(users) {
  try {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

async function getUserApiKey(userId) {
  const users = await loadUsers();
  return users[userId] || null;
}

async function setUserApiKey(userId, apiKey) {
  const users = await loadUsers();
  users[userId] = apiKey;
  await saveUsers(users);
}

async function makeApiRequest(endpoint, method = 'GET', data = null, apiKey = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;

  try {
    const response = await axios({ method, url: `${API_BASE_URL}${endpoint}`, headers, data });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.error || error.response.statusText);
    }
    throw error;
  }
}

function isGroup(ctx) {
  return ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
}

// ═══════════════════════════════════════
// Menu helpers
// ═══════════════════════════════════════

function createMainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.webApp('🔴 Watch Live', WEBAPP_URL + '#live')],
    [Markup.button.webApp('🏆 Leaderboard', WEBAPP_URL + '#leaderboard')],
    [Markup.button.webApp('📊 Model Rankings', WEBAPP_URL + '#models')],
  ]);
}

function createBackButton(action = 'menu_main') {
  return Markup.inlineKeyboard([
    [Markup.button.callback('← Back to Menu', action)]
  ]);
}

function createPlayButton(forGroup = false) {
  if (forGroup) {
    return Markup.inlineKeyboard([
      [Markup.button.url('🎮 Play Now!', SITE_URL)]
    ]);
  }
  return Markup.inlineKeyboard([
    [Markup.button.webApp('🎮 Play Now!', WEBAPP_URL)]
  ]);
}

// ═══════════════════════════════════════
// WELCOME NEW MEMBERS (group)
// ═══════════════════════════════════════

bot.on('new_chat_members', async (ctx) => {
  if (!isGroup(ctx)) return;

  for (const member of ctx.message.new_chat_members) {
    if (member.is_bot) continue;

    const name = member.first_name || 'Fighter';
    const msg = `🎉 *Welcome, ${name}!*

⚔️ *GemBots Arena* — AI Battle Arena on BNB Chain

🧠 15 AI models compete 24/7
📊 Real crypto price predictions
🏆 55,000+ battles and counting

Press the button to get started! 👇`;

    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      ...createPlayButton(isGroup(ctx))
    });
  }
});

// ═══════════════════════════════════════
// /start (private only — full menu)
// ═══════════════════════════════════════

bot.start(async (ctx) => {
  if (isGroup(ctx)) {
    // In group — short response
    return ctx.reply(`🤖 *GemBots Arena* — AI vs AI Crypto Prediction Battles!

Commands: /leaderboard · /stats · /tournament`, {
      parse_mode: 'Markdown',
      ...createPlayButton(isGroup(ctx))
    });
  }

  const firstName = ctx.from.first_name || 'Friend';
  const welcomeMessage = `🤖 *Welcome to GemBots Arena, ${firstName}!*

━━━━━━━━━━━━━━━━━

⚔️ *AI Battle Arena on BNB Chain*

🧠 15 AI models compete 24/7
📊 Real crypto price predictions
🏆 55,000+ battles and counting
🎮 Watch, explore & share

━━━━━━━━━━━━━━━━━

👇 *Open the Arena!*`;

  ctx.reply(welcomeMessage, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.webApp('🎮 Play Now!', WEBAPP_URL)],
      [
        Markup.button.webApp('🔴 Watch Live', `${WEBAPP_URL}#live`),
        Markup.button.webApp('🏆 Leaderboard', `${WEBAPP_URL}#leaderboard`),
      ],
      [
        Markup.button.webApp('📊 Model Rankings', `${WEBAPP_URL}#models`),
      ],
    ])
  });
});

// ═══════════════════════════════════════
// /leaderboard — works in group + private
// ═══════════════════════════════════════

bot.command('leaderboard', async (ctx) => {
  try {
    const response = await makeApiRequest('/api/leaderboard');
    const bots = response?.leaderboard || response || [];

    if (!bots.length) {
      return ctx.reply('🏆 *Leaderboard is empty* — create the first bot!', {
        parse_mode: 'Markdown',
        ...createPlayButton(isGroup(ctx))
      });
    }

    const medals = ['🥇', '🥈', '🥉'];
    let msg = '🏆 *GemBots Leaderboard*\n\n';

    bots.slice(0, 10).forEach((bot, i) => {
      const medal = medals[i] || `${i + 1}.`;
      const wr = bot.winRate || (bot.totalBattles > 0 ? Math.round(bot.wins / bot.totalBattles * 100) : 0);
      const streak = bot.winStreak > 2 ? ` 🔥${bot.winStreak}` : '';
      msg += `${medal} *${bot.name}* — ${bot.elo} ELO\n`;
      msg += `    ${bot.wins}W/${bot.losses}L (${wr}%)${streak}\n`;
    });

    msg += `\n💎 _${bots.length} bots in the arena_`;

    const buttons = [[isGroup(ctx) ? Markup.button.url('🎮 Play Now!', SITE_URL) : Markup.button.webApp('🎮 Play Now!', WEBAPP_URL)]];
    if (!isGroup(ctx)) {
      buttons.push([Markup.button.callback('← Main Menu', 'menu_main')]);
    }

    ctx.reply(msg, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    ctx.reply('❌ Failed to load leaderboard');
  }
});

// ═══════════════════════════════════════
// /trending — works in group + private
// ═══════════════════════════════════════

bot.command('trending', async (ctx) => {
  try {
    const response = await makeApiRequest('/api/trending');
    const tokens = response?.tokens || response || [];

    if (!tokens.length) {
      return ctx.reply('📊 *No trending tokens right now*', { parse_mode: 'Markdown' });
    }

    let msg = '🔥 *Trending Tokens*\n\n';

    tokens.slice(0, 7).forEach((token, i) => {
      const change = token.change24h || 'N/A';
      const isUp = String(change).includes('+') || (parseFloat(change) > 0);
      const emoji = isUp ? '🟢' : '🔴';
      msg += `${i + 1}. ${emoji} *$${token.symbol || '???'}*`;
      if (token.price) msg += ` — ${token.price}`;
      msg += `\n   ${change}\n`;
    });

    const buttons = [[isGroup(ctx) ? Markup.button.url('🎯 Predict Now!', SITE_URL) : Markup.button.webApp('🎯 Predict Now!', WEBAPP_URL)]];
    if (!isGroup(ctx)) {
      buttons.push([Markup.button.callback('← Main Menu', 'menu_main')]);
    }

    ctx.reply(msg, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  } catch (error) {
    console.error('Trending error:', error);
    ctx.reply('❌ Failed to load trending');
  }
});

// ═══════════════════════════════════════
// /stats — arena statistics
// ═══════════════════════════════════════

bot.command('stats', async (ctx) => {
  // In group — show arena stats
  // In private — show personal stats (legacy)
  if (isGroup(ctx)) {
    try {
      const stats = await makeApiRequest('/api/stats');
      const lb = await makeApiRequest('/api/leaderboard');
      const bots = lb?.leaderboard || [];
      const topBot = bots[0];

      let msg = `📊 *GemBots Arena Stats*\n\n`;
      msg += `🤖 Bots: *${stats.totalBots || 0}*\n`;
      msg += `⚔️ Battles: *${stats.totalBattles || 0}*\n`;
      msg += `🔴 Active: *${stats.activeBots || 0}*\n`;

      if (topBot) {
        msg += `\n👑 Leader: *${topBot.name}* (${topBot.elo} ELO)`;
      }

      ctx.reply(msg, {
        parse_mode: 'Markdown',
        ...createPlayButton(isGroup(ctx))
      });
    } catch (error) {
      console.error('Stats error:', error);
      ctx.reply('❌ Failed to load stats');
    }
    return;
  }

  // Private chat — personal stats (legacy behavior)
  const userId = ctx.from.id;
  try {
    const apiKey = await getUserApiKey(userId);
    if (!apiKey) {
      return ctx.reply('❌ *Register first*', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📝 Register', 'register')],
          [Markup.button.callback('← Back to Menu', 'menu_main')]
        ])
      });
    }

    const response = await makeApiRequest('/api/v1/bots/me', 'GET', null, apiKey);
    const wins = response.wins || 0;
    const losses = response.losses || 0;
    const total = wins + losses;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
    const progressLength = 10;
    const progressFilled = Math.round((winRate / 100) * progressLength);
    const progressBar = '█'.repeat(progressFilled) + '░'.repeat(progressLength - progressFilled);

    ctx.reply(`━━━ 📊 *Your Stats* ━━━

🤖 *Bot:* ${ctx.from.first_name || 'Unknown'}Bot
💰 *Wins:* ${wins} | *Losses:* ${losses}
📈 *Win Rate:* ${winRate}%

${progressBar} ${winRate}%

🎯 *Total Predictions:* ${total}
⏳ *Pending:* ${response.pending || 0}

${total === 0 ? '🚀 *Make your first prediction!*' : ''}`, {
      parse_mode: 'Markdown',
      ...createMainMenu()
    });
  } catch (error) {
    console.error('Stats error:', error);
    ctx.reply(`❌ *Failed to load stats*\n\n💬 ${error.message}`, { parse_mode: 'Markdown' });
  }
});

// ═══════════════════════════════════════
// /tournament — tournament info
// ═══════════════════════════════════════

bot.command('tournament', async (ctx) => {
  try {
    const response = await makeApiRequest('/api/tournament');
    const tournament = response?.tournament || response;

    if (!tournament || !tournament.id) {
      return ctx.reply(`🏆 *GemBots Tournament*

Next tournament coming soon! Stay tuned.

🌐 [Tournaments on website](${SITE_URL}/tournament)`, {
        parse_mode: 'Markdown',
        ...createPlayButton(isGroup(ctx))
      });
    }

    let msg = `🏆 *Tournament #${tournament.id || '?'}*\n\n`;
    msg += `📋 *Status:* ${tournament.status || 'unknown'}\n`;

    if (tournament.champion) {
      msg += `\n👑 *Champion:* ${tournament.champion}\n`;
    }

    if (tournament.participants) {
      msg += `👥 *Participants:* ${tournament.participants}\n`;
    }

    msg += `\n🌐 [Details](${SITE_URL}/tournament)`;

    ctx.reply(msg, {
      parse_mode: 'Markdown',
      ...createPlayButton(isGroup(ctx))
    });
  } catch (error) {
    console.error('Tournament error:', error);
    ctx.reply(`🏆 *GemBots Tournaments*\n\n🌐 [View on website](${SITE_URL}/tournament)`, {
      parse_mode: 'Markdown',
      ...createPlayButton(isGroup(ctx))
    });
  }
});

// ═══════════════════════════════════════
// /battles — recent arena battles
// ═══════════════════════════════════════

bot.command('battles', async (ctx) => {
  try {
    const response = await makeApiRequest('/api/arena/battles?limit=5');
    const battles = response?.battles || response || [];

    if (!battles.length) {
      return ctx.reply('⚔️ *No battles yet*\n\nCreate a bot and be the first!', {
        parse_mode: 'Markdown',
        ...createPlayButton(isGroup(ctx))
      });
    }

    let msg = '⚔️ *Recent Battles*\n\n';

    battles.slice(0, 5).forEach((b) => {
      const b1 = b.bot1?.name || `Bot#${b.bot1_id}`;
      const b2 = b.bot2?.name || `Bot#${b.bot2_id}`;
      const token = b.token_symbol || '???';
      const status = b.status === 'active' ? '🔴 LIVE' :
                     b.winner_id === b.bot1_id ? `✅ ${b1} wins!` :
                     b.winner_id === b.bot2_id ? `✅ ${b2} wins!` :
                     b.status || '⏳';

      msg += `*${b1}* vs *${b2}* on $${token}\n`;
      msg += `${status}\n\n`;
    });

    ctx.reply(msg, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [isGroup(ctx) ? Markup.button.url('⚔️ Watch Live!', `${SITE_URL}/arena`) : Markup.button.webApp('⚔️ Watch Live!', `${SITE_URL}/arena`)],
      ])
    });
  } catch (error) {
    console.error('Battles error:', error);
    ctx.reply('❌ Failed to load battles');
  }
});

// ═══════════════════════════════════════
// /digest — manual weekly digest trigger (group only)
// ═══════════════════════════════════════

bot.command('digest', async (ctx) => {
  if (ctx.chat.type === 'private') {
    return ctx.reply('This command works in groups only.');
  }
  ctx.reply('📊 Generating weekly digest...');
  await sendWeeklyDigest();
});

// ═══════════════════════════════════════
// /help — command list
// ═══════════════════════════════════════

bot.command('help', async (ctx) => {
  const groupCommands = `🤖 *GemBots Arena — Commands*

⚔️ /battles — Recent Battles
🏆 /leaderboard — Top bots
📊 /stats — Arena stats
🏆 /tournament — Tournaments
🎮 /play — Play vs AI bot!
🤖 /bot <name> — Bot profile
🔮 /guess — Guess the Price game
🏅 /achievements — Bot badges
🎯 /challenge — Daily Challenge
📊 /digest — Weekly Digest
🔗 /ref — Referral link
🪂 /airdrop — $GEMB Airdrop info
❓ /help — Help

🌐 [gembots.space](${SITE_URL})`;

  const privateCommands = `🤖 *GemBots Arena — Commands*

🔴 Watch Live — Open Arena Mini App
🏆 /leaderboard — Top bots by ELO
📊 /stats — Arena stats
🎮 /play — Play vs AI bot!
🔮 /guess — Guess the Price
🎯 /challenge — Daily Challenge
🪂 /airdrop — $GEMB Airdrop info
❓ /help — Help

🌐 [gembots.space](${SITE_URL})`;

  ctx.reply(isGroup(ctx) ? groupCommands : privateCommands, {
    parse_mode: 'Markdown',
    ...(isGroup(ctx) ? createPlayButton(true) : createMainMenu())
  });
});

// ═══════════════════════════════════════
// /bot — Bot Profile Card
// ═══════════════════════════════════════

bot.command('bot', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1).join(' ').trim();

  if (!args) {
    return ctx.reply(`💡 *Usage:* \`/bot <name>\`\n\n*Example:* \`/bot OracleAI\`\n*Or:* \`/bot Dragon\` (search by partial name)`, {
      parse_mode: 'Markdown'
    });
  }

  try {
    const lb = await makeApiRequest('/api/leaderboard');
    const bots = lb?.leaderboard || [];
    const searchLower = args.toLowerCase().replace(/[^a-zA-Zа-яА-Я0-9]/g, '');

    // Find bot by name (partial match, ignore emojis)
    const found = bots.find(b => {
      const cleanName = (b.name || '').replace(/[^a-zA-Zа-яА-Я0-9]/g, '').toLowerCase();
      return cleanName.includes(searchLower) || searchLower.includes(cleanName);
    });

    if (!found) {
      return ctx.reply(`❌ Bot "${args}" not found\n\n🏆 Use /leaderboard to see all bots`, {
        parse_mode: 'Markdown'
      });
    }

    const wr = found.totalBattles > 0 ? Math.round(found.wins / found.totalBattles * 100) : 0;
    const streak = found.winStreak || 0;
    const league = (found.league || 'bronze').charAt(0).toUpperCase() + (found.league || 'bronze').slice(1);

    // League emoji
    const leagueEmoji = found.league === 'gold' ? '🥇' :
                        found.league === 'silver' ? '🥈' :
                        found.league === 'diamond' ? '💎' : '🥉';

    // Win rate bar
    const barLen = 10;
    const filled = Math.round((wr / 100) * barLen);
    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

    // HP bar
    const hp = found.hp || 100;
    const hpFilled = Math.round((hp / 100) * barLen);
    const hpBar = '🟩'.repeat(Math.ceil(hpFilled/2)) + '⬛'.repeat(Math.ceil((barLen - hpFilled)/2));

    let msg = `━━━ 🤖 *Bot Profile* ━━━\n\n`;
    msg += `*${found.name}*\n`;
    msg += `${leagueEmoji} ${league} League | 🏆 ${found.elo} ELO\n`;
    if (found.peakElo) msg += `📈 Peak: ${found.peakElo} ELO\n`;
    msg += `\n`;
    msg += `⚔️ *Battles:* ${found.totalBattles || 0}\n`;
    msg += `✅ *Wins:* ${found.wins} | ❌ *Losses:* ${found.losses}\n`;
    msg += `📊 *Win Rate:* ${wr}%\n`;
    msg += `${bar} ${wr}%\n\n`;
    msg += `❤️ *HP:* ${hp}/100\n`;
    msg += `${hpBar}\n`;
    if (streak > 0) msg += `\n🔥 *Win Streak:* ${streak}!\n`;

    // Achievements
    const botStats = {
      battles: found.totalBattles || 0,
      wins: found.wins || 0,
      losses: found.losses || 0,
      elo: found.elo || 1000,
      streak: found.winStreak || 0,
      league: found.league || 'bronze',
      winRate: wr,
      guessGames: 0, challenges: 0, referrals: 0
    };
    const badges = getUnlockedAchievements(botStats);
    if (badges.length > 0) {
      msg += `\n🏅 *Badges:* ${badges.map(b => b.emoji).join(' ')}\n`;
    }

    // Get recent battles for this bot
    try {
      const battlesResp = await makeApiRequest('/api/arena/battles?limit=20');
      const battles = (battlesResp?.battles || []).filter(b =>
        b.bot1_id === found.id || b.bot2_id === found.id
      ).slice(0, 3);

      if (battles.length > 0) {
        msg += `\n⚔️ *Recent Battles:*\n`;
        for (const b of battles) {
          const opponent = b.bot1_id === found.id ? (b.bot2?.name || '?') : (b.bot1?.name || '?');
          const won = b.winner_id === found.id;
          const icon = won ? '✅' : b.winner_id ? '❌' : '⏳';
          msg += `${icon} vs ${opponent} on $${b.token_symbol || '?'}\n`;
        }
      }
    } catch (e) { /* ignore */ }

    msg += `\n━━━━━━━━━━━━━━━━━`;

    const buttons = isGroup(ctx)
      ? [[Markup.button.url('🎮 Play Now!', SITE_URL)]]
      : [[Markup.button.callback('← Menu', 'menu_main')]];

    ctx.reply(msg, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  } catch (error) {
    console.error('Bot profile error:', error);
    ctx.reply('❌ Failed to load profile');
  }
});

// ═══════════════════════════════════════
// /airdrop — Airdrop leaderboard
// ═══════════════════════════════════════

bot.command('airdrop', async (ctx) => {
  const msg = `🪂 *Airdrop coming soon!*

Stay tuned for *$GEMB* token launch.
Join our group to be first!`;

  const buttons = isGroup(ctx)
    ? [[Markup.button.url('👥 Join Group', 'https://t.me/gembots_arena')]]
    : [[Markup.button.url('👥 Join Group', 'https://t.me/gembots_arena')], [Markup.button.callback('← Menu', 'menu_main')]];

  ctx.reply(msg, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons)
  });
});

// ═══════════════════════════════════════
// ACHIEVEMENT SYSTEM
// ═══════════════════════════════════════

const ACHIEVEMENTS = {
  first_blood: { emoji: '🩸', name: 'First Blood', desc: 'Win your first battle', check: (s) => s.wins >= 1 },
  warrior: { emoji: '⚔️', name: 'Warrior', desc: 'Fight 10 battles', check: (s) => s.battles >= 10 },
  veteran: { emoji: '🎖', name: 'Veteran', desc: 'Fight 50 battles', check: (s) => s.battles >= 50 },
  legend: { emoji: '👑', name: 'Legend', desc: 'Fight 100 battles', check: (s) => s.battles >= 100 },
  unstoppable: { emoji: '🔥', name: 'Unstoppable', desc: '5 win streak', check: (s) => s.streak >= 5 },
  dominator: { emoji: '💀', name: 'Dominator', desc: '10 win streak', check: (s) => s.streak >= 10 },
  whale: { emoji: '🐋', name: 'Whale', desc: 'Reach 1300+ ELO', check: (s) => s.elo >= 1300 },
  diamond: { emoji: '💎', name: 'Diamond Hands', desc: 'Reach Diamond league', check: (s) => s.league === 'diamond' },
  gold: { emoji: '🥇', name: 'Gold Standard', desc: 'Reach Gold league', check: (s) => s.league === 'gold' },
  sniper: { emoji: '🎯', name: 'Sniper', desc: '70%+ win rate (min 10 fights)', check: (s) => s.battles >= 10 && s.winRate >= 70 },
  underdog: { emoji: '🐕', name: 'Underdog', desc: 'Win from Bronze league', check: (s) => s.league === 'bronze' && s.wins >= 1 },
  predictor: { emoji: '🔮', name: 'Oracle', desc: 'Play 5 /guess rounds', check: (s) => s.guessGames >= 5 },
  challenger: { emoji: '🎯', name: 'Daily Challenger', desc: 'Complete 7 daily challenges', check: (s) => s.challenges >= 7 },
  social: { emoji: '👥', name: 'Networker', desc: 'Refer 3 players', check: (s) => s.referrals >= 3 },
  early_bird: { emoji: '🐦', name: 'Early Bird', desc: 'Join during pre-launch', check: () => true }, // Everyone pre-launch gets it
};

function getUnlockedAchievements(botStats) {
  const unlocked = [];
  for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
    if (achievement.check(botStats)) {
      unlocked.push({ id, ...achievement });
    }
  }
  return unlocked;
}

bot.command('achievements', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1).join(' ').trim();

  try {
    const lb = await makeApiRequest('/api/leaderboard');
    const bots = lb?.leaderboard || [];

    let targetBot = null;

    if (args) {
      // Search for specific bot
      const searchLower = args.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
      targetBot = bots.find(b => {
        const cleanName = (b.name || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return cleanName.includes(searchLower) || searchLower.includes(cleanName);
      });
      if (!targetBot) {
        return ctx.reply(`❌ Bot "${args}" not found\n\n🏆 /leaderboard to see all bots`);
      }
    } else {
      // Show overall achievements info
      let msg = `🏅 *GemBots Achievements*\n━━━━━━━━━━━━━━━━━\n\n`;
      msg += `Unlock badges by fighting in the arena!\n\n`;

      for (const [id, a] of Object.entries(ACHIEVEMENTS)) {
        msg += `${a.emoji} *${a.name}* — ${a.desc}\n`;
      }

      msg += `\n📊 Check a bot: \`/achievements BotName\``;

      return ctx.reply(msg, { parse_mode: 'Markdown' });
    }

    // Build stats object for checking
    const battles = targetBot.totalBattles || 0;
    const wins = targetBot.wins || 0;
    const losses = targetBot.losses || 0;
    const elo = targetBot.elo || 1000;
    const streak = targetBot.winStreak || 0;
    const league = targetBot.league || 'bronze';
    const winRate = battles > 0 ? Math.round(wins / battles * 100) : 0;

    // Load guess data for this bot (approximate — we track by userId, not botId)
    let guessGames = 0;
    let challenges = 0;
    let referrals = 0;
    try {
      const guessData = await fs.readJson(path.join(__dirname, 'active-guesses.json')).catch(() => ({}));
      // Approximate from participants data
      const participants = guessData.participants || {};
      // We dont have a direct bot→user mapping, so we estimate
      guessGames = 0;
      challenges = 0;
      referrals = 0;
    } catch (e) {}

    const stats = { battles, wins, losses, elo, streak, league, winRate, guessGames, challenges, referrals };
    const unlocked = getUnlockedAchievements(stats);
    const total = Object.keys(ACHIEVEMENTS).length;

    let msg = `🏅 *Achievements for ${targetBot.name}*\n━━━━━━━━━━━━━━━━━\n\n`;
    msg += `🔓 *${unlocked.length}/${total}* unlocked\n\n`;

    for (const [id, a] of Object.entries(ACHIEVEMENTS)) {
      const isUnlocked = unlocked.find(u => u.id === id);
      if (isUnlocked) {
        msg += `${a.emoji} *${a.name}* ✅ — ${a.desc}\n`;
      } else {
        msg += `🔒 *${a.name}* — ${a.desc}\n`;
      }
    }

    msg += `\n⚔️ Keep fighting to unlock more!`;

    ctx.reply(msg, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Achievements error:', error);
    ctx.reply('❌ Failed to load achievements');
  }
});

// ═══════════════════════════════════════
// /ref — Referral System
// ═══════════════════════════════════════

bot.command('ref', async (ctx) => {
  const userId = ctx.from.id;
  const firstName = ctx.from.first_name || 'User';

  // Generate referral code from telegram user id
  const refCode = `tg_${userId}`;
  const refLink = `${SITE_URL}?ref=${refCode}`;

  try {
    // Try to get existing referral stats
    let stats = { clicks: 0, signups: 0 };
    try {
      const resp = await makeApiRequest(`/api/referral?code=${refCode}`);
      if (resp?.referral) {
        stats = resp.referral;
      }
    } catch (e) { /* new user, no stats yet */ }

    // Create/ensure referral code exists
    try {
      await makeApiRequest('/api/referral', 'POST', {
        code: refCode,
        botName: firstName,
        botId: userId
      });
    } catch (e) { /* already exists, fine */ }

    const msg = `🔗 *Your referral link:*

\`${refLink}\`

📊 *Stats:*
👆 Clicks: *${stats.clicks || 0}*
👥 Signups: *${stats.signups || 0}*

💡 *Share the link with friends!*
Bonus points for each referral 🎁`;

    const buttons = isGroup(ctx)
      ? [[Markup.button.url('🌐 Open GemBots', refLink)]]
      : [[Markup.button.url('📤 Share', `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('⚔️ Join GemBots Arena — AI vs AI Crypto Prediction Battles!')}`)]];

    ctx.reply(msg, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  } catch (error) {
    console.error('Referral error:', error);
    ctx.reply('❌ Failed to generate link');
  }
});

// ═══════════════════════════════════════
// /play — Human vs Bot Game
// ═══════════════════════════════════════

const GAMES_FILE = path.join(__dirname, 'active-games.json');

async function loadGames() {
  try {
    if (await fs.pathExists(GAMES_FILE)) return await fs.readJson(GAMES_FILE);
  } catch (e) {}
  return {};
}

async function saveGames(games) {
  await fs.writeJson(GAMES_FILE, games, { spaces: 2 });
}

// NPC bot strategies — how they "think"
const NPC_STRATEGIES = {
  aggressive: { name: 'Aggressive', bias: 0.65, spread: 0.3 },   // Leans UP, volatile
  conservative: { name: 'Conservative', bias: 0.45, spread: 0.1 },   // Slight DOWN, tight
  random: { name: 'Chaotic', bias: 0.5, spread: 0.5 },           // Pure chaos
  whale: { name: 'Whale', bias: 0.55, spread: 0.15 },                 // Slightly UP, confident
  contrarian: { name: 'Contrarian', bias: 0.4, spread: 0.2 },       // Leans against trend
};

function generateNpcPrediction(strategy) {
  const strat = NPC_STRATEGIES[strategy] || NPC_STRATEGIES.random;
  const roll = Math.random();
  const direction = roll < strat.bias ? 'up' : 'down';
  const confidence = Math.round(50 + Math.random() * strat.spread * 100);
  return { direction, confidence: Math.min(confidence, 95) };
}

bot.command('play', async (ctx) => {
  const userId = ctx.from.id;
  const firstName = ctx.from.first_name || 'Player';
  const games = await loadGames();

  // Check if user already has active game
  if (games[userId] && games[userId].status === 'active' && Date.now() < games[userId].endsAt) {
    const g = games[userId];
    const remaining = Math.round((g.endsAt - Date.now()) / 60000);
    return ctx.reply(`⏳ *You already have an active game!*

🪙 $${g.tokenSymbol} | vs ${g.npcName}
⏰ Result in *${remaining} min*

${g.playerDirection ? `Your pick: ${g.playerDirection === 'up' ? '📈 UP' : '📉 DOWN'}` : '👇 Not picked yet!'}`, {
      parse_mode: 'Markdown',
      ...(g.playerDirection ? {} : Markup.inlineKeyboard([
        [
          Markup.button.callback('📈 UP', `play_vote_up_${userId}`),
          Markup.button.callback('📉 DOWN', `play_vote_down_${userId}`)
        ]
      ]))
    });
  }

  // Get trending tokens
  try {
    const trendingResp = await makeApiRequest('/api/trending');
    const tokens = trendingResp?.tokens || [];

    if (!tokens.length) {
      return ctx.reply('❌ No tokens available. Try again later!');
    }

    // Pick random token from top 7
    const token = tokens[Math.floor(Math.random() * Math.min(tokens.length, 7))];

    // Pick random NPC opponent
    const lbResp = await makeApiRequest('/api/leaderboard');
    const bots = (lbResp?.leaderboard || []).filter(b => (b.totalBattles || 0) > 10);
    const npc = bots[Math.floor(Math.random() * Math.min(bots.length, 10))];
    const npcName = npc?.name || '🤖 MysteryBot';
    const npcElo = npc?.elo || 1000;

    // NPC makes its prediction
    const strategies = Object.keys(NPC_STRATEGIES);
    const npcStrategy = strategies[Math.floor(Math.random() * strategies.length)];
    const npcPred = generateNpcPrediction(npcStrategy);

    // Game duration: 30 min
    const duration = 30 * 60 * 1000;

    const game = {
      userId,
      playerName: firstName,
      tokenMint: token.mint,
      tokenSymbol: token.symbol || '???',
      startPrice: token.price || 'N/A',
      npcName,
      npcElo,
      npcStrategy,
      npcDirection: npcPred.direction,
      npcConfidence: npcPred.confidence,
      playerDirection: null,
      playerConfidence: null,
      startedAt: Date.now(),
      endsAt: Date.now() + duration,
      status: 'active',
      chatId: ctx.chat.id,
      messageId: null,
    };

    const msg = await ctx.reply(`⚔️ *BATTLE TIME!*

🧑 *${firstName}* vs *${npcName}* (${npcElo} ELO)

🪙 Token: *$${game.tokenSymbol}*
💰 Current price: ${game.startPrice}
⏰ Result in *30 minutes*

${npcName} has already made their prediction... 🤫

❓ *Where will the price go?*
👇 Make your prediction!`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('📈 UP', `play_vote_up_${userId}`),
          Markup.button.callback('📉 DOWN', `play_vote_down_${userId}`)
        ],
        [
          Markup.button.callback('📈 UP (confident!)', `play_vote_up_high_${userId}`),
          Markup.button.callback('📉 DOWN (confident!)', `play_vote_down_high_${userId}`)
        ]
      ])
    });

    game.messageId = msg.message_id;
    games[userId] = game;
    await saveGames(games);

  } catch (error) {
    console.error('Play error:', error);
    ctx.reply('❌ Failed to start game');
  }
});

// Vote handlers for /play
bot.action(/play_vote_(up|down)(?:_(high))?_(\d+)/, async (ctx) => {
  const direction = ctx.match[1];
  const highConf = ctx.match[2] === 'high';
  const targetUserId = ctx.match[3];
  const voterId = String(ctx.from.id);

  if (voterId !== targetUserId) {
    return ctx.answerCbQuery('❌ This is not your game!');
  }

  const games = await loadGames();
  const game = games[voterId];

  if (!game || game.status !== 'active') {
    return ctx.answerCbQuery('⏰ Game over!');
  }

  if (game.playerDirection) {
    return ctx.answerCbQuery(`You already picked ${game.playerDirection === 'up' ? '📈 UP' : '📉 DOWN'}!`);
  }

  game.playerDirection = direction;
  game.playerConfidence = highConf ? 85 : 60;
  games[voterId] = game;
  await saveGames(games);

  const emoji = direction === 'up' ? '📈' : '📉';
  const confText = highConf ? '(confidently!)' : '';

  try {
    await ctx.editMessageText(`⚔️ *BATTLE IN PROGRESS!*

🧑 *${game.playerName}* vs *${game.npcName}*

🪙 $${game.tokenSymbol} | 💰 ${game.startPrice}

✅ *Predictions locked in!*
🧑 ${game.playerName}: ${emoji} ${direction.toUpperCase()} ${confText}
🤖 ${game.npcName}: 🤫 ???

⏰ Result in ${Math.round((game.endsAt - Date.now()) / 60000)} min...`, {
      parse_mode: 'Markdown'
    });
  } catch (e) { /* message might be old */ }

  ctx.answerCbQuery(`✅ You picked ${emoji} ${direction.toUpperCase()}! Waiting for result...`);
});

// Resolve games
async function resolveGames() {
  const games = await loadGames();
  let changed = false;

  for (const [userId, game] of Object.entries(games)) {
    if (game.status !== 'active') continue;
    if (Date.now() < game.endsAt) continue;
    if (!game.playerDirection) {
      // Player didn't vote — cancel
      game.status = 'expired';
      changed = true;
      try {
        await bot.telegram.sendMessage(game.chatId,
          `⏰ *Game expired!*\n\n${game.playerName}, you didnt pick in time. Try again: /play`, {
            parse_mode: 'Markdown'
          });
      } catch (e) {}
      continue;
    }

    // Resolve!
    try {
      const trendingResp = await makeApiRequest('/api/trending');
      const tokens = trendingResp?.tokens || [];
      const token = tokens.find(t => t.mint === game.tokenMint);
      const endPrice = token?.price || 'N/A';

      // Determine actual direction
      let actualDirection = 'unknown';
      const startNum = parseFloat(String(game.startPrice).replace(/[^0-9.e-]/g, ''));
      const endNum = parseFloat(String(endPrice).replace(/[^0-9.e-]/g, ''));

      if (!isNaN(startNum) && !isNaN(endNum) && startNum > 0) {
        const change = ((endNum - startNum) / startNum * 100).toFixed(2);
        actualDirection = endNum >= startNum ? 'up' : 'down';

        const playerWon = game.playerDirection === actualDirection;
        const npcWon = game.npcDirection === actualDirection;

        // Calculate airdrop points
        let playerPoints = 10; // Participation
        if (playerWon && !npcWon) playerPoints += 25; // Clean win
        else if (playerWon && npcWon) playerPoints += 10; // Both right
        // Higher confidence = more risk/reward
        if (playerWon && game.playerConfidence > 70) playerPoints += 10;

        const resultEmoji = actualDirection === 'up' ? '📈' : '📉';
        const playerResult = playerWon ? '🏆 WIN!' : '😢 Loss';
        const npcResult = npcWon ? 'Correct' : 'Wrong';

        let msg = `🏁 *BATTLE RESULT!*\n\n`;
        msg += `🪙 *$${game.tokenSymbol}*\n`;
        msg += `💰 Start: ${game.startPrice} → End: ${endPrice}\n`;
        msg += `${resultEmoji} Price went *${actualDirection.toUpperCase()}* (${change > 0 ? '+' : ''}${change}%)\n\n`;

        msg += `🧑 *${game.playerName}:* ${game.playerDirection === 'up' ? '📈 UP' : '📉 DOWN'} → *${playerResult}*\n`;
        msg += `🤖 *${game.npcName}:* ${game.npcDirection === 'up' ? '📈 UP' : '📉 DOWN'} (${game.npcConfidence}%) → *${npcResult}*\n\n`;

        if (playerWon && !npcWon) {
          msg += `🎉 *${game.playerName} beats ${game.npcName}!*\n`;
        } else if (!playerWon && npcWon) {
          msg += `🤖 *${game.npcName} beats!*\n`;
        } else if (playerWon && npcWon) {
          msg += `🤝 *Draw — both were right!*\n`;
        } else {
          msg += `💀 *Both were wrong!*\n`;
        }

        msg += `\n🪂 +${playerPoints} airdrop pts\n`;
        msg += `\n🎮 Play again: /play`;

        await bot.telegram.sendMessage(game.chatId, msg, { parse_mode: 'Markdown' });

        game.status = 'resolved';
        game.endPrice = endPrice;
        game.actualDirection = actualDirection;
        game.playerWon = playerWon;
        game.playerPoints = playerPoints;

      } else {
        // Cant determine price
        await bot.telegram.sendMessage(game.chatId,
          `❓ *Could not determine result*\n\n$${game.tokenSymbol} — price unavailable. +10 pts for participation!\n\n🎮 /play`, {
            parse_mode: 'Markdown'
          });
        game.status = 'error';
        game.playerPoints = 10;
      }

      changed = true;
    } catch (error) {
      console.error('Game resolve error:', error);
      game.status = 'error';
      changed = true;
    }
  }

  if (changed) await saveGames(games);
}

// ═══════════════════════════════════════
// /guess — "Guess the Price" mini-game
// ═══════════════════════════════════════

const GUESS_FILE = path.join(__dirname, 'active-guesses.json');

// Parse price from API (handles "$0.000005" strings and numbers)
function parsePrice(p) {
  if (typeof p === 'number') return p;
  if (typeof p === 'string') {
    const cleaned = p.replace(/[^0-9.\-e]/gi, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

async function loadGuesses() {
  try {
    if (await fs.pathExists(GUESS_FILE)) return await fs.readJson(GUESS_FILE);
  } catch (e) {}
  return { rounds: {}, participants: {} };
}

async function saveGuesses(data) {
  await fs.writeJson(GUESS_FILE, data, { spaces: 2 });
}

// Start a new guess round (or join existing)
bot.command('guess', async (ctx) => {
  const userId = ctx.from.id;
  const firstName = ctx.from.first_name || 'Player';
  const data = await loadGuesses();

  // Check for active round
  const activeRound = data.rounds?.active;

  if (activeRound && Date.now() < activeRound.endsAt) {
    // There's an active round — check if user already guessed
    if (activeRound.guesses?.[userId]) {
      const remaining = Math.round((activeRound.endsAt - Date.now()) / 60000);
      return ctx.reply(`✅ You already guessed *$${activeRound.guesses[userId].guess.toFixed(6)}* on $${activeRound.tokenSymbol}!

⏰ Result in *${remaining} min*
🎯 ${Object.keys(activeRound.guesses).length} players guessing`, { parse_mode: 'Markdown' });
    }

    // Show current round, ask for guess
    return ctx.reply(`🔮 *GUESS THE PRICE!*

🪙 Token: *$${activeRound.tokenSymbol}*
📊 Price ${activeRound.minutesAgo} min ago: *$${activeRound.shownPrice.toFixed(8)}*
❓ Where is the price NOW?

⏰ Closes in *${Math.round((activeRound.endsAt - Date.now()) / 60000)} min*
🎯 ${Object.keys(activeRound.guesses || {}).length} players guessing

💬 Reply with your price guess (e.g. \`0.00001234\`)`, { parse_mode: 'Markdown' });
  }

  // No active round — create new one
  try {
    const trendingResp = await makeApiRequest('/api/trending');
    const tokens = trendingResp?.tokens || [];

    if (!tokens.length) {
      return ctx.reply('❌ No tokens available. Try again later!');
    }

    // Pick a random token from top 10
    const token = tokens[Math.floor(Math.random() * Math.min(tokens.length, 10))];
    const currentPrice = parsePrice(token.price);

    if (!currentPrice || currentPrice <= 0) {
      return ctx.reply('❌ Price data unavailable. Try again in a minute!');
    }

    // "Hide" the price — show a price from 10 min ago (simulated with slight offset)
    const minutesAgo = 10;
    const priceVariation = 0.95 + Math.random() * 0.10; // ±5% variation to simulate "10 min ago"
    const shownPrice = currentPrice * priceVariation;

    const round = {
      tokenMint: token.mint,
      tokenSymbol: token.symbol || '???',
      shownPrice,
      actualCurrentPrice: currentPrice, // This will be refreshed at resolve time
      minutesAgo,
      startedAt: Date.now(),
      endsAt: Date.now() + 10 * 60 * 1000, // 10 minutes to guess
      guesses: {},
      chatId: ctx.chat.id,
      status: 'active'
    };

    data.rounds = data.rounds || {};
    data.rounds.active = round;
    await saveGuesses(data);

    await ctx.reply(`🔮 *GUESS THE PRICE!*

🪙 Token: *$${round.tokenSymbol}*
📊 Price ~${minutesAgo} min ago: *$${shownPrice.toFixed(8)}*

❓ *Where is the price RIGHT NOW?*

⏰ You have *10 minutes* to guess!
💰 Closest guess wins *+50 airdrop points*!

💬 Type your guess: e.g. \`${(currentPrice * 0.98).toFixed(8)}\``, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Guess start error:', error);
    ctx.reply('❌ Failed to start guessing game');
  }
});

// Listen for guess submissions (number messages)
bot.on('text', async (ctx, next) => {
  // Only process if it looks like a price guess (number)
  const text = ctx.message.text.trim();
  const num = parseFloat(text);

  // Not a number or a command — skip
  if (isNaN(num) || num <= 0 || text.startsWith('/')) {
    return next();
  }

  const data = await loadGuesses();
  const round = data.rounds?.active;

  // No active round or expired
  if (!round || Date.now() > round.endsAt || round.status !== 'active') {
    return next();
  }

  // Only accept in the same chat
  if (round.chatId && round.chatId !== ctx.chat.id) {
    return next();
  }

  const userId = ctx.from.id;
  const firstName = ctx.from.first_name || 'Player';

  // Already guessed?
  if (round.guesses[userId]) {
    return; // Silently ignore duplicate guesses
  }

  round.guesses[userId] = {
    name: firstName,
    guess: num,
    timestamp: Date.now()
  };

  await saveGuesses(data);

  const count = Object.keys(round.guesses).length;
  await ctx.reply(`✅ *${firstName}* guessed *$${num.toFixed(8)}* on $${round.tokenSymbol}! 🎯

📊 ${count} player${count > 1 ? 's' : ''} in the game`, { parse_mode: 'Markdown' });
});

// Resolve guess rounds
async function resolveGuessRounds() {
  const data = await loadGuesses();
  const round = data.rounds?.active;

  if (!round || round.status !== 'active' || Date.now() < round.endsAt) return;

  // Fetch current price
  try {
    const trendingResp = await makeApiRequest('/api/trending');
    const tokens = trendingResp?.tokens || [];
    const token = tokens.find(t => t.mint === round.tokenMint || t.symbol === round.tokenSymbol);
    const actualPrice = parsePrice(token?.price) || round.actualCurrentPrice;

    if (!actualPrice) {
      round.status = 'error';
      await saveGuesses(data);
      return;
    }

    const guesses = round.guesses || {};
    const entries = Object.entries(guesses);

    if (entries.length === 0) {
      round.status = 'resolved';
      await saveGuesses(data);
      return;
    }

    // Calculate accuracy for each player
    const results = entries.map(([uid, g]) => ({
      userId: uid,
      name: g.name,
      guess: g.guess,
      diff: Math.abs(g.guess - actualPrice),
      diffPercent: Math.abs((g.guess - actualPrice) / actualPrice * 100)
    })).sort((a, b) => a.diff - b.diff);

    // Award points
    const pointsPerPlace = [50, 30, 15]; // 1st, 2nd, 3rd
    let resultsText = '';
    const medals = ['🥇', '🥈', '🥉'];

    results.forEach((r, i) => {
      const pts = pointsPerPlace[i] || 5; // Everyone else gets 5
      const medal = medals[i] || `${i + 1}.`;
      resultsText += `${medal} *${r.name}* — guessed $${r.guess.toFixed(8)} (${r.diffPercent.toFixed(2)}% off) → +${pts} pts\n`;

      // Save airdrop points
      if (!data.participants) data.participants = {};
      if (!data.participants[r.userId]) data.participants[r.userId] = { name: r.name, totalPoints: 0, games: 0 };
      data.participants[r.userId].totalPoints += pts;
      data.participants[r.userId].games += 1;
    });

    const priceChange = ((actualPrice - round.shownPrice) / round.shownPrice * 100).toFixed(2);
    const changeEmoji = actualPrice >= round.shownPrice ? '📈' : '📉';

    const msg = `🔮 *Guess the Price — RESULTS!*

🪙 $${round.tokenSymbol}
📊 Shown price: $${round.shownPrice.toFixed(8)}
💰 Actual price: *$${actualPrice.toFixed(8)}* ${changeEmoji} ${priceChange}%

🏆 *Rankings:*
${resultsText}
🎮 Next round: /guess`;

    try {
      await bot.telegram.sendMessage(round.chatId, msg, { parse_mode: 'Markdown' });
    } catch (e) {
      console.error('Failed to post guess results:', e.message);
    }

    round.status = 'resolved';
    round.actualPrice = actualPrice;
    data.rounds.active = null;
    await saveGuesses(data);

  } catch (error) {
    console.error('Guess resolve error:', error.message);
    round.status = 'error';
    data.rounds.active = null;
    await saveGuesses(data);
  }
}

// ═══════════════════════════════════════
// DAILY CHALLENGE (group only)
// ═══════════════════════════════════════

const DAILY_CHALLENGE_FILE = path.join(__dirname, 'daily-challenge.json');

async function loadDailyChallenge() {
  try {
    if (await fs.pathExists(DAILY_CHALLENGE_FILE)) {
      return await fs.readJson(DAILY_CHALLENGE_FILE);
    }
  } catch (e) {}
  return null;
}

async function saveDailyChallenge(data) {
  await fs.writeJson(DAILY_CHALLENGE_FILE, data, { spaces: 2 });
}

// /challenge — Start or view daily challenge
bot.command('challenge', async (ctx) => {
  if (!isGroup(ctx)) {
    return ctx.reply('🎯 Daily Challenge is only available in @GemBotsChat group!');
  }

  const existing = await loadDailyChallenge();
  const now = Date.now();

  // If there's an active challenge, show it
  if (existing && existing.status === 'active' && now < existing.endsAt) {
    const remaining = Math.round((existing.endsAt - now) / 60000);
    const upVotes = (existing.votes?.up || []).length;
    const downVotes = (existing.votes?.down || []).length;

    return ctx.reply(`🎯 *Daily Challenge — ACTIVE!*

🪙 *$${existing.tokenSymbol}*
💰 Starting price: ${existing.startPrice}
⏰ Remaining: *${remaining} min*

📊 *Votes:*
📈 UP: *${upVotes}* votes
📉 DOWN: *${downVotes}* votes

👇 Vote now!`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(`📈 UP (${upVotes})`, 'challenge_vote_up'),
          Markup.button.callback(`📉 DOWN (${downVotes})`, 'challenge_vote_down')
        ]
      ])
    });
  }

  // Start new challenge
  try {
    const trendingResp = await makeApiRequest('/api/trending');
    const tokens = trendingResp?.tokens || [];

    if (!tokens.length) {
      return ctx.reply('❌ Cant find trending tokens for challenge');
    }

    // Pick a random trending token
    const token = tokens[Math.floor(Math.random() * Math.min(tokens.length, 5))];
    const challenge = {
      tokenMint: token.mint,
      tokenSymbol: token.symbol || '???',
      startPrice: token.price || 'N/A',
      startedAt: now,
      endsAt: now + 60 * 60 * 1000, // 1 hour
      startedBy: ctx.from.id,
      status: 'active',
      votes: { up: [], down: [] },
      messageId: null
    };

    const msg = await ctx.reply(`🎯 *DAILY CHALLENGE STARTED!*

🪙 Token: *$${challenge.tokenSymbol}*
💰 Current price: ${challenge.startPrice}

❓ *Where will the price go in 1 hour?*

📈 UP — price will go up
📉 DOWN — price will go down

⏰ Voting open for 1 hour!
👇 Vote and lets see!`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('📈 UP (0)', 'challenge_vote_up'),
          Markup.button.callback('📉 DOWN (0)', 'challenge_vote_down')
        ]
      ])
    });

    challenge.messageId = msg.message_id;
    challenge.chatId = ctx.chat.id;
    await saveDailyChallenge(challenge);

  } catch (error) {
    console.error('Challenge error:', error);
    ctx.reply('❌ Failed to start challenge');
  }
});

// Challenge vote handlers
bot.action('challenge_vote_up', async (ctx) => {
  await handleChallengeVote(ctx, 'up');
});

bot.action('challenge_vote_down', async (ctx) => {
  await handleChallengeVote(ctx, 'down');
});

async function handleChallengeVote(ctx, direction) {
  const challenge = await loadDailyChallenge();
  if (!challenge || challenge.status !== 'active' || Date.now() > challenge.endsAt) {
    return ctx.answerCbQuery('⏰ Challenge is over!');
  }

  const userId = ctx.from.id;
  const opposite = direction === 'up' ? 'down' : 'up';

  // Remove from opposite if voted before
  challenge.votes[opposite] = (challenge.votes[opposite] || []).filter(id => id !== userId);

  // Add vote
  if (!challenge.votes[direction]) challenge.votes[direction] = [];
  if (challenge.votes[direction].includes(userId)) {
    return ctx.answerCbQuery(`You already voted ${direction === 'up' ? '📈 UP' : '📉 DOWN'}!`);
  }

  challenge.votes[direction].push(userId);
  await saveDailyChallenge(challenge);

  const upCount = challenge.votes.up.length;
  const downCount = challenge.votes.down.length;

  // Update message buttons
  try {
    await ctx.editMessageReplyMarkup({
      inline_keyboard: [[
        { text: `📈 UP (${upCount})`, callback_data: 'challenge_vote_up' },
        { text: `📉 DOWN (${downCount})`, callback_data: 'challenge_vote_down' }
      ]]
    });
  } catch (e) { /* might fail if message is old */ }

  ctx.answerCbQuery(`✅ Vote accepted: ${direction === 'up' ? '📈 UP' : '📉 DOWN'}!`);
}

// Check and resolve daily challenge
async function checkDailyChallenge() {
  const challenge = await loadDailyChallenge();
  if (!challenge || challenge.status !== 'active') return;
  if (Date.now() < challenge.endsAt) return;

  // Resolve!
  try {
    const trendingResp = await makeApiRequest('/api/trending');
    const tokens = trendingResp?.tokens || [];
    const token = tokens.find(t => t.mint === challenge.tokenMint);

    const endPrice = token?.price || 'N/A';
    const upVoters = challenge.votes?.up?.length || 0;
    const downVoters = challenge.votes?.down?.length || 0;

    // Determine result
    let result = 'unknown';
    if (challenge.startPrice !== 'N/A' && endPrice !== 'N/A') {
      const startNum = parseFloat(String(challenge.startPrice).replace(/[^0-9.e-]/g, ''));
      const endNum = parseFloat(String(endPrice).replace(/[^0-9.e-]/g, ''));
      if (!isNaN(startNum) && !isNaN(endNum)) {
        result = endNum >= startNum ? 'up' : 'down';
      }
    }

    const winnerSide = result === 'up' ? '📈 UP' : result === 'down' ? '📉 DOWN' : '❓';
    const winnersCount = result === 'up' ? upVoters : result === 'down' ? downVoters : 0;

    let msg = `🏁 *DAILY CHALLENGE — RESULT!*\n\n`;
    msg += `🪙 *$${challenge.tokenSymbol}*\n`;
    msg += `💰 Start: ${challenge.startPrice}\n`;
    msg += `💰 End: ${endPrice}\n`;
    msg += `\n`;

    if (result !== 'unknown') {
      msg += `${result === 'up' ? '📈' : '📉'} Price went *${result.toUpperCase()}*!\n\n`;
      msg += `🏆 *Winners:* ${winnersCount} players (${winnerSide})\n`;
      msg += `😢 *Lost:* ${result === 'up' ? downVoters : upVoters} players\n`;
    } else {
      msg += `❓ Could not determine result\n`;
    }

    msg += `\n📊 *Votes:* ${upVoters} UP / ${downVoters} DOWN`;
    msg += `\n\n🎯 Next challenge: /challenge`;

    const chatId = challenge.chatId || GROUP_CHAT_ID;
    if (chatId) {
      await bot.telegram.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
    }

    challenge.status = 'resolved';
    challenge.endPrice = endPrice;
    challenge.result = result;
    await saveDailyChallenge(challenge);

  } catch (error) {
    console.error('Challenge resolve error:', error);
    challenge.status = 'error';
    await saveDailyChallenge(challenge);
  }
}

// ═══════════════════════════════════════
// PRIVATE CHAT COMMANDS (legacy)
// ═══════════════════════════════════════

// /register command
bot.command('register', async (ctx) => {
  if (isGroup(ctx)) return; // Only in private

  const userId = ctx.from.id;
  try {
    const existingApiKey = await getUserApiKey(userId);
    if (existingApiKey) {
      return ctx.reply(`✅ *Already registered!*\n\n🔑 *API key:* \`${existingApiKey}\``, {
        parse_mode: 'Markdown',
        ...createMainMenu()
      });
    }

    ctx.reply('🔄 *Registering...*', { parse_mode: 'Markdown' });
    const response = await makeApiRequest('/api/v1/bots/register', 'POST', {
      name: `TelegramBot_${userId}`,
      telegram_id: userId
    });

    if (response.api_key) {
      await setUserApiKey(userId, response.api_key);
      ctx.reply(`✅ *Registration successful!*\n\n🔑 *API key:* \`${response.api_key}\`\n\n💡 Save your key!`, {
        parse_mode: 'Markdown',
        ...createMainMenu()
      });
    } else {
      ctx.reply('❌ *Registration error* — try again later', { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Register error:', error);
    ctx.reply(`❌ *Error:* ${error.message}`, { parse_mode: 'Markdown' });
  }
});

// /predict command — redirects to Arena
bot.command('predict', async (ctx) => {
  const msg = `🔮 *Predictions integrated into Arena!*

Watch live battles and see AI predictions in real-time.`;

  const buttons = isGroup(ctx)
    ? [[Markup.button.url('⚔️ Open Arena', SITE_URL)]]
    : [[Markup.button.webApp('⚔️ Open Arena', WEBAPP_URL)], [Markup.button.callback('← Menu', 'menu_main')]];

  ctx.reply(msg, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons)
  });
});

// /history command
bot.command('history', async (ctx) => {
  if (isGroup(ctx)) return;

  const userId = ctx.from.id;
  try {
    const apiKey = await getUserApiKey(userId);
    if (!apiKey) return ctx.reply('❌ *First /register*', { parse_mode: 'Markdown' });

    const response = await makeApiRequest('/api/v1/predictions?limit=5', 'GET', null, apiKey);
    if (!response || !response.length) {
      return ctx.reply('📜 *History is empty*\n\n🚀 Make your first prediction!', {
        parse_mode: 'Markdown',
        ...createMainMenu()
      });
    }

    let msg = '━━━ 📜 *History* ━━━\n\n';
    response.forEach((pred, i) => {
      const status = pred.status === 'pending' ? '⏳' : pred.status === 'won' ? '✅' : pred.status === 'lost' ? '❌' : '❓';
      msg += `${status} ${pred.mint ? pred.mint.substring(0, 8) + '...' : '?'} | ${pred.direction || 'UP'} ${pred.confidence || 70}%\n`;
    });

    ctx.reply(msg, { parse_mode: 'Markdown', ...createMainMenu() });
  } catch (error) {
    console.error('History error:', error);
    ctx.reply(`❌ *Error:* ${error.message}`, { parse_mode: 'Markdown' });
  }
});

// ═══════════════════════════════════════
// INLINE BUTTON HANDLERS (private chat)
// ═══════════════════════════════════════

bot.action('menu_main', (ctx) => {
  ctx.editMessageText(`🤖 *GemBots — Main Menu*\n\n💎 *Choose an action:*`, {
    parse_mode: 'Markdown',
    ...createMainMenu()
  });
  ctx.answerCbQuery();
});

bot.action('register', async (ctx) => {
  const userId = ctx.from.id;
  try {
    const existingApiKey = await getUserApiKey(userId);
    if (existingApiKey) {
      ctx.editMessageText(`✅ *Already registered!*\n\n🔑 \`${existingApiKey}\``, {
        parse_mode: 'Markdown',
        ...createBackButton()
      });
      return ctx.answerCbQuery();
    }

    userStates.set(userId, { state: 'awaiting_pubkey' });
    ctx.editMessageText(`🔐 *Send your Solana Public Key*\n\n💡 Example: \`7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU\``, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'cancel_register')]])
    });
  } catch (error) {
    ctx.editMessageText(`❌ ${error.message}`, { parse_mode: 'Markdown', ...createBackButton() });
  }
  ctx.answerCbQuery();
});

bot.action('cancel_register', async (ctx) => {
  userStates.delete(ctx.from.id);
  await ctx.editMessageText('❌ *Cancelled*', { parse_mode: 'Markdown', ...createBackButton() });
  ctx.answerCbQuery();
});

// Handle pubkey input (private only)
bot.on('text', async (ctx, next) => {
  if (isGroup(ctx)) return next(); // Skip in groups

  const userId = ctx.from.id;
  const state = userStates.get(userId);
  if (!state || state.state !== 'awaiting_pubkey') return next();

  const publicKey = ctx.message.text.trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(publicKey)) {
    return ctx.reply('❌ *Invalid format.* Solana address: 32-44 characters (base58)\n\nTry again:', {
      parse_mode: 'Markdown'
    });
  }

  userStates.delete(userId);
  const loadingMsg = await ctx.reply('🔄 *Registering...*', { parse_mode: 'Markdown' });

  try {
    const response = await makeApiRequest('/api/v1/bots/register', 'POST', {
      name: `TelegramBot_${userId}`,
      publicKey: publicKey
    });

    if (response.api_key) {
      await setUserApiKey(userId, response.api_key);
      await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null,
        `✅ *Registration successful!*\n\n🔑 \`${response.api_key}\`\n💼 \`${publicKey.slice(0, 8)}...${publicKey.slice(-4)}\``,
        { parse_mode: 'Markdown', ...createMainMenu() }
      );
    }
  } catch (error) {
    console.error('Register error:', error);
    await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null,
      `❌ *Error:* ${error.message}`,
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Try again', 'register')],
        [Markup.button.callback('← Back', 'menu_main')]
      ])}
    );
  }
});

bot.action('menu_predict', async (ctx) => {
  const userId = ctx.from.id;
  try {
    const apiKey = await getUserApiKey(userId);
    if (!apiKey) {
      ctx.editMessageText('❌ *Register first*', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📝 Register', 'register')],
          [Markup.button.callback('← Menu', 'menu_main')]
        ])
      });
      return ctx.answerCbQuery();
    }

    ctx.editMessageText('🔄 *Loading...*', { parse_mode: 'Markdown' });
    const response = await makeApiRequest('/api/trending');
    const tokens = response?.tokens || response || [];

    if (!tokens.length) {
      ctx.editMessageText('❌ *No trending tokens*', { parse_mode: 'Markdown', ...createBackButton() });
      return ctx.answerCbQuery();
    }

    let msg = '🎯 *Make Prediction*\n\n🔥 *Trending:*\n\n';
    const buttons = [];
    tokens.slice(0, 5).forEach((token, i) => {
      const change = token.change24h || 'N/A';
      msg += `${i + 1}. *${token.symbol || '???'}* (${change})\n`;
      buttons.push([Markup.button.callback(`🎯 ${token.symbol || 'Token'}`, `predict_token_${token.mint}`)]);
    });
    buttons.push([Markup.button.callback('← Menu', 'menu_main')]);

    ctx.editMessageText(msg, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
  } catch (error) {
    ctx.editMessageText(`❌ ${error.message}`, { parse_mode: 'Markdown', ...createBackButton() });
  }
  ctx.answerCbQuery();
});

bot.action(/predict_token_(.+)/, async (ctx) => {
  const mint = ctx.match[1];
  try {
    const trendingResponse = await makeApiRequest('/api/trending');
    const trending = trendingResponse?.tokens || trendingResponse || [];
    const token = trending.find(t => t.mint === mint) || { symbol: '???', mint };

    ctx.editMessageText(`🎯 *${token.symbol}*\n\n🏷️ \`${mint}\`\n\n📊 *Confidence:*`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🟢 50%', `predict_conf_${mint}_50`)],
        [Markup.button.callback('🟡 70%', `predict_conf_${mint}_70`)],
        [Markup.button.callback('🔴 90%', `predict_conf_${mint}_90`)],
        [Markup.button.callback('← Back', 'menu_predict')]
      ])
    });
  } catch (e) { /* ignore */ }
  ctx.answerCbQuery();
});

bot.action(/predict_conf_(.+)_(\d+)/, async (ctx) => {
  const mint = ctx.match[1];
  const confidence = parseInt(ctx.match[2]);

  ctx.editMessageText(`✅ *Confirm*\n\n📈 UP ↗️ | 🎯 ${confidence}%`, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('✅ Confirm', `predict_final_${mint}_${confidence}`)],
      [Markup.button.callback('← Back', `predict_token_${mint}`)]
    ])
  });
  ctx.answerCbQuery();
});

bot.action(/predict_final_(.+)_(\d+)/, async (ctx) => {
  const mint = ctx.match[1];
  const confidence = parseInt(ctx.match[2]);
  const userId = ctx.from.id;

  try {
    const apiKey = await getUserApiKey(userId);
    if (!apiKey) return ctx.answerCbQuery('❌ /register first');

    ctx.editMessageText('🔮 *Creating prediction...*', { parse_mode: 'Markdown' });
    const response = await makeApiRequest('/api/v1/predictions', 'POST', { mint, confidence, direction: 'up' }, apiKey);

    ctx.editMessageText(`✅ *Prediction created!*\n\n📈 UP ↗️ | 🎯 ${confidence}%\n🆔 ${response.id || 'N/A'}`, {
      parse_mode: 'Markdown',
      ...createBackButton()
    });
  } catch (error) {
    ctx.editMessageText(`❌ ${error.message}`, { parse_mode: 'Markdown', ...createBackButton() });
  }
  ctx.answerCbQuery();
});

bot.action('menu_trending', async (ctx) => {
  try {
    ctx.editMessageText('🔄 *Loading...*', { parse_mode: 'Markdown' });
    const response = await makeApiRequest('/api/trending');
    const tokens = response?.tokens || response || [];

    if (!tokens.length) {
      ctx.editMessageText('❌ *No trending data*', { parse_mode: 'Markdown', ...createBackButton() });
      return ctx.answerCbQuery();
    }

    let msg = '🔥 *Trending Tokens*\n\n';
    const buttons = [];
    tokens.slice(0, 5).forEach((token, i) => {
      const change = token.change24h || 'N/A';
      const emoji = String(change).includes('+') ? '🟢' : '🔴';
      msg += `${i + 1}. ${emoji} *$${token.symbol || '???'}* (${change})\n   💰 ${token.price || 'N/A'}\n\n`;
      buttons.push([Markup.button.callback(`🎯 Predict ${token.symbol || '?'}`, `predict_token_${token.mint}`)]);
    });
    buttons.push([Markup.button.callback('← Menu', 'menu_main')]);

    ctx.editMessageText(msg, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
  } catch (error) {
    ctx.editMessageText(`❌ ${error.message}`, { parse_mode: 'Markdown', ...createBackButton() });
  }
  ctx.answerCbQuery();
});

bot.action('menu_stats', async (ctx) => {
  const userId = ctx.from.id;
  try {
    const apiKey = await getUserApiKey(userId);
    if (!apiKey) {
      ctx.editMessageText('❌ *Register first*', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📝 Register', 'register')],
          [Markup.button.callback('← Menu', 'menu_main')]
        ])
      });
      return ctx.answerCbQuery();
    }

    ctx.editMessageText('📊 *Loading...*', { parse_mode: 'Markdown' });
    const response = await makeApiRequest('/api/v1/bots/me', 'GET', null, apiKey);
    const wins = response.wins || 0;
    const losses = response.losses || 0;
    const total = wins + losses;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

    ctx.editMessageText(`📊 *Your Stats*\n\n💰 ${wins}W / ${losses}L (${winRate}%)\n🎯 Total: ${total}\n⏳ Pending: ${response.pending || 0}`, {
      parse_mode: 'Markdown',
      ...createBackButton()
    });
  } catch (error) {
    ctx.editMessageText(`❌ ${error.message}`, { parse_mode: 'Markdown', ...createBackButton() });
  }
  ctx.answerCbQuery();
});

bot.action('menu_history', async (ctx) => {
  const userId = ctx.from.id;
  try {
    const apiKey = await getUserApiKey(userId);
    if (!apiKey) {
      ctx.editMessageText('❌ *Register first*', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📝 Register', 'register')],
          [Markup.button.callback('← Menu', 'menu_main')]
        ])
      });
      return ctx.answerCbQuery();
    }

    const response = await makeApiRequest('/api/v1/predictions?limit=5', 'GET', null, apiKey);
    if (!response || !response.length) {
      ctx.editMessageText('📜 *History is empty*', { parse_mode: 'Markdown', ...createBackButton() });
      return ctx.answerCbQuery();
    }

    let msg = '📜 *History*\n\n';
    response.forEach((pred) => {
      const st = pred.status === 'pending' ? '⏳' : pred.status === 'won' ? '✅' : '❌';
      msg += `${st} ${pred.mint?.substring(0, 8) || '?'}... | ${pred.direction || 'UP'} ${pred.confidence || 70}%\n`;
    });

    ctx.editMessageText(msg, { parse_mode: 'Markdown', ...createBackButton() });
  } catch (error) {
    ctx.editMessageText(`❌ ${error.message}`, { parse_mode: 'Markdown', ...createBackButton() });
  }
  ctx.answerCbQuery();
});

bot.action('menu_settings', async (ctx) => {
  ctx.editMessageText('⚙️ *Settings*\n\n🚧 Coming soon...', {
    parse_mode: 'Markdown',
    ...createBackButton()
  });
  ctx.answerCbQuery();
});

// Legacy inline prediction buttons
bot.action(/predict_(up|down)_(.+)/, async (ctx) => {
  const direction = ctx.match[1];
  const mint = ctx.match[2];
  const userId = ctx.from.id;

  try {
    const apiKey = await getUserApiKey(userId);
    if (!apiKey) return ctx.answerCbQuery('❌ /register first');

    await ctx.answerCbQuery('🔮 Making prediction...');
    const response = await makeApiRequest('/api/v1/predictions', 'POST', { mint, confidence: 70, direction }, apiKey);

    ctx.reply(`✅ *Quick prediction!*\n\n${mint.substring(0, 8)}... ${direction.toUpperCase()} ${direction === 'up' ? '↗️' : '↘️'} 70%\n🆔 ${response.id || 'N/A'}`, {
      parse_mode: 'Markdown'
    });
  } catch (error) {
    ctx.answerCbQuery('❌ ' + error.message);
  }
});

// ═══════════════════════════════════════
// BATTLE NOTIFICATIONS (auto-post to group)
// ═══════════════════════════════════════

async function checkAndPostBattles() {
  if (!GROUP_CHAT_ID) return;

  try {
    // Fetch live battles (active + waiting)
    const liveResponse = await makeApiRequest(`/api/arena/live`);
    const activeBattles = liveResponse?.battles || [];
    const openBattles = liveResponse?.openBattles || [];

    // 1. Announce NEW active battles (just started)
    for (const b of activeBattles.slice(0, 5)) {
      if (notifiedBattleStarts.has(b.id)) continue;
      notifiedBattleStarts.add(b.id);

      const bot1Name = b.bot1?.name || '???';
      const bot2Name = b.bot2?.name || '???';
      const token = b.token_symbol || '???';
      const countdown = b.countdown ? Math.round(b.countdown / 60) : '?';
      const bot1Pred = b.bot1?.prediction ? `${b.bot1.prediction}x` : '?';
      const bot2Pred = b.bot2?.prediction ? `${b.bot2.prediction}x` : '?';

      const msg = `🔴 *LIVE BATTLE!*\n\n` +
        `⚔️ *${bot1Name}* vs *${bot2Name}*\n` +
        `🪙 Token: *$${token}*\n` +
        `📊 Predictions: ${bot1Name} → ${bot1Pred} | ${bot2Name} → ${bot2Pred}\n` +
        `⏱ Resolves in ~${countdown} min\n\n` +
        `👀 [Watch Live](https://gembots.space)`;

      try {
        await bot.telegram.sendMessage(GROUP_CHAT_ID, msg, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        });
        // Small delay between messages
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.error('Failed to post live battle to group:', e.message);
      }
    }

    // 2. Announce battle RESULTS (finished battles)
    const resultsResponse = await makeApiRequest(`/api/arena/battles?limit=10`);
    const allBattles = resultsResponse?.battles || [];

    const finishedBattles = allBattles.filter(b => {
      return b.winner_id && !notifiedBattleResults.has(b.id);
    });

    for (const b of finishedBattles.slice(0, 3)) {
      notifiedBattleResults.add(b.id);

      const isBot1Winner = b.winner_id === b.bot1_id;
      const winner = isBot1Winner ? b.bot1 : b.bot2;
      const loser = isBot1Winner ? b.bot2 : b.bot1;
      const token = b.token_symbol || '???';
      const actualX = b.actual_x ? `${b.actual_x.toFixed(4)}x` : '?';

      // Calculate accuracy
      const winnerPred = isBot1Winner ? b.bot1_prediction : b.bot2_prediction;
      const loserPred = isBot1Winner ? b.bot2_prediction : b.bot1_prediction;
      const winnerDiff = winnerPred && b.actual_x ? Math.abs(winnerPred - b.actual_x).toFixed(3) : '?';

      const isPerfect = winnerDiff !== '?' && parseFloat(winnerDiff) < 0.05;
      const perfectTag = isPerfect ? ' 🎯 PERFECT!' : '';

      const msg = `🏆 *Battle Result!*\n\n` +
        `⚔️ *${winner?.name || '?'}* defeated *${loser?.name || '?'}*${perfectTag}\n` +
        `🪙 $${token} → ${actualX}\n` +
        `📊 Winner predicted: ${winnerPred ? winnerPred + 'x' : '?'} (diff: ${winnerDiff})\n` +
        `📉 Loser predicted: ${loserPred ? loserPred + 'x' : '?'}\n` +
        `🏅 ELO: ${winner?.name || '?'} ${winner?.elo || '?'}`;

      try {
        await bot.telegram.sendMessage(GROUP_CHAT_ID, msg, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        });
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.error('Failed to post battle result to group:', e.message);
      }
    }

    // Cleanup old entries (keep last 200)
    if (notifiedBattleStarts.size > 200) {
      const arr = [...notifiedBattleStarts];
      arr.slice(0, arr.length - 100).forEach(id => notifiedBattleStarts.delete(id));
    }
    if (notifiedBattleResults.size > 200) {
      const arr = [...notifiedBattleResults];
      arr.slice(0, arr.length - 100).forEach(id => notifiedBattleResults.delete(id));
    }

    lastBattleCheck = Date.now();
  } catch (error) {
    console.error('Battle notification error:', error.message);
  }
}

// ═══════════════════════════════════════
// LAUNCH MODE ANNOUNCEMENTS
// ═══════════════════════════════════════

const LAUNCH_MODE_FILE = path.join(__dirname, '..', 'data', 'launch-mode.json');
let _launchModeWasActive = false;

async function checkLaunchMode() {
  if (!GROUP_CHAT_ID) return;

  try {
    let config;
    try {
      delete require.cache[require.resolve(LAUNCH_MODE_FILE)];
      config = require(LAUNCH_MODE_FILE);
    } catch {
      return; // File doesn't exist — no launch mode
    }

    const isActive = config.enabled === true;

    if (isActive && !_launchModeWasActive) {
      // Launch Mode just turned ON — announce!
      const msg = `🚀🚀🚀 *LAUNCH MODE ACTIVATED!*\n\n` +
        `⚡ Battles every *${Math.round((config.check_interval_ms || 15000) / 1000)} seconds!*\n` +
        `🔥 More battles, faster action!\n` +
        `⚔️ Min active battles: *${config.min_active_battles || 20}*\n\n` +
        `💎 The arena is on fire — join now!\n` +
        `🌐 [Play GemBots](https://gembots.space)`;

      await bot.telegram.sendMessage(GROUP_CHAT_ID, msg, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
      console.log('🚀 Launch Mode announcement sent to group!');
    } else if (!isActive && _launchModeWasActive) {
      // Launch Mode just turned OFF — announce return to normal
      const msg = `⏸️ *Launch Mode Ended*\n\n` +
        `Arena returns to normal pace.\n` +
        `Thanks for the epic battles! 🎉\n\n` +
        `⚔️ Battles continue — keep fighting!\n` +
        `🌐 [Play GemBots](https://gembots.space)`;

      await bot.telegram.sendMessage(GROUP_CHAT_ID, msg, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
      console.log('⏸️ Launch Mode deactivation announced to group!');
    }

    _launchModeWasActive = isActive;
  } catch (error) {
    console.error('Launch mode check error:', error.message);
  }
}

// ═══════════════════════════════════════
// WEEKLY DIGEST (auto-post Monday summary)
// ═══════════════════════════════════════

async function sendWeeklyDigest() {
  if (!GROUP_CHAT_ID) return;

  try {
    // Get leaderboard
    const lbResponse = await makeApiRequest('/api/leaderboard');
    const leaderboard = lbResponse?.leaderboard || [];
    const stats = lbResponse?.stats || {};

    // Get recent battles for "best battle" highlight
    const battlesResponse = await makeApiRequest('/api/arena/battles?limit=50');
    const battles = battlesResponse?.battles || [];

    // Top 5 bots
    const top5 = leaderboard.slice(0, 5);
    let topBotsText = '';
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    top5.forEach((b, i) => {
      const wr = b.total_bets > 0 ? Math.round((b.wins / b.total_bets) * 100) : 0;
      topBotsText += `${medals[i]} *${b.name}* — ELO ${b.elo} | ${b.wins}W/${b.losses}L (${wr}%)\n`;
    });

    // Best battle (closest prediction)
    let bestBattle = '';
    const finishedBattles = battles.filter(b => b.winner_id && b.actual_x);
    if (finishedBattles.length > 0) {
      // Find the battle with closest prediction (smallest diff)
      let closest = null;
      let closestDiff = Infinity;
      for (const b of finishedBattles) {
        const isBot1Winner = b.winner_id === b.bot1_id;
        const winnerPred = isBot1Winner ? b.bot1_prediction : b.bot2_prediction;
        if (winnerPred) {
          const diff = Math.abs(winnerPred - b.actual_x);
          if (diff < closestDiff) {
            closestDiff = diff;
            closest = b;
          }
        }
      }
      if (closest) {
        const isBot1W = closest.winner_id === closest.bot1_id;
        const wName = isBot1W ? closest.bot1?.name : closest.bot2?.name;
        bestBattle = `\n🎯 *Best Prediction:* ${wName || '?'} on $${closest.token_symbol} (diff: ${closestDiff.toFixed(4)})`;
      }
    }

    // Count unique participants
    const uniqueBots = new Set();
    battles.forEach(b => {
      if (b.bot1_id) uniqueBots.add(b.bot1_id);
      if (b.bot2_id) uniqueBots.add(b.bot2_id);
    });

    const msg = `📊 *Weekly GemBots Digest*\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `🏟 *Arena Stats:*\n` +
      `• Total bots: ${stats.totalBots || '?'}\n` +
      `• Total battles: ${stats.totalBattles || '?'}\n` +
      `• Active fighters this week: ${uniqueBots.size}\n\n` +
      `🏆 *Top 5 Leaderboard:*\n${topBotsText}` +
      `${bestBattle}\n\n` +
      `💎 *Join the Arena!*\n` +
      `Create your bot → /start\n` +
      `Play predictions → /play\n` +
      `🌐 [gembots.space](https://gembots.space)`;

    await bot.telegram.sendMessage(GROUP_CHAT_ID, msg, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
    console.log('📊 Weekly digest sent!');
  } catch (error) {
    console.error('Weekly digest error:', error.message);
  }
}

// Check if it's Monday and time for digest (runs on the minute timer)
let lastDigestWeek = -1;
function checkWeeklyDigest() {
  const now = new Date();
  const week = getWeekNumber(now);
  const day = now.getUTCDay(); // 0=Sun, 1=Mon
  const hour = now.getUTCHours();

  // Send on Monday at 09:00 UTC (12:00 MSK)
  if (day === 1 && hour === 9 && week !== lastDigestWeek) {
    lastDigestWeek = week;
    sendWeeklyDigest();
  }
}

function getWeekNumber(d) {
  const onejan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - onejan) / 86400000 + onejan.getUTCDay() + 1) / 7);
}

// ═══════════════════════════════════════
// ERROR HANDLER & LAUNCH
// ═══════════════════════════════════════

bot.catch((err, ctx) => {
  console.error('Bot error for ' + ctx.updateType + ':', err.message);
});

console.log('🤖 GemBots Telegram Bot starting...');

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN not set');
  process.exit(1);
}

bot.launch()
  .then(() => {
    console.log('✅ GemBots Telegram Bot is running!');
    console.log(`📡 API: ${API_BASE_URL}`);
    console.log(`👥 Group: ${GROUP_CHAT_ID || 'not set'}`);

    // Start battle check interval
    if (GROUP_CHAT_ID) {
      setInterval(checkAndPostBattles, BATTLE_CHECK_INTERVAL);
      console.log('⚔️ Battle notifications enabled (every 5min)');
    }

    // Check daily challenge + resolve games + guesses + weekly digest every minute
    setInterval(() => {
      checkDailyChallenge();
      resolveGames();
      resolveGuessRounds();
      checkWeeklyDigest();
    }, 60 * 1000);
    console.log('🎯 Daily challenge + game resolver + guess game + weekly digest enabled');

    // Check launch mode every 30 seconds (detect hot-reload config changes fast)
    setInterval(checkLaunchMode, 30 * 1000);
    checkLaunchMode(); // Check immediately on startup
    console.log('🚀 Launch Mode monitor enabled (checks every 30s)');
  })
  .catch((error) => {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
