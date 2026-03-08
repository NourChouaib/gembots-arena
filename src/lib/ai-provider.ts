
export interface AIProvider {
  name: string;
  generateStrategy(prompt: string): Promise<string>;
  generateAvatar(params: { name: string; emoji: string; style?: string }): Promise<string>; // returns URL
  chat(messages: Array<{role: string; content: string}>): Promise<string>;
  auditContract?(code: string): Promise<string>;
}

export function getProvider(): AIProvider {
  const providerName = process.env.AI_PROVIDER || "example";
  if (providerName !== "example") {
    try {
      // Try to load custom provider from providers/<name>/
      require.resolve(`../../../providers/${providerName}`);
      return require(`../../../providers/${providerName}`);
    } catch (e) {
      console.warn(`AI provider "${providerName}" not found, falling back to example. Error: ${e.message}`);
    }
  }
  return require(`../../../providers/example`);
}
