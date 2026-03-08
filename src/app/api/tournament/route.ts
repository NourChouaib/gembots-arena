import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), 'data', 'tournament.json');

export async function GET() {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return NextResponse.json({ tournament: null, message: 'No active tournament' });
    }

    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return NextResponse.json({ tournament: state });
  } catch (error) {
    console.error('Tournament API error:', error);
    return NextResponse.json({ error: 'Failed to load tournament' }, { status: 500 });
  }
}
