/**
 * Recommendation Engine + Approval Workflow + GST + Audit
 */

import { db } from '@/lib/db';
import { v4 as uuid } from 'uuid';
import { calculateReorder } from './inventory';
import { computeStockoutRisk } from './inventory';

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'tenant-default';
const DEFAULT_STORE_ID = process.env.DEFAULT_STORE_ID || 'store-default';

// ============================================================
// RECOMMENDATION GENERATION
// Generates reorder recommendations for all HIGH/CRITICAL risk items
// ============================================================

export async function generateRecommendations(
  festivalName?: string,
  limit: number = 20
): Promise<{ count: number; recommendations: any[] }> {
  // Find all inventory items
  const inventory = await db.inventorySnapshot.findMany({
    where: { storeId: DEFAULT_STORE_ID },
    orderBy: { snapshotDate: 'desc' },
    take: 500,
    include: { product: true },
  });
  
  // Dedupe by product (latest snapshot)
  const seen = new Set<string>();
  const unique = inventory.filter(i => {
    if (seen.has(i.productId)) return false;
    seen.add(i.productId);
    return true;
  });
  
  const candidates: any[] = [];
  for (const inv of unique.slice(0, 1000)) {
    const risk = await computeStockoutRisk(inv.productId, DEFAULT_STORE_ID);
    if (risk.riskLevel === 'HIGH' || risk.riskLevel === 'CRITICAL' || risk.riskLevel === 'WATCH') {
      candidates.push({ inventory: inv, risk });
    }
  }
  
  // Sort by stockout probability descending
  candidates.sort((a, b) => b.risk.stockoutProbability - a.risk.stockoutProbability);
  
  const top = candidates.slice(0, limit);
  const recommendations: any[] = [];
  
  for (const { inventory: inv, risk } of top) {
    // Compute reorder
    const reorder = await calculateReorder(inv.productId, DEFAULT_STORE_ID, festivalName);
    
    // Per spec: "If forecast is unavailable, DO NOT automatically use MOQ as recommendation."
    // Skip items with FORECAST_REQUIRED — they need forecast evidence before recommendation.
    if (reorder.limitingConstraint === 'FORECAST_REQUIRED') continue;
    if (reorder.recommendedQty <= 0) continue;
    
    // Check if pending recommendation already exists for this product
    const existing = await db.recommendation.findFirst({
      where: {
        productId: inv.productId,
        status: { in: ['PENDING_REVIEW', 'APPROVED'] },
      },
    });
    if (existing) continue;
    
    // Create recommendation
    const rec = await db.recommendation.create({
      data: {
        tenantId: DEFAULT_TENANT_ID,
        storeId: DEFAULT_STORE_ID,
        productId: inv.productId,
        supplierId: reorder.supplierId || null,
        recommendedQty: reorder.recommendedQty,
        estimatedCost: reorder.estimatedCost,
        riskLevel: reorder.riskLevel,
        confidence: reorder.confidence,
        reasoningSummary: reorder.reasoningSummary,
        festivalEffect: reorder.festivalEffect || null,
        status: 'PENDING_REVIEW',
        modelVersionId: 'mv-demand-v1',
        currentStock: reorder.currentStock,
        forecastQty: reorder.forecastDemand7d,
        leadTimeDays: reorder.leadTimeDays,
        moq: reorder.moq,
        safetyStock: reorder.safetyStock,
      },
      include: { product: true, supplier: true },
    });
    
    recommendations.push(rec);
    
    // Audit log
    await db.auditEvent.create({
      data: {
        tenantId: DEFAULT_TENANT_ID,
        action: 'RECOMMENDATION_CREATED',
        resourceType: 'RECOMMENDATION',
        resourceId: rec.id,
        newValue: JSON.stringify({
          productId: inv.productId,
          recommendedQty: reorder.recommendedQty,
          riskLevel: reorder.riskLevel,
        }),
        source: 'RECOMMENDATION_ENGINE',
        timestamp: new Date(),
      },
    });
  }
  
  return { count: recommendations.length, recommendations };
}

// ============================================================
// APPROVAL WORKFLOW
// State machine: PENDING_REVIEW → APPROVED/MODIFIED/REJECTED → PO_GENERATED
// ============================================================

