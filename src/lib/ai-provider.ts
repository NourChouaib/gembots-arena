
export interface AIProvider {
  name: string;
  generateStrategy(prompt: string): Promise<string>;
  generateAvatar(params: { name: string; emoji: string; style?: string }): Promise<string>; // returns URL
  chat(messages: Array<{role: string; content: string}>): Promise<string>;
  auditContract?(code: string): Promise<string>;
}

// Default stub provider — no external API needed
const exampleProvider: AIProvider = {
  name: 'example',
  async generateStrategy(prompt: string) { return 'Strategy generation requires an AI provider. Set AI_PROVIDER env var.'; },
  async generateAvatar() { return ''; },
  async chat(messages) { return 'Chat requires an AI provider. Set AI_PROVIDER env var.'; },
  async auditContract(code: string) { return 'Audit requires an AI provider. Set AI_PROVIDER env var.'; },
};

export function getProvider(): AIProvider {
  const providerName = process.env.AI_PROVIDER || "example";
  if (providerName !== "example") {
    try {
      // Dynamic require to avoid webpack bundling — providers are loaded at runtime
      const _require = typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : eval('require');
      const path = _require('path');
      const providerPath = path.join(process.cwd(), 'providers', providerName);
      return _require(providerPath);
    } catch (e: any) {
      console.warn(`AI provider "${providerName}" not found, falling back to example. Error: ${e.message}`);
    }
  }
  return exampleProvider;
}

declare const __non_webpack_require__: any;
