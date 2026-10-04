import { NextRequest, NextResponse } from 'next/server';
import { analyzeFestivalImpact } from '@/lib/inventory';

export async function POST(req: NextRequest) {
  try {
    const { productId, eventName } = await req.json();
    if (!productId || !eventName) {
      return NextResponse.json({ error: 'productId and eventName are required' }, { status: 400 });
    }
    const result = await analyzeFestivalImpact(productId, eventName);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
