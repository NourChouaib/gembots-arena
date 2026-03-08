import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/nfa/webhook
 * 
 * Set webhook URL for an NFA-linked bot.
 * Body: { botId: number, webhookUrl: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botId, webhookUrl } = body;

    if (!botId || !webhookUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: botId, webhookUrl' },
        { status: 400 }
      );
    }

    if (typeof botId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'botId must be a number' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      const url = new URL(webhookUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json(
        { success: false, error: 'webhookUrl must be a valid HTTP/HTTPS URL' },
        { status: 400 }
      );
    }

    // Check bot exists and has NFA
    const { data: bot, error: fetchError } = await supabase
      .from('bots')
      .select('id, name, nfa_id, webhook_url')
      .eq('id', botId)
      .single();

    if (fetchError || !bot) {
      return NextResponse.json(
        { success: false, error: `Bot with id ${botId} not found` },
        { status: 404 }
      );
    }

    if (bot.nfa_id === null || bot.nfa_id === undefined) {
      return NextResponse.json(
        { success: false, error: `Bot "${bot.name}" has no NFA linked. Mint an NFA first.` },
        { status: 400 }
      );
    }

    // Optionally ping the webhook to verify it's reachable
    let pingResult = { reachable: false, latencyMs: 0 };
    try {
      const pingStart = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'ping',
          bot_id: botId,
          bot_name: bot.name,
          nfa_id: bot.nfa_id,
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      pingResult = { reachable: res.ok || res.status < 500, latencyMs: Date.now() - pingStart };
    } catch {
      // Webhook unreachable — still save it but warn
      pingResult = { reachable: false, latencyMs: 0 };
    }

    // Save webhook URL
    const { error: updateError } = await supabase
      .from('bots')
      .update({ webhook_url: webhookUrl })
      .eq('id', botId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Database update failed: ' + updateError.message },
        { status: 500 }
      );
    }

    console.log(`🔗 Webhook set for bot "${bot.name}" (NFA #${bot.nfa_id}): ${webhookUrl} | reachable: ${pingResult.reachable}`);

    return NextResponse.json({
      success: true,
      data: {
        botId,
        botName: bot.name,
        nfaId: bot.nfa_id,
        webhookUrl,
        ping: pingResult,
      },
    });
  } catch (error: unknown) {
    const e = error as Error;
    console.error('Webhook set error:', e.message);
    return NextResponse.json(
      { success: false, error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/nfa/webhook
 * 
 * Remove webhook URL from a bot.
 * Body: { botId: number }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { botId } = body;

    if (!botId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: botId' },
        { status: 400 }
      );
    }

    // Check bot exists
    const { data: bot, error: fetchError } = await supabase
      .from('bots')
      .select('id, name, webhook_url')
      .eq('id', botId)
      .single();

    if (fetchError || !bot) {
      return NextResponse.json(
        { success: false, error: `Bot with id ${botId} not found` },
        { status: 404 }
      );
    }

    if (!bot.webhook_url) {
      return NextResponse.json(
        { success: false, error: `Bot "${bot.name}" has no webhook configured` },
        { status: 400 }
      );
    }

    // Remove webhook URL
    const { error: updateError } = await supabase
      .from('bots')
      .update({ webhook_url: null })
      .eq('id', botId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Database update failed: ' + updateError.message },
        { status: 500 }
      );
    }

    console.log(`🔗 Webhook removed for bot "${bot.name}" (id: ${botId})`);

    return NextResponse.json({
      success: true,
      data: {
        botId,
        botName: bot.name,
        webhookRemoved: true,
      },
    });
  } catch (error: unknown) {
    const e = error as Error;
    console.error('Webhook delete error:', e.message);
    return NextResponse.json(
      { success: false, error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