export async function approveRecommendation(
  recommendationId: string,
  userId: string,
  comment?: string
) {
  const rec = await db.recommendation.findUnique({
    where: { id: recommendationId },
  });

  if (!rec) throw new Error('Recommendation not found');
  if (rec.status !== 'PENDING_REVIEW') {
    throw new Error(`Cannot approve recommendation in status ${rec.status}`);
  }

  // Resolve actual user ID (the demo-user alias maps to the first MANAGER user)
  const actualUserId = await resolveUserId(userId, rec.tenantId);

  const updated = await db.recommendation.update({
    where: { id: recommendationId },
    data: { status: 'APPROVED' },
  });

  await db.approval.create({
    data: {
      tenantId: rec.tenantId,
      recommendationId: rec.id,
      userId: actualUserId,
      action: 'APPROVE',
      originalQty: rec.recommendedQty,
      finalQty: rec.recommendedQty,
      comment,
    },
  });

  await db.auditEvent.create({
    data: {
      tenantId: rec.tenantId,
      userId: actualUserId,
      action: 'RECOMMENDATION_APPROVED',
      resourceType: 'RECOMMENDATION',
      resourceId: rec.id,
      oldValue: 'PENDING_REVIEW',
      newValue: 'APPROVED',
      reason: comment,
      source: 'MANAGER_UI',
      timestamp: new Date(),
    },
  });

  return updated;
}

// Resolve "demo-user" alias to an actual user ID
async function resolveUserId(userId: string, tenantId: string): Promise<string> {
  if (userId && userId !== 'demo-user') {
    // Verify the user exists
    const u = await db.user.findUnique({ where: { id: userId } });
    if (u) return userId;
  }
  // Fallback: find any MANAGER user for this tenant
  const manager = await db.user.findFirst({
    where: { tenantId, role: 'MANAGER' },
  });
  if (manager) return manager.id;
  // Final fallback: any user
  const any = await db.user.findFirst({ where: { tenantId } });
  if (any) return any.id;
  throw new Error('No user found in database');
}

export async function modifyRecommendation(
  recommendationId: string,
  userId: string,
  finalQty: number,
  comment?: string
) {
  if (finalQty <= 0) throw new Error('Final quantity must be positive');

  const rec = await db.recommendation.findUnique({
    where: { id: recommendationId },
  });

  if (!rec) throw new Error('Recommendation not found');
  if (rec.status !== 'PENDING_REVIEW') {
    throw new Error(`Cannot modify recommendation in status ${rec.status}`);
  }

  const actualUserId = await resolveUserId(userId, rec.tenantId);

  const updated = await db.recommendation.update({
    where: { id: recommendationId },
    data: {
      status: 'MODIFIED',
      recommendedQty: finalQty,
    },
  });

  await db.approval.create({
    data: {
      tenantId: rec.tenantId,
      recommendationId: rec.id,
      userId: actualUserId,
      action: 'MODIFY',
      originalQty: rec.recommendedQty,
      finalQty,
      comment,
    },
  });

  await db.auditEvent.create({
    data: {
      tenantId: rec.tenantId,
      userId: actualUserId,
      action: 'RECOMMENDATION_MODIFIED',
      resourceType: 'RECOMMENDATION',
      resourceId: rec.id,
      oldValue: JSON.stringify({ qty: rec.recommendedQty, status: 'PENDING_REVIEW' }),
      newValue: JSON.stringify({ qty: finalQty, status: 'MODIFIED' }),
      reason: comment,
      source: 'MANAGER_UI',
      timestamp: new Date(),
    },
  });

  return updated;
}

export async function rejectRecommendation(
  recommendationId: string,
  userId: string,
  comment?: string
) {
  const rec = await db.recommendation.findUnique({
    where: { id: recommendationId },
  });

  if (!rec) throw new Error('Recommendation not found');
  if (rec.status !== 'PENDING_REVIEW') {
    throw new Error(`Cannot reject recommendation in status ${rec.status}`);
  }

  const actualUserId = await resolveUserId(userId, rec.tenantId);

  const updated = await db.recommendation.update({
    where: { id: recommendationId },
    data: { status: 'REJECTED' },
  });

  await db.approval.create({
    data: {
      tenantId: rec.tenantId,
      recommendationId: rec.id,
      userId: actualUserId,
      action: 'REJECT',
      originalQty: rec.recommendedQty,
      comment,
    },
  });

  await db.auditEvent.create({
    data: {
      tenantId: rec.tenantId,
      userId: actualUserId,
      action: 'RECOMMENDATION_REJECTED',
      resourceType: 'RECOMMENDATION',
      resourceId: rec.id,
      oldValue: 'PENDING_REVIEW',
      newValue: 'REJECTED',
      reason: comment,
      source: 'MANAGER_UI',
      timestamp: new Date(),
    },
  });

  return updated;
}

