import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildAndPersistRegistry, DEMAND_MODEL_VARIANTS, STOCKOUT_MODEL_VARIANTS, MOVEMENT_MODEL_VARIANTS, FESTIVAL_MODEL_VARIANTS } from '@/lib/models/registry';

export async function GET() {
  // Build/persist the registry (trains + backtests all demand models)
  const registry = await buildAndPersistRegistry().catch((e) => {
    console.error('Registry build failed:', e);
    return null;
  });

  // Group by layer
  const layers = {
    DEMAND_FORECAST: {
      title: 'Demand Forecasting',
      description: 'Predicts SKU demand over 7/14/30-day horizons. All 5 variants trained; best one that beats naive baseline is selected.',
      models: registry ? registry.filter(m => m.layer === 'DEMAND_FORECAST') : [],
      progression: DEMAND_MODEL_VARIANTS.map(v => v.variant),
    },
    STOCKOUT_RISK: {
      title: 'Stockout Risk',
      description: 'Two-layer: deterministic coverage engine (always enforced) + ML classifier (probability estimate).',
      models: registry ? registry.filter(m => m.layer === 'STOCKOUT_RISK') : [],
      progression: STOCKOUT_MODEL_VARIANTS.map(v => v.variant),
    },
    INVENTORY_MOVEMENT: {
      title: 'Inventory Movement',
      description: 'ABC-XYZ segmentation: revenue contribution × demand variability. 9-cell classification.',
      models: registry ? registry.filter(m => m.layer === 'INVENTORY_MOVEMENT') : [],
      progression: MOVEMENT_MODEL_VARIANTS.map(v => v.variant),
    },
    FESTIVAL_INTELLIGENCE: {
      title: 'Festival Intelligence',
      description: 'Historical uplift + trend + confidence. Never fabricates uplift. Confidence scales with evidence_days.',
      models: registry ? registry.filter(m => m.layer === 'FESTIVAL_INTELLIGENCE') : [],
      progression: FESTIVAL_MODEL_VARIANTS.map(v => v.variant),
    },
  };

  // Tool call stats from audit (with N/A handling for 0 calls)
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

  const totalToolCalls = Object.values(toolStats).reduce((s, t) => s + t.success + t.fail, 0);
  const successfulCalls = Object.values(toolStats).reduce((s, t) => s + t.success, 0);
  // Edge case: 0 tool calls → N/A (not 100%)
  const successRate = totalToolCalls > 0 ? (successfulCalls / totalToolCalls * 100) : null;

  return NextResponse.json({
    architecture: {
      llmLayer: {
        name: 'LLM Orchestration',
        description: 'Tool-calling agent with 12 typed tools. Sits ABOVE the 4 intelligence layers. Never invents numbers — all numerical outputs come from tools.',
        position: 'ABOVE',
      },
      intelligenceLayers: layers,
    },
    toolStats,
    toolSummary: {
      totalCalls: totalToolCalls,
      successful: successfulCalls,
      successRate: successRate, // null = N/A
      evaluationNote: totalToolCalls === 0
        ? 'N/A — no tool calls yet. Use the Agent Chat to trigger tool invocations.'
        : `${successRate!.toFixed(1)}% success rate across ${totalToolCalls} calls`,
    },
  });
}
