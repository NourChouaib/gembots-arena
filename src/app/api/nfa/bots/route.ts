import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/nfa/bots?address=0x...
 * 
 * Returns all bots with NFA linked to a given EVM address.
 */
export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get('address');

    if (!address || !/^0x[a-fA-F0-9]{40}$/i.test(address)) {
      return NextResponse.json(
        { success: false, error: 'Valid EVM address required as query parameter' },
        { status: 400 }
      );
    }

    const { data: bots, error } = await supabase
      .from('bots')
      .select('id, name, nfa_id, webhook_url, evm_address, wins, losses, elo')
      .eq('evm_address', address.toLowerCase())
      .not('nfa_id', 'is', null)
      .order('nfa_id', { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Database error: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bots: bots || [],
      count: (bots || []).length,
    });
  } catch (error: unknown) {
    const e = error as Error;
    return NextResponse.json(
      { success: false, error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
