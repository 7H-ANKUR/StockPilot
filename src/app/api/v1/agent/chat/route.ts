import { NextRequest, NextResponse } from 'next/server';
import { runAgent } from '@/lib/agent';

export async function POST(req: NextRequest) {
  try {
    const { message, history = [], userId = 'demo-user', tenantId = 'tenant-default', role = 'MANAGER' } = await req.json();
    
    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }
    
    const ctx = {
      userId,
      tenantId,
      role,
      requestId: `req-${Date.now()}`,
    };
    
    // Convert history from client format
    const agentHistory = history.map((m: any) => ({
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp || Date.now()),
    }));
    
    const result = await runAgent(message, ctx, agentHistory);
    
    // Return only the new messages (last 2 = user + assistant)
    const newMessages = result.slice(-2);
    
    return NextResponse.json({
      messages: newMessages,
      requestId: ctx.requestId,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
