/**
 * Inventory Intelligence Engine
 * 
 * Implements (per docs):
 *  - Stockout Risk (deterministic + ML probability)
 *  - Overstock Detection (days of inventory > threshold)
 *  - Fast/Slow Moving (ABC-XYZ segmentation)
 *  - Reorder Optimizer (MOQ, lead-time, safety-stock, festival buffer)
 *  - Festival Intelligence (uplift calc with confidence)
 */

import { db } from '@/lib/db';
import { getDailySalesSeries, forecastDemand } from './forecast';

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'tenant-default';
const DEFAULT_STORE_ID = process.env.DEFAULT_STORE_ID || 'store-default';

// ============================================================
// STOCKOUT RISK
// ============================================================

export interface StockoutRisk {
  productId: string;
  sku: string;
  productName: string;
  currentStock: number;
  availableStock: number;
  reorderPoint: number;
  forecastDailyDemand: number;
  forecastAvailable: boolean; // false when no sales history
  leadTimeDays: number;
  leadTimeDemand: number;
  safetyStock: number;
  requiredCoverage: number;
  daysOfInventory: number | null; // null when forecast unavailable
  expectedDaysToStockout: number | null; // null when forecast unavailable
  riskLevel: 'SAFE' | 'WATCH' | 'HIGH' | 'CRITICAL' | 'NO_DEMAND_SIGNAL';
  stockoutProbability: number;
  reason: string;
}

