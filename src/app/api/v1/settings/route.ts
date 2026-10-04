import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequestUser, requirePermission } from '@/lib/auth';
import { z } from 'zod';

const SettingsSchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  code: z.string().min(2, 'Company code is required'),
  gstin: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable(),
  currency: z.string().default('INR'),
  operationalSettings: z.object({
    reorderThresholdDays: z.number().min(1).max(90).default(7),
    safetyStockMultiplier: z.number().min(1).max(3).default(1.5),
    festivalBufferPct: z.number().min(0).max(100).default(25),
    autoApproveLowValuePO: z.boolean().default(false),
    autoApproveLimit: z.number().min(0).default(10000),
    offlineSyncEnabled: z.boolean().default(true),
    notifications: z.object({
      stockoutAlerts: z.boolean().default(true),
      poStatusAlerts: z.boolean().default(true),
      soundEnabled: z.boolean().default(true),
      dailyDigest: z.boolean().default(false),
    }),
  }),
});

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      include: {
        stores: { select: { id: true, name: true, code: true, city: true } },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    let parsedSettings = {
      reorderThresholdDays: 7,
      safetyStockMultiplier: 1.5,
      festivalBufferPct: 25,
      autoApproveLowValuePO: false,
      autoApproveLimit: 10000,
      offlineSyncEnabled: true,
      notifications: {
        stockoutAlerts: true,
        poStatusAlerts: true,
        soundEnabled: true,
        dailyDigest: false,
      },
    };

    if (tenant.settingsJson) {
      try {
        parsedSettings = { ...parsedSettings, ...JSON.parse(tenant.settingsJson) };
      } catch {
        // fallback to defaults
      }
    }

    return NextResponse.json({
      settings: {
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
        gstin: tenant.gstin,
        address: tenant.address,
        phone: tenant.phone,
        email: tenant.email,
        currency: tenant.currency || 'INR',
        stores: tenant.stores,
        operationalSettings: parsedSettings,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const permCheck = requirePermission(req, 'EDIT_SETTINGS');
  if (!permCheck.authorized) {
    return permCheck.response;
  }

  try {
    const body = await req.json();
    const validated = SettingsSchema.parse(body);
    const user = permCheck.user;

    const updated = await db.tenant.update({
      where: { id: user.tenantId },
      data: {
        name: validated.name,
        code: validated.code,
        gstin: validated.gstin,
        address: validated.address,
        phone: validated.phone,
        email: validated.email,
        currency: validated.currency,
        settingsJson: JSON.stringify(validated.operationalSettings),
      },
    });

    // Record audit event
    await db.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'UPDATE_SETTINGS',
        resourceType: 'TENANT',
        resourceId: updated.id,
        reason: 'Tenant settings updated by administrator',
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      settings: {
        ...updated,
        operationalSettings: validated.operationalSettings,
      },
    });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message || 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
