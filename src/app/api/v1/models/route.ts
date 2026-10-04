import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const models = await db.modelVersion.findMany({
    include: { forecasts: true },
    orderBy: { createdAt: 'desc' },
  });
  
  const result = models.map(m => ({
    id: m.id,
    name: m.modelName,
    version: m.version,
    featureVersion: m.featureVersion,
    trainingDataset: m.trainingDataset,
    status: m.status,
    createdAt: m.createdAt,
    forecastCount: m.forecasts.length,
    metrics: m.metricsJson ? JSON.parse(m.metricsJson) : null,
  }));
  
  // Tool call stats from audit
  const toolCalls = await db.auditEvent.findMany({
    where: { action: 'AGENT_TOOL_CALL' },
    take: 1000,
  });
  
  const toolStats: Record<string, { success: number; fail: number }> = {};
  for (const e of toolCalls) {
    try {
      const data = JSON.parse(e.newValue || '{}');
      const tool = e.resourceId || 'unknown';
      if (!toolStats[tool]) toolStats[tool] = { success: 0, fail: 0 };
      if (data.success) toolStats[tool].success++;
      else toolStats[tool].fail++;
    } catch {}
  }
  
  return NextResponse.json({ models: result, toolStats });
}
