import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser, ROLE_PERMISSIONS } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const authUser = getRequestUser(req);
    
    // Fetch live user status from DB
    const dbUser = await db.user.findUnique({
      where: { id: authUser.id },
      include: { tenant: true },
    });

    if (!dbUser) {
      return NextResponse.json({
        user: {
          ...authUser,
          permissions: ROLE_PERMISSIONS[authUser.role] || [],
        },
      });
    }

    return NextResponse.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        tenantId: dbUser.tenantId,
        isActive: dbUser.isActive,
        tenantName: dbUser.tenant.name,
        permissions: ROLE_PERMISSIONS[dbUser.role as keyof typeof ROLE_PERMISSIONS] || [],
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