export async function computeStockoutRisk(
  productId: string,
  storeId: string = DEFAULT_STORE_ID
): Promise<StockoutRisk> {
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found');

  const inventory = await db.inventorySnapshot.findFirst({
    where: { productId, storeId },
    orderBy: { snapshotDate: 'desc' },
  });

  const supplierProduct = await db.supplierProduct.findFirst({
    where: { productId, preferred: true },
    include: { supplier: true },
  });

  const supplier = supplierProduct?.supplier;
  const leadTimeDays = supplier?.leadTimeDays || 3;

  const onHandQty = inventory?.onHandQty || 0;
  const reservedQty = inventory?.reservedQty || 0;
  const damagedQty = inventory?.damagedQty || 0;
  const availableStock = onHandQty - reservedQty - damagedQty;
  const reorderPoint = inventory?.reorderPoint || 0;

  // Get daily demand series to compute forecast
  const series = await getDailySalesSeries(productId, storeId, 28);
  const recent7 = series.slice(-7).map(s => s.qty);
  const recent14 = series.slice(-14).map(s => s.qty);

  const forecastDailyDemand = mean(recent7);
  const demandStd = std(recent14);

  // Determine if forecast is available (at least some sales in last 28 days)
  const salesCount = series.filter(s => s.qty > 0).length;
  const forecastAvailable = salesCount >= 3 && forecastDailyDemand > 0.1;

  // Lead-time demand
  const leadTimeDemand = forecastAvailable ? forecastDailyDemand * leadTimeDays : 0;
  // Safety stock: Z=1.65 (95% service) × σ × √LT
  const serviceFactor = 1.65;
  const safetyStock = forecastAvailable ? serviceFactor * demandStd * Math.sqrt(leadTimeDays) : 0;
  // Required coverage
  const requiredCoverage = leadTimeDemand + safetyStock;

  // Days of inventory — NULL when forecast unavailable (not 999)
  const daysOfInventory: number | null = forecastAvailable
    ? availableStock / forecastDailyDemand
    : null;

  // Expected days to stockout — NULL when forecast unavailable
  const expectedDaysToStockout: number | null = forecastAvailable
    ? Math.floor(availableStock / forecastDailyDemand)
    : null;

  // Risk classification
  let riskLevel: StockoutRisk['riskLevel'] = 'SAFE';
  let reason = '';

  if (!forecastAvailable) {
    // No demand signal — can't compute meaningful risk
    if (availableStock <= 0) {
      riskLevel = 'CRITICAL';
      reason = `Out of stock with no sales history. Forecast unavailable — cannot compute lead-time demand.`;
    } else {
      riskLevel = 'NO_DEMAND_SIGNAL';
      reason = `No sales history in last 28 days. Cannot compute forecast — risk classification unavailable.`;
    }
  } else if (availableStock <= 0) {
    riskLevel = 'CRITICAL';
    reason = `Out of stock. Available (${availableStock}) is zero or negative.`;
  } else if (availableStock < leadTimeDemand) {
    riskLevel = 'HIGH';
    reason = `Available stock (${availableStock.toFixed(0)}) is less than lead-time demand (${leadTimeDemand.toFixed(1)}). Stockout likely during supplier lead time (${leadTimeDays}d).`;
  } else if (availableStock < requiredCoverage) {
    riskLevel = 'WATCH';
    reason = `Available stock (${availableStock.toFixed(0)}) is below required coverage (${requiredCoverage.toFixed(1)} = lead-time demand + safety stock).`;
  } else if (availableStock < reorderPoint) {
    riskLevel = 'WATCH';
    reason = `Available stock (${availableStock.toFixed(0)}) is below reorder point (${reorderPoint}).`;
  } else {
    riskLevel = 'SAFE';
    reason = `Available stock (${availableStock.toFixed(0)}) covers ${(daysOfInventory!).toFixed(1)} days of demand.`;
  }

  // Fetch On Order Stock for ML feature
  const onOrderLines = await db.purchaseOrderLine.findMany({
    where: { productId, po: { status: { in: ['DRAFT', 'SENT', 'ACKNOWLEDGED', 'PARTIALLY_FULFILLED'] } } },
    include: { po: true },
  });
  const onOrderStock = onOrderLines.reduce((s, l) => s + l.quantity, 0);

  // Stockout probability using Python ML Model
  let stockoutProbability = 0;
  if (forecastAvailable) {
    try {
      const rolling_demand_7 = forecastDailyDemand * 7;
      const stock_cover_ratio = availableStock / (rolling_demand_7 + 0.00001);
      
      const mlResponse = await fetch('http://localhost:8000/api/v1/predict/stockout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closing_stock: availableStock,
          rolling_demand_7: rolling_demand_7,
          stock_cover_ratio: stock_cover_ratio,
          on_order_qty: onOrderStock
        })
      });
      if (mlResponse.ok) {
        const mlData = await mlResponse.json();
        stockoutProbability = mlData.stockoutRisk || 0;
        
        // Enhance risk level based on ML classification if it predicts a stockout
        if (mlData.willStockout && riskLevel === 'SAFE') {
            riskLevel = 'WATCH';
            reason += ' (ML Model indicates hidden stockout risk)';
        }
      }
    } catch (err) {
      console.error("Failed to reach ML backend for stockout risk, using heuristic", err);
      const coverageRatio = requiredCoverage > 0 ? availableStock / requiredCoverage : 1;
      if (availableStock <= 0) stockoutProbability = 0.99;
      else if (coverageRatio < 0.5) stockoutProbability = 0.95;
      else if (coverageRatio < 0.8) stockoutProbability = 0.75;
      else if (coverageRatio < 1.0) stockoutProbability = 0.45;
      else if (coverageRatio < 1.5) stockoutProbability = 0.15;
      else stockoutProbability = 0.03;
    }
  }

  return {
    productId,
    sku: product.sku,
    productName: product.name,
    currentStock: onHandQty,
    availableStock,
    reorderPoint,
    forecastDailyDemand: round(forecastDailyDemand, 1),
    forecastAvailable,
    leadTimeDays,
    leadTimeDemand: round(leadTimeDemand, 1),
    safetyStock: round(safetyStock, 1),
    requiredCoverage: round(requiredCoverage, 1),
    daysOfInventory: daysOfInventory !== null ? round(daysOfInventory, 1) : null,
    expectedDaysToStockout,
    riskLevel,
    stockoutProbability,
    reason,
  };
}

// ============================================================
// OVERSTOCK DETECTION
// ============================================================

export interface OverstockInfo {
  productId: string;
  sku: string;
  productName: string;
  currentStock: number;
  forecastDailyDemand: number;
  forecastAvailable: boolean;
  daysOfInventory: number | null; // null when forecast unavailable
  threshold: number;
  classification: 'OVERSTOCK' | 'VERY_SLOW' | 'NO_DEMAND_SIGNAL' | 'HEALTHY';
  isOverstock: boolean;
  movementClass: string;
  recommendation: string;
}

