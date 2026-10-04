import { NextRequest, NextResponse } from 'next/server';
import { generateRecommendations } from '@/lib/workflow';

export async function POST(req: NextRequest) {
  try {
    const { festivalName, limit } = await req.json().catch(() => ({}));
    const result = await generateRecommendations(festivalName, limit || 20);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
