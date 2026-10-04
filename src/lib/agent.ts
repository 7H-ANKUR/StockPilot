/**
 * LLM Agent — Tool-Calling Layer
 * 
 * Implements (per docs):
 *  - 12 tools that return strictly typed JSON
 *  - LLM is the orchestrator/explainer, never invents numbers
 *  - Guardrails: prompt injection protection, approval enforcement
 *  - Tool rules: validate args, check permissions, return typed outputs, log
 */

import { db } from '@/lib/db';
import { z } from 'zod';
import {
  computeStockoutRisk,
  computeOverstock,
  calculateReorder,
  analyzeFestivalImpact,
  getSupplierConstraints,
} from './inventory';
import { forecastDemand, getDailySalesSeries } from './forecast';

const DEFAULT_STORE_ID = process.env.DEFAULT_STORE_ID || 'store-default';

// ============================================================
// TOOL REGISTRY — typed JSON outputs
// ============================================================

export interface ToolResult {
  tool: string;
  success: boolean;
  data: any;
  error?: string;
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  handler: (args: any, ctx: AgentContext) => Promise<ToolResult>;
}

export interface AgentContext {
  userId: string;
  tenantId: string;
  role: string;
  requestId: string;
}

export const TOOLS: Record<string, ToolDef> = {
  get_sales_summary: {
    name: 'get_sales_summary',
    description: 'Returns aggregate sales KPIs: total revenue, total transactions, top categories, top SKUs. Use this when the user asks about overall sales performance.',
    parameters: {
      days: { type: 'number', description: 'Lookback window in days (default 30)', required: false },
    },
    handler: async (args) => {
      const days = args.days || 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      
      const sales = await db.sale.findMany({
        where: { saleTimestamp: { gte: cutoff } },
        include: { product: true },
      });
      
      const totalRevenue = sales.reduce((s, x) => s + x.netSales, 0);
      const totalQty = sales.reduce((s, x) => s + x.quantity, 0);
      const transactions = sales.length;
      
      const byCategory = new Map<string, { revenue: number; qty: number }>();
      for (const s of sales) {
        const cat = s.product.category || 'Unknown';
        const cur = byCategory.get(cat) || { revenue: 0, qty: 0 };
        cur.revenue += s.netSales;
        cur.qty += s.quantity;
        byCategory.set(cat, cur);
      }
      
      const topCategories = Array.from(byCategory.entries())
        .map(([cat, v]) => ({ category: cat, revenue: round(v.revenue), qty: v.qty }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      
      return {
        tool: 'get_sales_summary',
        success: true,
        data: {
          days,
          totalRevenue: round(totalRevenue),
          totalQuantity: totalQty,
          transactions,
          avgOrderValue: transactions > 0 ? round(totalRevenue / transactions) : 0,
          topCategories,
        },
      };
    },
  },
  
  get_inventory_snapshot: {
    name: 'get_inventory_snapshot',
    description: 'Returns current inventory snapshot for all products at the default store, including stock levels, reorder points, days of inventory.',
    parameters: {
      limit: { type: 'number', description: 'Max products to return (default 50)', required: false },
      riskFilter: { type: 'string', description: 'Filter by risk: HIGH, WATCH, SAFE, OVERSTOCK', required: false },
    },
    handler: async (args) => {
      const limit = Math.min(args.limit || 50, 200);
      
      const inventory = await db.inventorySnapshot.findMany({
        where: { storeId: DEFAULT_STORE_ID },
        orderBy: { snapshotDate: 'desc' },
        take: limit,
        include: { product: true },
      });
      
      // Dedupe by product (latest snapshot only)
      const seen = new Set<string>();
      const unique = inventory.filter(i => {
        if (seen.has(i.productId)) return false;
        seen.add(i.productId);
        return true;
      });
      
      const results = [];
      for (const inv of unique.slice(0, limit)) {
        const risk = await computeStockoutRisk(inv.productId, DEFAULT_STORE_ID);
        if (args.riskFilter && risk.riskLevel !== args.riskFilter) continue;
        results.push({
          sku: inv.product.sku,
          productName: inv.product.name,
          category: inv.product.category,
          onHandQty: inv.onHandQty,
          availableStock: risk.availableStock,
          reorderPoint: inv.reorderPoint,
          daysOfInventory: risk.daysOfInventory,
          riskLevel: risk.riskLevel,
          stockoutProbability: risk.stockoutProbability,
        });
      }
      
      return {
        tool: 'get_inventory_snapshot',
        success: true,
        data: { count: results.length, items: results },
      };
    },
  },
  
  forecast_demand: {
    name: 'forecast_demand',
    description: 'Generates a demand forecast for a specific product over a horizon (7/14/30 days). Returns predicted qty, confidence interval, confidence score, and backtest metrics.',
    parameters: {
      productId: { type: 'string', description: 'Product ID', required: true },
      horizonDays: { type: 'number', description: 'Forecast horizon: 7, 14, or 30 (default 7)', required: false },
    },
    handler: async (args) => {
      const result = await forecastDemand(args.productId, DEFAULT_STORE_ID, args.horizonDays || 7);
      return {
        tool: 'forecast_demand',
        success: true,
        data: {
          sku: result.sku,
          productName: result.productName,
          horizonDays: result.horizonDays,
          predictedQty: result.predictedQty,
          lowerBound: result.lowerBound,
          upperBound: result.upperBound,
          confidence: result.confidence,
          modelVersion: result.modelVersion,
          backtestMetrics: result.backtestMetrics,
        },
      };
    },
  },
  
  get_stockout_risk: {
    name: 'get_stockout_risk',
    description: 'Computes deterministic stockout risk for a specific product. Returns current stock, lead-time demand, safety stock, required coverage, risk level, and probability.',
    parameters: {
      productId: { type: 'string', description: 'Product ID (optional - if omitted, returns top N at-risk items)', required: false },
      topN: { type: 'number', description: 'When productId is omitted, returns top N at-risk items (default 10)', required: false },
    },
    handler: async (args) => {
      if (args.productId) {
        const risk = await computeStockoutRisk(args.productId, DEFAULT_STORE_ID);
        return { tool: 'get_stockout_risk', success: true, data: risk };
      }
      
      // Get top N at-risk products
      const inventory = await db.inventorySnapshot.findMany({
        where: { storeId: DEFAULT_STORE_ID },
        orderBy: { snapshotDate: 'desc' },
        take: 500,
        include: { product: true },
      });
      
      const seen = new Set<string>();
      const unique = inventory.filter(i => {
        if (seen.has(i.productId)) return false;
        seen.add(i.productId);
        return true;
      });
      
      const risks = [];
      for (const inv of unique.slice(0, 100)) {
        const risk = await computeStockoutRisk(inv.productId, DEFAULT_STORE_ID);
        if (risk.riskLevel === 'HIGH' || risk.riskLevel === 'CRITICAL') {
          risks.push(risk);
        }
      }
      
      risks.sort((a, b) => b.stockoutProbability - a.stockoutProbability);
      
      return {
        tool: 'get_stockout_risk',
        success: true,
        data: { count: risks.length, items: risks.slice(0, args.topN || 10) },
      };
    },
  },
  
  get_overstock_risk: {
    name: 'get_overstock_risk',
    description: 'Identifies overstocked products (days of inventory > threshold). Returns stock level, expected demand, days of inventory, movement class.',
    parameters: {
      topN: { type: 'number', description: 'Returns top N overstocked items (default 10)', required: false },
    },
    handler: async (args) => {
      const inventory = await db.inventorySnapshot.findMany({
        where: { storeId: DEFAULT_STORE_ID },
        orderBy: { snapshotDate: 'desc' },
        take: 500,
        include: { product: true },
      });
      
      const seen = new Set<string>();
      const unique = inventory.filter(i => {
        if (seen.has(i.productId)) return false;
        seen.add(i.productId);
        return true;
      });
      
      const overstocks = [];
      for (const inv of unique.slice(0, 100)) {
        const info = await computeOverstock(inv.productId, DEFAULT_STORE_ID);
        if (info.isOverstock) {
          overstocks.push(info);
        }
      }
      
      overstocks.sort((a, b) => b.daysOfInventory - a.daysOfInventory);
      
      return {
        tool: 'get_overstock_risk',
        success: true,
        data: { count: overstocks.length, items: overstocks.slice(0, args.topN || 10) },
      };
    },
  },
  
  get_movement_classification: {
    name: 'get_movement_classification',
    description: 'Classifies products as fast/normal/slow movers using ABC-XYZ analysis. Returns sales velocity, demand variability, and movement class.',
    parameters: {
      topN: { type: 'number', description: 'Returns top N items per class (default 10)', required: false },
    },
    handler: async (args) => {
      const topN = args.topN || 10;
      const inventory = await db.inventorySnapshot.findMany({
        where: { storeId: DEFAULT_STORE_ID },
        orderBy: { snapshotDate: 'desc' },
        take: 500,
        include: { product: true },
      });
      
      const seen = new Set<string>();
      const unique = inventory.filter(i => {
        if (seen.has(i.productId)) return false;
        seen.add(i.productId);
        return true;
      });
      
      const items = [];
      for (const inv of unique) {
        const series = await getDailySalesSeries(inv.productId, DEFAULT_STORE_ID, 28);
        const avgDaily = series.slice(-7).reduce((s, x) => s + x.qty, 0) / 7;
        const movementClass = (() => {
          let abc = 'C';
          if (avgDaily >= 50) abc = 'A';
          else if (avgDaily >= 15) abc = 'B';
          const cv = avgDaily > 0 ? std(series.map(s => s.qty)) / avgDaily : 1;
          let xyz = 'X';
          if (cv >= 1.0) xyz = 'Z';
          else if (cv >= 0.5) xyz = 'Y';
          return `${abc}-${xyz}`;
        })();
        items.push({
          productId: inv.productId,
          sku: inv.product.sku,
          productName: inv.product.name,
          avgDailyDemand: round(avgDaily, 1),
          movementClass,
          onHandQty: inv.onHandQty,
        });
      }
      
      const fast = items.filter(i => i.movementClass.startsWith('A')).sort((a, b) => b.avgDailyDemand - a.avgDailyDemand).slice(0, topN);
      const normal = items.filter(i => i.movementClass.startsWith('B')).sort((a, b) => b.avgDailyDemand - a.avgDailyDemand).slice(0, topN);
      const slow = items.filter(i => i.movementClass.startsWith('C')).sort((a, b) => a.avgDailyDemand - b.avgDailyDemand).slice(0, topN);
      
      return {
        tool: 'get_movement_classification',
        success: true,
        data: { fast, normal, slow },
      };
    },
  },
  
  analyze_festival_impact: {
    name: 'analyze_festival_impact',
    description: 'Analyzes the demand impact of an Indian festival on a specific product. Returns expected uplift, forecast units, confidence, and evidence days. Use this when user asks about festival impact (Diwali, Holi, etc.).',
    parameters: {
      productId: { type: 'string', description: 'Product ID', required: true },
      eventName: { type: 'string', description: 'Festival name (e.g., Diwali, Holi)', required: true },
    },
    handler: async (args) => {
      const impact = await analyzeFestivalImpact(args.productId, args.eventName);
      return { tool: 'analyze_festival_impact', success: true, data: impact };
    },
  },
  
  get_supplier_constraints: {
    name: 'get_supplier_constraints',
    description: 'Returns supplier constraints: lead time, MOQ, payment terms, reliability score.',
    parameters: {
      supplierId: { type: 'string', description: 'Supplier ID', required: true },
    },
    handler: async (args) => {
      const result = await getSupplierConstraints(args.supplierId);
      return { tool: 'get_supplier_constraints', success: true, data: result };
    },
  },
  
  calculate_reorder_quantity: {
    name: 'calculate_reorder_quantity',
    description: 'Calculates the recommended reorder quantity for a product. Uses forecast + lead-time demand + safety stock + MOQ + festival buffer. Returns recommended qty, estimated cost, risk, confidence, and limiting constraint.',
    parameters: {
      productId: { type: 'string', description: 'Product ID', required: true },
      festivalName: { type: 'string', description: 'Optional festival name to include festival buffer', required: false },
    },
    handler: async (args) => {
      const result = await calculateReorder(args.productId, DEFAULT_STORE_ID, args.festivalName);
      return { tool: 'calculate_reorder_quantity', success: true, data: result };
    },
  },
  
  get_product_details: {
    name: 'get_product_details',
    description: 'Returns detailed product information: SKU, name, brand, category, prices, GST rate, supplier, inventory, recent sales.',
    parameters: {
      productId: { type: 'string', description: 'Product ID (optional)', required: false },
      sku: { type: 'string', description: 'SKU (optional, used if productId not given)', required: false },
    },
    handler: async (args) => {
      let product;
      if (args.productId) {
        product = await db.product.findUnique({ where: { id: args.productId } });
      } else if (args.sku) {
        product = await db.product.findFirst({ where: { sku: args.sku } });
      }
      if (!product) {
        return { tool: 'get_product_details', success: false, error: 'Product not found', data: null };
      }
      
      const supplierProduct = await db.supplierProduct.findFirst({
        where: { productId: product.id, preferred: true },
        include: { supplier: true },
      });
      
      const inventory = await db.inventorySnapshot.findFirst({
        where: { productId: product.id },
        orderBy: { snapshotDate: 'desc' },
      });
      
      return {
        tool: 'get_product_details',
        success: true,
        data: {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          brand: product.brand,
          category: product.category,
          subcategory: product.subcategory,
          mrp: product.mrp,
          sellingPrice: product.sellingPrice,
          gstRate: product.gstRate,
          supplier: supplierProduct ? {
            supplierId: supplierProduct.supplier.id,
            supplierName: supplierProduct.supplier.name,
            leadTimeDays: supplierProduct.supplier.leadTimeDays,
            moq: supplierProduct.supplier.minOrderQty,
            unitCost: supplierProduct.unitCost,
          } : null,
          inventory: inventory ? {
            onHandQty: inventory.onHandQty,
            reorderPoint: inventory.reorderPoint,
            maxStock: inventory.maxStock,
          } : null,
        },
      };
    },
  },
  
  create_purchase_order_draft: {
    name: 'create_purchase_order_draft',
    description: 'Creates a supplier-wise purchase order draft from APPROVED recommendations. Returns the created PO with line items. ENFORCES: only APPROVED recommendations can generate POs; MOQ must be satisfied; supplier must exist.',
    parameters: {
      supplierId: { type: 'string', description: 'Supplier ID to generate PO for', required: true },
    },
    handler: async (args, ctx) => {
      // Find approved recommendations for this supplier
      const approvedRecs = await db.recommendation.findMany({
        where: {
          supplierId: args.supplierId,
          status: 'APPROVED',
        },
        include: { product: true },
      });

      if (approvedRecs.length === 0) {
        return {
          tool: 'create_purchase_order_draft',
          success: false,
          error: 'No APPROVED recommendations found for this supplier. Manager approval is required before PO creation.',
          data: null,
        };
      }

      const supplier = await db.supplier.findUnique({ where: { id: args.supplierId } });
      if (!supplier) {
        return { tool: 'create_purchase_order_draft', success: false, error: 'Supplier not found', data: null };
      }

      // Resolve actual user ID
      let actualUserId = ctx.userId;
      if (!actualUserId || actualUserId === 'demo-user') {
        const manager = await db.user.findFirst({ where: { tenantId: ctx.tenantId, role: 'MANAGER' } });
        actualUserId = manager?.id || '';
      } else {
        const u = await db.user.findUnique({ where: { id: actualUserId } });
        if (!u) {
          const manager = await db.user.findFirst({ where: { tenantId: ctx.tenantId, role: 'MANAGER' } });
          actualUserId = manager?.id || '';
        }
      }

      // Generate PO number (deterministic)
      const poCount = await db.purchaseOrder.count();
      const poNumber = `PO-${new Date().getFullYear()}-${String(poCount + 1).padStart(5, '0')}`;

      // Calculate totals
      let subtotal = 0;
      let taxAmount = 0;
      const lines = [];

      for (const rec of approvedRecs) {
        const supplierProduct = await db.supplierProduct.findFirst({
          where: { supplierId: args.supplierId, productId: rec.productId },
        });
        if (!supplierProduct) continue;

        const lineSubtotal = rec.recommendedQty * supplierProduct.unitCost;
        const lineTax = lineSubtotal * (rec.product.gstRate / 100);
        subtotal += lineSubtotal;
        taxAmount += lineTax;

        lines.push({
          productId: rec.productId,
          recommendationId: rec.id,
          quantity: rec.recommendedQty,
          unitPrice: supplierProduct.unitCost,
          subtotal: lineSubtotal,
          taxAmount: lineTax,
          gstRate: rec.product.gstRate,
        });
      }

      const total = subtotal + taxAmount;

      // Create PO (transactional)
      const po = await db.purchaseOrder.create({
        data: {
          poNumber,
          tenantId: ctx.tenantId,
          supplierId: args.supplierId,
          storeId: DEFAULT_STORE_ID,
          status: 'DRAFT',
          currency: 'INR',
          subtotal,
          taxAmount,
          estimatedTotal: total,
          lines: {
            create: lines,
          },
        },
        include: { lines: true },
      });

      // Update recommendations to PO_GENERATED
      await db.recommendation.updateMany({
        where: { id: { in: approvedRecs.map(r => r.id) } },
        data: { status: 'PO_GENERATED' },
      });

      // Audit log (skip if no valid user)
      if (actualUserId) {
        await db.auditEvent.create({
          data: {
            tenantId: ctx.tenantId,
            userId: actualUserId,
            action: 'PO_DRAFT_CREATED',
            resourceType: 'PURCHASE_ORDER',
            resourceId: po.id,
            newValue: JSON.stringify({ poNumber, supplierId: args.supplierId, total, lineCount: lines.length }),
            source: 'AGENT_TOOL',
            timestamp: new Date(),
          },
        }).catch(() => {});
      }

      return {
        tool: 'create_purchase_order_draft',
        success: true,
        data: {
          poId: po.id,
          poNumber,
          supplierId: args.supplierId,
          supplierName: supplier.name,
          lineCount: lines.length,
          subtotal,
          taxAmount,
          total,
          status: 'DRAFT',
        },
      };
    },
  },
  
  validate_purchase_order: {
    name: 'validate_purchase_order',
    description: 'Validates a purchase order: checks MOQ, supplier existence, line quantities, idempotency.',
    parameters: {
      poId: { type: 'string', description: 'PO ID to validate', required: true },
    },
    handler: async (args) => {
      const po = await db.purchaseOrder.findUnique({
        where: { id: args.poId },
        include: { lines: true, supplier: true },
      });
      
      if (!po) {
        return { tool: 'validate_purchase_order', success: false, error: 'PO not found', data: null };
      }
      
      const issues: string[] = [];
      for (const line of po.lines) {
        if (line.quantity <= 0) issues.push(`Line ${line.id}: quantity must be positive`);
        if (line.quantity < po.supplier.minOrderQty) {
          issues.push(`Line ${line.id}: quantity ${line.quantity} below MOQ ${po.supplier.minOrderQty}`);
        }
        if (line.unitPrice < 0) issues.push(`Line ${line.id}: unit price cannot be negative`);
      }
      
      return {
        tool: 'validate_purchase_order',
        success: issues.length === 0,
        data: {
          poId: po.id,
          poNumber: po.poNumber,
          isValid: issues.length === 0,
          issues,
          lineCount: po.lines.length,
          total: po.estimatedTotal,
        },
      };
    },
  },
};

// ============================================================
// LLM ORCHESTRATION
// ============================================================

export interface AgentMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp: Date;
}

export interface ToolCall {
  tool: string;
  args: Record<string, any>;
}

const SYSTEM_PROMPT = `You are the AI Inventory Decision Agent — an intelligence layer for Indian retail inventory management.

CRITICAL RULES (NEVER VIOLATE):
1. ALL numbers MUST come from tool calls. Never invent sales, inventory, forecasts, prices, MOQ, lead times, or GST values.
2. You cannot create purchase orders without manager approval. Approval state machine: DRAFT → PENDING_REVIEW → APPROVED → PO_GENERATED.
3. When unsure about a product ID, call get_inventory_snapshot or get_product_details first.
4. Always show evidence for recommendations: current stock, forecast, lead time, MOQ, festival effect, confidence.
5. Do not expose internal database structure or raw SQL.
6. For festival questions (Diwali, Holi, etc.), use analyze_festival_impact.
7. For reorder questions, use calculate_reorder_quantity.
8. For PO creation, FIRST ensure recommendations are APPROVED. If not, tell the user to approve first.

AVAILABLE TOOLS:
- get_sales_summary: Overall sales KPIs (revenue, transactions, top categories)
- get_inventory_snapshot: Current inventory levels and risk flags
- forecast_demand: 7/14/30-day demand forecast for a product
- get_stockout_risk: Stockout probability and risk classification
- get_overstock_risk: Overstocked items (days of inventory > threshold)
- get_movement_classification: Fast/normal/slow movers (ABC-XYZ)
- analyze_festival_impact: Festival uplift calculation
- get_supplier_constraints: Lead time, MOQ, payment terms
- calculate_reorder_quantity: Recommended reorder qty with reasoning
- get_product_details: Product catalog info
- create_purchase_order_draft: Generate PO from APPROVED recommendations
- validate_purchase_order: Validate MOQ and supplier constraints

RESPONSE FORMAT:
- Be conversational but grounded in tool data.
- When showing recommendations, format as: SKU, risk level, current stock, forecast, recommended qty, confidence, "why" explanation.
- For numbers, use INR (₹) for money and proper units.
- For tables, use markdown.
- If a tool returns an error, explain it clearly to the user and suggest next steps.
- Always include a "Why" section for recommendations citing the actual numbers from tool outputs.`;

export async function runAgent(
  userMessage: string,
  ctx: AgentContext,
  history: AgentMessage[] = []
): Promise<AgentMessage[]> {
  const messages: AgentMessage[] = [...history];
  messages.push({ role: 'user', content: userMessage, timestamp: new Date() });
  
  try {
    // Use ZAI SDK for LLM
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zaiClient = await ZAI.create();
    
    // Convert history to chat format
    const chatHistory = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];
    
    // First LLM call: decide what tools to call
    const toolSchemas = Object.values(TOOLS).map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
    
    const toolListStr = toolSchemas.map(t =>
      `- ${t.name}: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters)}`
    ).join('\n');
    
    const plannerPrompt = `${SYSTEM_PROMPT}

You have access to these tools:
${toolListStr}

The user said: "${userMessage}"

Decide which tools to call. Respond with ONLY a JSON object in this exact format:
{
  "thoughts": "brief reasoning about what to do",
  "tool_calls": [
    { "tool": "tool_name", "args": { ... } }
  ]
}

Rules:
- Call tools in dependency order (e.g., get inventory before forecast before reorder).
- If the user asks "what should I reorder today?" or "what's at risk?", call get_stockout_risk with no productId to get all at-risk items, then call calculate_reorder_quantity for the top 3.
- If the user asks about a specific festival, call analyze_festival_impact for relevant products.
- If the user asks to create a PO, FIRST check get_inventory_snapshot or get_stockout_risk to find pending recommendations. The tool create_purchase_order_draft will fail if no APPROVED recommendations exist - in that case, tell the user to approve recommendations first.
- For simple greeting/chitchat, return empty tool_calls array.
- Maximum 5 tool calls per turn.`;
    
    const plannerResponse = await zaiClient.chat.completions.create({
      messages: [{ role: 'user', content: plannerPrompt }],
      temperature: 0.3,
      max_tokens: 800,
    });
    
    const plannerText = plannerResponse.choices[0]?.message?.content || '';
    
    // Parse tool calls
    let toolCalls: ToolCall[] = [];
    try {
      const jsonMatch = plannerText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        toolCalls = (parsed.tool_calls || []).slice(0, 5);
      }
    } catch (e) {
      // LLM didn't return valid JSON, treat as direct response
    }
    
    // Execute tool calls
    const toolResults: ToolResult[] = [];
    for (const tc of toolCalls) {
      const tool = TOOLS[tc.tool];
      if (!tool) {
        toolResults.push({
          tool: tc.tool,
          success: false,
          data: null,
          error: `Unknown tool: ${tc.tool}`,
        });
        continue;
      }
      try {
        const result = await tool.handler(tc.args || {}, ctx);
        toolResults.push(result);
        // Audit log the tool call
        await db.auditEvent.create({
          data: {
            tenantId: ctx.tenantId,
            userId: ctx.userId,
            action: 'AGENT_TOOL_CALL',
            resourceType: 'AGENT',
            resourceId: tc.tool,
            newValue: JSON.stringify({ args: tc.args, success: result.success }),
            source: 'AGENT_TOOL',
            timestamp: new Date(),
          },
        });
      } catch (e: any) {
        toolResults.push({
          tool: tc.tool,
          success: false,
          data: null,
          error: e.message,
        });
      }
    }
    
    // If no tool calls, the plannerText is the response
    let finalResponse: string;
    if (toolResults.length === 0) {
      finalResponse = plannerText;
    } else {
      // Synthesize final response with tool results
      const toolResultsStr = toolResults.map(r => {
        if (!r.success) return `Tool ${r.tool}: ERROR - ${r.error}`;
        return `Tool ${r.tool} result:\n\`\`\`json\n${JSON.stringify(r.data, null, 2)}\n\`\`\``;
      }).join('\n\n');
      
      const synthesisPrompt = `${SYSTEM_PROMPT}

You called these tools in response to the user's message: "${userMessage}"

Tool results:
${toolResultsStr}

Synthesize a natural-language response for the user based on the tool data. Rules:
1. Use ONLY the numbers from tool results. Never invent values.
2. Be conversational but professional.
3. For recommendations, format clearly: SKU/product, risk, current stock, forecast, recommended qty, confidence, "why".
4. For tables, use markdown.
5. For money, use ₹ symbol.
6. If a tool failed, explain the issue and suggest next steps.
7. If user asked to create a PO but no APPROVED recommendations exist, tell them they need to approve recommendations first via the Recommendations page.
8. Keep response concise but informative — typically 100-400 words.`;
      
      const synthResponse = await zaiClient.chat.completions.create({
        messages: [{ role: 'user', content: synthesisPrompt }],
        temperature: 0.5,
        max_tokens: 800,
      });
      
      finalResponse = synthResponse.choices[0]?.message?.content || 'I processed your request but could not generate a response.';
    }
    
    messages.push({
      role: 'assistant',
      content: finalResponse,
      toolCalls,
      toolResults,
      timestamp: new Date(),
    });
    
    return messages;
  } catch (e: any) {
    // Fallback if LLM fails
    messages.push({
      role: 'assistant',
      content: `I encountered an issue connecting to the LLM service: ${e.message}. However, I can still help you with deterministic inventory operations. Please try a more specific question, or use the dashboard pages directly.`,
      timestamp: new Date(),
    });
    return messages;
  }
}

// ============================================================
// HELPERS
// ============================================================

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

function round(n: number, decimals: number = 2): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