export async function computeOverstock(
  productId: string,
  storeId: string = DEFAULT_STORE_ID
): Promise<OverstockInfo> {
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found');

  const inventory = await db.inventorySnapshot.findFirst({
    where: { productId, storeId },
    orderBy: { snapshotDate: 'desc' },
  });

  const series = await getDailySalesSeries(productId, storeId, 28);
  const forecastDailyDemand = mean(series.slice(-7).map(s => s.qty));
  const onHandQty = inventory?.onHandQty || 0;

  // Determine if forecast is available
  const salesCount = series.filter(s => s.qty > 0).length;
  const forecastAvailable = salesCount >= 3 && forecastDailyDemand > 0.1;

  // Threshold: 30 days for most, 14 for perishables
  const category = (product.category || '').toLowerCase();
  const threshold = category.includes('dairy') || category.includes('fruit') || category.includes('vegetable') ? 14 : 30;

  // Days of inventory — NULL when forecast unavailable
  const daysOfInventory: number | null = forecastAvailable
    ? onHandQty / forecastDailyDemand
    : null;

  // Movement class (ABC-XYZ simplified)
  const movementClass = computeMovementClass(series.map(s => s.qty), onHandQty);

  // Classification per spec:
  //   NO_DEMAND_SIGNAL  — demand unavailable
  //   VERY_SLOW         — historical demand genuinely near zero
  //   OVERSTOCK         — inventory exceeds expected coverage
  //   HEALTHY           — within threshold
  let classification: OverstockInfo['classification'] = 'HEALTHY';
  let isOverstock = false;
  let recommendation = '';

  if (!forecastAvailable) {
    if (onHandQty > 0) {
      classification = 'NO_DEMAND_SIGNAL';
      recommendation = 'No sales history in last 28 days. Cannot assess overstock — review product status (discontinued? new arrival?).';
    } else {
      classification = 'HEALTHY';
      recommendation = 'No stock and no demand signal.';
    }
  } else if (forecastDailyDemand < 0.5 && onHandQty > 0) {
    classification = 'VERY_SLOW';
    isOverstock = true;
    recommendation = 'Very slow-moving item. Historical demand is near zero. Consider markdown or delisting.';
  } else if (daysOfInventory !== null && daysOfInventory > threshold) {
    classification = 'OVERSTOCK';
    isOverstock = true;
    if (daysOfInventory > 90) {
      recommendation = 'Severe overstock. Consider markdown/discount to clear inventory.';
    } else if (daysOfInventory > 60) {
      recommendation = 'High overstock. Reduce future orders; run promotion.';
    } else {
      recommendation = 'Mild overstock. Skip next reorder cycle.';
    }
  } else {
    classification = 'HEALTHY';
    recommendation = 'Stock level is within healthy range.';
  }

  return {
    productId,
    sku: product.sku,
    productName: product.name,
    currentStock: onHandQty,
    forecastDailyDemand: round(forecastDailyDemand, 1),
    forecastAvailable,
    daysOfInventory: daysOfInventory !== null ? round(daysOfInventory, 1) : null,
    threshold,
    classification,
    isOverstock,
    movementClass,
    recommendation,
  };
}

// ============================================================
// MOVEMENT CLASSIFICATION (ABC-XYZ)
// ============================================================

export function computeMovementClass(
  dailySales: number[],
  currentStock: number
): string {
  // ABC: by revenue contribution (proxy: average daily sales)
  const avgDaily = mean(dailySales);
  let abc = 'C';
  if (avgDaily >= 50) abc = 'A';
  else if (avgDaily >= 15) abc = 'B';
  
  // XYZ: by variability (CV)
  const cv = mean(dailySales) > 0 ? std(dailySales) / Math.max(mean(dailySales), 1) : 0;
  let xyz = 'X';
  if (cv >= 1.0) xyz = 'Z';
  else if (cv >= 0.5) xyz = 'Y';
  
  return `${abc}-${xyz}`;
}

export function getMovementLabel(abcXyz: string): { fast: 'fast' | 'normal' | 'slow' | 'dead'; description: string } {
  const [abc] = abcXyz.split('-');
  if (abc === 'A') return { fast: 'fast', description: 'High-velocity item. Top revenue contributor.' };
  if (abc === 'B') return { fast: 'normal', description: 'Steady seller. Maintains consistent demand.' };
  if (abc === 'C') {
    // C items are slow, but check if dead (no sales recently)
    return { fast: 'slow', description: 'Slow-moving. Consider reducing safety stock.' };
  }
  return { fast: 'dead', description: 'Dead stock. Likely no movement.' };
}

// ============================================================
// FESTIVAL INTELLIGENCE
// ============================================================

