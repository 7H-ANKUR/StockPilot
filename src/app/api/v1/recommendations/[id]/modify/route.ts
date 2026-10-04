import { NextRequest, NextResponse } from 'next/server';
import { modifyRecommendation } from '@/lib/workflow';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, finalQty, comment } = await req.json();
    
    if (!finalQty || finalQty <= 0) {
      return NextResponse.json({ error: 'finalQty must be a positive number' }, { status: 400 });
    }
    
    const result = await modifyRecommendation(id, userId || 'demo-user', finalQty, comment);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