// ============================================================
// GST MODULE
// ============================================================

export interface GstBreakdown {
  gstRate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export function computeGst(taxableValue: number, gstRate: number, isIntrastate: boolean = true): GstBreakdown {
  const tax = taxableValue * (gstRate / 100);
  if (isIntrastate) {
    return {
      gstRate,
      taxableValue,
      cgst: round(tax / 2, 2),
      sgst: round(tax / 2, 2),
      igst: 0,
      total: round(taxableValue + tax, 2),
    };
  } else {
    return {
      gstRate,
      taxableValue,
      cgst: 0,
      sgst: 0,
      igst: round(tax, 2),
      total: round(taxableValue + tax, 2),
    };
  }
}

export async function getGstReport(startDate: Date, endDate: Date) {
  const sales = await db.sale.findMany({
    where: {
      saleTimestamp: { gte: startDate, lte: endDate },
    },
    include: { product: true },
  });
  
  const purchases = await db.purchaseOrder.findMany({
    where: {
      orderDate: { gte: startDate, lte: endDate },
      status: { notIn: ['CANCELLED'] },
    },
    include: { lines: { include: { product: true } }, supplier: true },
  });
  
  // Sales GST (output tax)
  let outputTaxable = 0;
  let outputCgst = 0;
  let outputSgst = 0;
  let outputIgst = 0;
  
  const salesByRate = new Map<number, { taxable: number; tax: number }>();
  
  for (const s of sales) {
    const taxableValue = s.netSales / (1 + s.product.gstRate / 100);
    const tax = s.netSales - taxableValue;
    outputTaxable += taxableValue;
    // Assume intrastate for demo
    outputCgst += tax / 2;
    outputSgst += tax / 2;
    
    const cur = salesByRate.get(s.product.gstRate) || { taxable: 0, tax: 0 };
    cur.taxable += taxableValue;
    cur.tax += tax;
    salesByRate.set(s.product.gstRate, cur);
  }
  
  // Purchase GST (input tax)
  let inputTaxable = 0;
  let inputCgst = 0;
  let inputSgst = 0;
  let inputIgst = 0;
  
  const purchasesByRate = new Map<number, { taxable: number; tax: number }>();
  
  for (const po of purchases) {
    for (const line of po.lines) {
      const taxableValue = line.subtotal;
      const tax = line.taxAmount;
      inputTaxable += taxableValue;
      // Intrastate if same state (assume Karnataka supplier → Karnataka store)
      inputCgst += tax / 2;
      inputSgst += tax / 2;
      
      const cur = purchasesByRate.get(line.gstRate) || { taxable: 0, tax: 0 };
      cur.taxable += taxableValue;
      cur.tax += tax;
      purchasesByRate.set(line.gstRate, cur);
    }
  }
  
  return {
    period: { startDate, endDate },
    outputTax: {
      taxableValue: round(outputTaxable),
      cgst: round(outputCgst),
      sgst: round(outputSgst),
      igst: round(outputIgst),
      total: round(outputCgst + outputSgst + outputIgst),
      byRate: Array.from(salesByRate.entries()).map(([rate, v]) => ({
        gstRate: rate,
        taxableValue: round(v.taxable),
        tax: round(v.tax),
      })),
    },
    inputTax: {
      taxableValue: round(inputTaxable),
      cgst: round(inputCgst),
      sgst: round(inputSgst),
      igst: round(inputIgst),
      total: round(inputCgst + inputSgst + inputIgst),
      byRate: Array.from(purchasesByRate.entries()).map(([rate, v]) => ({
        gstRate: rate,
        taxableValue: round(v.taxable),
        tax: round(v.tax),
      })),
    },
    netPayable: round((outputCgst + outputSgst + outputIgst) - (inputCgst + inputSgst + inputIgst)),
  };
}

// ============================================================
// HELPERS
// ============================================================

function round(n: number, decimals: number = 2): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
