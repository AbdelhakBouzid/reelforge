import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __reelforgePrisma: PrismaClient | undefined;
}

export const prisma = global.__reelforgePrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__reelforgePrisma = prisma;
}