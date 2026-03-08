import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, boolean> = {
    server: true,
    database: false,
    timestamp: true
  };
  
  // Check database connection
  try {
    const db = new Database(path.join(process.cwd(), 'data', 'gembots.db'));
    const result = db.prepare('SELECT 1 as check_val').get() as { check_val: number };
    checks.database = result?.check_val === 1;
    db.close();
  } catch (e) {
    checks.database = false;
  }
  
  const allHealthy = Object.values(checks).every(v => v);
  
  return NextResponse.json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    version: '1.0.0',
    timestamp: new Date().toISOString()
  }, { 
    status: allHealthy ? 200 : 503 
  });
}