export interface FestivalImpact {
  eventName: string;
  productId: string;
  sku: string;
  productName: string;
  expectedUplift: number;
  forecastUnits: number;
  confidence: number;
  evidenceDays: number;
  reason: string;
}

export async function analyzeFestivalImpact(
  productId: string,
  eventName: string
): Promise<FestivalImpact> {
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found');
  
  const festival = await db.festival.findFirst({ where: { name: eventName } });
  if (!festival) {
    return {
      eventName,
      productId,
      sku: product.sku,
      productName: product.name,
      expectedUplift: 0,
      forecastUnits: 0,
      confidence: 0,
      evidenceDays: 0,
      reason: `Festival ${eventName} not found in calendar.`,
    };
  }
  
  // Get historical sales during festival windows (last 3 years)
  const festivalStart = new Date(festival.startDate);
  const festivalEnd = new Date(festival.endDate);
  
  // Look at historical windows around the same festival date
  const allSales = await db.sale.findMany({
    where: {
      productId,
      saleTimestamp: { gte: new Date('2017-01-01') },
    },
    orderBy: { saleTimestamp: 'asc' },
  });
  
  // Compare sales during festival window vs. baseline (14 days before/after)
  let festivalDemand = 0;
  let festivalDays = 0;
  let baselineDemand = 0;
  let baselineDays = 0;
  
  for (let yearOffset = 0; yearOffset >= -5; yearOffset--) {
    const fs = new Date(festivalStart);
    fs.setFullYear(fs.getFullYear() + yearOffset);
    const fe = new Date(festivalEnd);
    fe.setFullYear(fe.getFullYear() + yearOffset);
    
    const bsStart = new Date(fs);
    bsStart.setDate(bsStart.getDate() - 14);
    const bsEnd = new Date(fe);
    bsEnd.setDate(bsEnd.getDate() + 14);
    
    for (const s of allSales) {
      if (s.saleTimestamp >= fs && s.saleTimestamp <= fe) {
        festivalDemand += s.quantity;
        festivalDays++;
      } else if (s.saleTimestamp >= bsStart && s.saleTimestamp <= bsEnd) {
        baselineDemand += s.quantity;
        baselineDays++;
      }
    }
  }
  
  // Compute uplift
  const dailyFestivalDemand = festivalDays > 0 ? festivalDemand / festivalDays : 0;
  const dailyBaselineDemand = baselineDays > 0 ? baselineDemand / baselineDays : 0;
  
  let uplift = 0;
  if (dailyBaselineDemand > 0) {
    uplift = (dailyFestivalDemand - dailyBaselineDemand) / dailyBaselineDemand;
  } else if (dailyFestivalDemand > 0) {
    uplift = 0.5; // No baseline, but observed festival demand
  }
  
  // Forecast base demand next 7 days
  const series = await getDailySalesSeries(productId, undefined, 28);
  const baseForecast7d = mean(series.slice(-7).map(s => s.qty)) * 7;
  
  const forecastUnits = Math.round(baseForecast7d * (1 + Math.max(0, uplift)));
  
  // Confidence based on evidence
  const evidenceDays = festivalDays;
  const confidence = Math.min(0.95, Math.max(0.2, evidenceDays / 100));
  
  // Reason
  let reason: string;
  if (evidenceDays === 0) {
    reason = `No historical data for ${eventName}. Uplift estimate based on category importance only.`;
  } else if (uplift > 0.2) {
    reason = `Historical ${eventName} demand (${dailyFestivalDemand.toFixed(1)}/day) exceeded baseline (${dailyBaselineDemand.toFixed(1)}/day) by ${(uplift * 100).toFixed(0)}%.`;
  } else if (uplift > 0) {
    reason = `Mild uplift observed during ${eventName} (${(uplift * 100).toFixed(0)}%).`;
  } else {
    reason = `No significant uplift observed during ${eventName} in historical data.`;
  }
  
  return {
    eventName,
    productId,
    sku: product.sku,
    productName: product.name,
    expectedUplift: round(uplift, 2),
    forecastUnits,
    confidence: round(confidence, 2),
    evidenceDays,
    reason,
  };
}

// ============================================================
// REORDER OPTIMIZER
// ============================================================

