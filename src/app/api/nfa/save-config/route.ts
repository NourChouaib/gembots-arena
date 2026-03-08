import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/nfa/save-config
 * 
 * Saves bot configuration to Supabase after minting.
 * API key is NEVER sent here — it stays in localStorage only.
 * 
 * Body: {
 *   nfaId: number,
 *   tier: 'bronze' | 'silver' | 'gold',
 *   model: string,
 *   strategy: string,
 *   botName: string,
 *   botEmoji: string,
 *   systemPrompt: string,
 *   evmAddress: string,
 *   byok: boolean,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nfaId, tier, model, strategy, botName, botEmoji, systemPrompt, evmAddress, byok } = body;

    if (nfaId === undefined || !tier || !model || !evmAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: nfaId, tier, model, evmAddress' },
        { status: 400 }
      );
    }

    // Upsert into nfa_configs table
    const { error } = await supabase
      .from('nfa_configs')
      .upsert({
        nfa_id: nfaId,
        tier,
        model,
        strategy: strategy || 'DragonScale',
        bot_name: botName || 'GemBot',
        bot_emoji: botEmoji || '🤖',
        system_prompt: (systemPrompt || '').slice(0, 500),
        evm_address: evmAddress.toLowerCase(),
        byok: !!byok,
        created_at: new Date().toISOString(),
      }, { onConflict: 'nfa_id' });

    if (error) {
      console.error('Failed to save NFA config:', error);
      // Don't fail the mint — this is non-critical
      // If table doesn't exist yet, log and return success
      if (error.code === '42P01') {
        console.warn('nfa_configs table does not exist yet — skipping save');
        return NextResponse.json({ success: true, warning: 'Table not ready yet' });
      }
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log(`💾 NFA #${nfaId} config saved: ${tier} tier, ${model}, ${botName}`);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const e = error as Error;
    console.error('Save config error:', e.message);
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    );
  }
}
