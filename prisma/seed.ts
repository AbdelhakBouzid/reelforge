import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const defaultPlans = [
  { name: "Starter", monthlyCredits: 120 },
  { name: "Pro", monthlyCredits: 500 },
  { name: "Scale", monthlyCredits: 2000 },
] as const;

const defaultPacks = [
  { name: "Boost 50", credits: 50, price: 900 },
  { name: "Boost 250", credits: 250, price: 3900 },
  { name: "Boost 1000", credits: 1000, price: 12900 },
] as const;

const planPriceEnvByName: Record<string, string | undefined> = {
  Starter: process.env.PAYPAL_PLAN_ID_STARTER || process.env.STRIPE_PRICE_PLAN_STARTER,
  Pro: process.env.PAYPAL_PLAN_ID_PRO || process.env.STRIPE_PRICE_PLAN_PRO,
  Scale: process.env.PAYPAL_PLAN_ID_SCALE || process.env.STRIPE_PRICE_PLAN_SCALE,
};

const packPriceEnvByName: Record<string, string | undefined> = {
  "Boost 50": process.env.PAYPAL_PACK_ID_50 || process.env.STRIPE_PRICE_PACK_50,
  "Boost 250": process.env.PAYPAL_PACK_ID_250 || process.env.STRIPE_PRICE_PACK_250,
  "Boost 1000": process.env.PAYPAL_PACK_ID_1000 || process.env.STRIPE_PRICE_PACK_1000,
};

async function seedPlansAndPacks() {
  for (const plan of defaultPlans) {
    const envStripePriceId = planPriceEnvByName[plan.name];

    await prisma.plan.upsert({
      where: { name: plan.name },
      update: {
        monthlyCredits: plan.monthlyCredits,
        isActive: true,
        stripePriceId: envStripePriceId || undefined,
      },
      create: {
        name: plan.name,
        monthlyCredits: plan.monthlyCredits,
        stripePriceId: envStripePriceId,
      },
    });
  }

  for (const pack of defaultPacks) {
    const envStripePriceId = packPriceEnvByName[pack.name];

    await prisma.creditPack.upsert({
      where: { name: pack.name },
      update: {
        credits: pack.credits,
        price: pack.price,
        isActive: true,
        stripePriceId: envStripePriceId || undefined,
      },
      create: {
        name: pack.name,
        credits: pack.credits,
        price: pack.price,
        stripePriceId: envStripePriceId,
      },
    });
  }
}

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.warn("ADMIN_EMAIL or ADMIN_PASSWORD missing, admin seed skipped.");
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {
      passwordHash,
      role: Role.ADMIN,
      name: "ReelForge Admin",
    },
    create: {
      email: adminEmail.toLowerCase(),
      passwordHash,
      role: Role.ADMIN,
      name: "ReelForge Admin",
    },
  });
}

async function main() {
  await seedPlansAndPacks();
  await seedAdmin();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed completed.");
  })
  .catch(async (error) => {
    console.error("Seed failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
