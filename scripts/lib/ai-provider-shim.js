/**
 * JS shim for ai-provider (since src/lib/ai-provider.ts can't be required from JS)
 */
function getProvider() {
  const providerName = process.env.AI_PROVIDER || "example";
  if (providerName !== "example") {
    try {
      const p = require(`../../providers/${providerName}`);
      return p;
    } catch (e) {
      console.warn(`AI provider "${providerName}" not found, falling back to example.`);
    }
  }
  try {
    return require(`../../providers/example`);
  } catch (e) {
    // Fallback: return dummy provider
    return {
      name: "Dummy",
      async generateStrategy() { return "HOLD"; },
      async generateAvatar() { return ""; },
      async chat() { return "No AI provider configured"; },
    };
  }
}

module.exports = { getProvider };
