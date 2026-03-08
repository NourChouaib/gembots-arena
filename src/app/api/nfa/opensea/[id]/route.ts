import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * OpenSea-compatible metadata endpoint
 * This enriches on-chain tokenURI data with image, attributes, etc.
 * Submit this URL format to marketplaces as the metadata source.
 * 
 * Usage: https://gembots.space/api/nfa/opensea/{tokenId}
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Proxy to our full metadata API
  try {
    const res = await fetch(`https://gembots.space/api/nfa/metadata/${id}`, {
      signal: AbortSignal.timeout(15000),
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: 'NFA not found' }, { status: res.status });
    }
    
    const metadata = await res.json();
    
    return NextResponse.json(metadata, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
