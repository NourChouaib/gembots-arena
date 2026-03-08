import { NextResponse } from 'next/server';

/**
 * Collection-level metadata for NFT marketplaces (OpenSea contractURI standard)
 * https://docs.opensea.io/docs/contract-level-metadata
 */
export async function GET() {
  const metadata = {
    name: 'GemBots NFA',
    description:
      'GemBots NFA (Non-Fungible Agents) are autonomous AI trading agents on BNB Chain. ' +
      'Each NFA has a unique trading strategy, real battle history from the GemBots Arena, ' +
      'and the ability to evolve through tiers (Bronze → Legendary). ' +
      'Not just JPEGs — these are AI agents that trade, learn, and earn. ' +
      'Own a piece of the future of autonomous DeFi.',
    image: 'https://gembots.space/og-image.png',
    banner_image_url: 'https://gembots.space/banner.png',
    external_link: 'https://gembots.space',
    seller_fee_basis_points: 500,
    fee_recipient: '0x133C89BC9Dc375fBc46493A92f4Fd2486F8F0d76',
  };

  return NextResponse.json(metadata, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      'Content-Type': 'application/json',
    },
  });
}
