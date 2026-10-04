import { NextRequest, NextResponse } from 'next/server';
import { rejectRecommendation } from '@/lib/workflow';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, comment } = await req.json();
    
    const result = await rejectRecommendation(id, userId || 'demo-user', comment);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
