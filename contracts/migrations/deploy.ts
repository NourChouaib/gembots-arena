// Anchor migration script for GemBots Betting
const anchor = require("@coral-xyz/anchor");

module.exports = async function (provider: any) {
  anchor.setProvider(provider);
  // Post-deploy: initialize platform config
  // Run separately via CLI or test
};
