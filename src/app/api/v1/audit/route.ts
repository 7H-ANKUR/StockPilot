import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const action = url.searchParams.get('action');
  
  const events = await db.auditEvent.findMany({
    where: action ? { action } : {},
    include: { user: true },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
  
  return NextResponse.json({
    count: events.length,
    events,
  });
}