export interface ReorderRecommendation {
  productId: string;
  sku: string;
  productName: string;
  storeId: string;
  supplierId: string;
  supplierName: string;
  currentStock: number;
  availableStock: number;
  forecastDemand7d: number;
  forecastDailyDemand: number;
  leadTimeDays: number;
  leadTimeDemand: number;
  safetyStock: number;
  moq: number;
  festivalBuffer: number;
  festivalEffect?: string;
  onOrderStock: number;
  grossReorderNeed: number;
  recommendedQty: number;
  packSize: number;
  unitCost: number;
  estimatedCost: number;
  riskLevel: string;
  confidence: number;
  limitingConstraint: string;
  reasoningSummary: string;
}

export async function calculateReorder(
  productId: string,
  storeId: string = DEFAULT_STORE_ID,
  festivalName?: string
): Promise<ReorderRecommendation> {
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found');
  
  const inventory = await db.inventorySnapshot.findFirst({
    where: { productId, storeId },
    orderBy: { snapshotDate: 'desc' },
  });
  
  const supplierProduct = await db.supplierProduct.findFirst({
    where: { productId, preferred: true },
    include: { supplier: true },
  });
  
  const supplier = supplierProduct?.supplier;
  const supplierId = supplier?.id || '';
  const supplierName = supplier?.name || 'Unknown';
  const leadTimeDays = supplier?.leadTimeDays || 3;
  const moq = supplier?.minOrderQty || 1;
  const unitCost = supplierProduct?.unitCost || product.sellingPrice * 0.65;
  
  const onHandQty = inventory?.onHandQty || 0;
  const reservedQty = inventory?.reservedQty || 0;
  const damagedQty = inventory?.damagedQty || 0;
  const availableStock = onHandQty - reservedQty - damagedQty;
  
  // Forecast
  const series = await getDailySalesSeries(productId, storeId, 28);
  const forecastDailyDemand = mean(series.slice(-7).map(s => s.qty));
  const demandStd = std(series.slice(-14).map(s => s.qty));
  const forecastDemand7d = forecastDailyDemand * 7;

  // Determine if forecast is available (at least 3 days of sales in last 28)
  const salesCount = series.filter(s => s.qty > 0).length;
  const forecastAvailable = salesCount >= 3 && forecastDailyDemand > 0.1;

  const leadTimeDemand = forecastAvailable ? forecastDailyDemand * leadTimeDays : 0;
  const safetyStock = forecastAvailable ? 1.65 * demandStd * Math.sqrt(leadTimeDays) : 0;

  // Festival buffer
  let festivalBuffer = 0;
  let festivalEffect: string | undefined;
  if (festivalName && forecastAvailable) {
    const impact = await analyzeFestivalImpact(productId, festivalName);
    if (impact.expectedUplift > 0) {
      festivalBuffer = Math.round(leadTimeDemand * impact.expectedUplift * impact.confidence);
      festivalEffect = `+${(impact.expectedUplift * 100).toFixed(0)}% (confidence ${impact.confidence.toFixed(2)})`;
    }
  }

  // On-order stock (sum of unfulfilled PO lines for this product)
  const onOrderLines = await db.purchaseOrderLine.findMany({
    where: { productId, po: { status: { in: ['DRAFT', 'SENT', 'ACKNOWLEDGED', 'PARTIALLY_FULFILLED'] } } },
    include: { po: true },
  });
  const onOrderStock = onOrderLines.reduce((s, l) => s + l.quantity, 0);

  // Gross need
  const grossReorderNeed =
    leadTimeDemand + safetyStock + festivalBuffer
    - availableStock - onOrderStock;

  // Apply MOQ + pack size constraints
  // Per spec: "If forecast is unavailable, DO NOT automatically use MOQ as recommendation.
  // Instead: FORECAST_REQUIRED or a clearly labelled baseline fallback.
  // Financial recommendations need evidence."
  let recommendedQty = 0;
  let limitingConstraint = 'NO_ORDER_NEEDED';
  const packSize = 1;

  if (!forecastAvailable) {
    // No forecast evidence — do NOT auto-recommend MOQ
    recommendedQty = 0;
    limitingConstraint = 'FORECAST_REQUIRED';
  } else if (grossReorderNeed <= 0 && availableStock > 0) {
    recommendedQty = 0;
    limitingConstraint = 'NO_ORDER_NEEDED';
  } else {
    recommendedQty = Math.max(Math.max(grossReorderNeed, 0), moq);
    recommendedQty = Math.ceil(recommendedQty / packSize) * packSize;
    if (recommendedQty === moq) limitingConstraint = 'MOQ_ENFORCED';
    else limitingConstraint = 'DEMAND_DRIVEN';
  }
  
  const estimatedCost = recommendedQty * unitCost;
  
  // Risk
  const requiredCoverage = leadTimeDemand + safetyStock;
  let riskLevel = 'SAFE';
  if (availableStock <= 0) riskLevel = 'CRITICAL';
  else if (availableStock < leadTimeDemand) riskLevel = 'HIGH';
  else if (availableStock < requiredCoverage) riskLevel = 'MEDIUM';
  else if (grossReorderNeed <= 0) riskLevel = 'SAFE';
  
  // Confidence: based on data volume + variability
  const cv = forecastDailyDemand > 0 ? demandStd / forecastDailyDemand : 1;
  const dataPoints = series.filter(s => s.qty > 0).length;
  const confidence = Math.min(0.95, Math.max(0.4, 0.7 - cv * 0.2 + (dataPoints / 100) * 0.2));
  
  // Reasoning
  const reasoningSummary = buildReasoningSummary({
    productName: product.name,
    availableStock,
    leadTimeDemand,
    safetyStock,
    festivalBuffer,
    festivalEffect,
    onOrderStock,
    grossReorderNeed,
    moq,
    recommendedQty,
    leadTimeDays,
    forecastDailyDemand,
    festivalName,
  });
  
  return {
    productId,
    sku: product.sku,
    productName: product.name,
    storeId,
    supplierId,
    supplierName,
    currentStock: onHandQty,
    availableStock,
    forecastDemand7d: round(forecastDemand7d, 1),
    forecastDailyDemand: round(forecastDailyDemand, 1),
    leadTimeDays,
    leadTimeDemand: round(leadTimeDemand, 1),
    safetyStock: round(safetyStock, 1),
    moq,
    festivalBuffer,
    festivalEffect,
    onOrderStock,
    grossReorderNeed: round(grossReorderNeed, 1),
    recommendedQty,
    packSize,
    unitCost,
    estimatedCost: round(estimatedCost, 2),
    riskLevel,
    confidence: round(confidence, 2),
    limitingConstraint,
    reasoningSummary,
  };
}

