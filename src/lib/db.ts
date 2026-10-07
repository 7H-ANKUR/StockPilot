import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

function getDatabaseUrl(): string | undefined {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && !envUrl.startsWith('file:')) {
    return envUrl;
  }

  // Look for custom.db in known locations
  const searchDirs = [
    path.join(process.cwd(), 'db'),
    path.join(process.cwd(), 'StockPilot', 'db'),
    process.cwd(),
    path.join(process.cwd(), 'StockPilot'),
  ];

  for (const dir of searchDirs) {
    const candidate = path.join(dir, 'custom.db');
    if (fs.existsSync(candidate)) {
      return `file:${path.resolve(candidate)}`;
    }
  }

  return envUrl;
}

const resolvedDbUrl = getDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: resolvedDbUrl
      ? {
          db: {
            url: resolvedDbUrl,
          },
        }
      : undefined,
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;