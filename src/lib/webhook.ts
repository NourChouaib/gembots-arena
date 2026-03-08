import crypto from 'crypto';
import db from './db';

interface BotWebhookRecord {
  webhook_url?: string;
  webhook_secret: string;
}

interface WebhookPayload {
  bet_id: number;
  result: 'win' | 'lose';
  payout: number;
  pnl: number;
  token_mint: string;
  entry_price: number;
  exit_price: number;
  resolved_at: string;
}

export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

export async function sendWebhook(botApiKey: string, payload: WebhookPayload) {
  try {
    // Get bot webhook info
    const bot = db.prepare(`
      SELECT webhook_url, webhook_secret 
      FROM api_bots 
      WHERE api_key = ?
    `).get(botApiKey) as BotWebhookRecord | undefined;

    if (!bot || !bot.webhook_url) {
      console.log(`No webhook configured for bot ${botApiKey}`);
      return;
    }

    const payloadString = JSON.stringify(payload);
    const signature = generateWebhookSignature(payloadString, bot.webhook_secret);

    const response = await fetch(bot.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Bot-API-Key': botApiKey,
        'User-Agent': 'GemBots-Webhook/1.0'
      },
      body: payloadString
    });

    if (!response.ok) {
      console.error(`Webhook failed for bot ${botApiKey}: ${response.status} ${response.statusText}`);
    } else {
      console.log(`Webhook sent successfully to bot ${botApiKey}`);
    }

  } catch (error: any) {
    console.error(`Webhook error for bot ${botApiKey}:`, error.message);
  }
}

export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return signature === `sha256=${expectedSignature}`;
}