function buildReasoningSummary(d: {
  productName: string;
  availableStock: number;
  leadTimeDemand: number;
  safetyStock: number;
  festivalBuffer: number;
  festivalEffect?: string;
  onOrderStock: number;
  grossReorderNeed: number;
  moq: number;
  recommendedQty: number;
  leadTimeDays: number;
  forecastDailyDemand: number;
  festivalName?: string;
}): string {
  const parts: string[] = [];
  parts.push(`Current available stock of ${d.productName} is ${d.availableStock.toFixed(0)} units.`);
  parts.push(`Lead-time demand over ${d.leadTimeDays} days is ${d.leadTimeDemand.toFixed(1)} units, with safety stock of ${d.safetyStock.toFixed(1)}.`);
  if (d.festivalBuffer > 0) {
    parts.push(`Festival ${d.festivalName} adds ${d.festivalBuffer} units buffer (${d.festivalEffect}).`);
  }
  if (d.onOrderStock > 0) {
    parts.push(`${d.onOrderStock} units are already on order.`);
  }
  if (d.grossReorderNeed <= 0) {
    parts.push(`Gross reorder need is ${d.grossReorderNeed.toFixed(1)} — no order required.`);
  } else {
    parts.push(`Gross reorder need is ${d.grossReorderNeed.toFixed(1)} units.`);
    if (d.recommendedQty === d.moq && d.grossReorderNeed < d.moq) {
      parts.push(`Rounded up to MOQ of ${d.moq} units.`);
    } else {
      parts.push(`Recommended order quantity: ${d.recommendedQty} units.`);
    }
  }
  return parts.join(' ');
}

// ============================================================
// SUPPLIER CONSTRAINTS
// ============================================================

export async function getSupplierConstraints(supplierId: string) {
  const supplier = await db.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw new Error('Supplier not found');
  return {
    supplierId: supplier.id,
    supplierName: supplier.name,
    leadTimeDays: supplier.leadTimeDays,
    minOrderQty: supplier.minOrderQty,
    paymentTerms: supplier.paymentTerms,
    reliabilityScore: supplier.reliabilityScore,
    gstin: supplier.gstin,
  };
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
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function round(n: number, decimals: number = 2): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
