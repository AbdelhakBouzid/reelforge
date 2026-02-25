import type { Prisma, PrismaClient } from "@prisma/client";
import { LedgerReason, RefType } from "@prisma/client";
import { AppError } from "./errors";
import { prisma } from "./prisma";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function getCreditBalance(userId: string, db: DbClient = prisma) {
  const aggregate = await db.creditsLedger.aggregate({
    where: { userId },
    _sum: { delta: true },
  });

  return aggregate._sum.delta ?? 0;
}

export async function addCreditEntry(
  data: {
    userId: string;
    delta: number;
    reason: LedgerReason;
    refType?: RefType;
    refId?: string;
  },
  db: DbClient = prisma,
) {
  return db.creditsLedger.create({
    data,
  });
}

export async function deductCreditsOrThrow(params: {
  userId: string;
  cost: number;
  reason: LedgerReason;
  refType: RefType;
  refId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const balance = await getCreditBalance(params.userId, tx);

    if (balance < params.cost) {
      throw new AppError(402, "INSUFFICIENT_CREDITS", "Not enough credits for this generation.", {
        required: params.cost,
        balance,
      });
    }

    await addCreditEntry(
      {
        userId: params.userId,
        delta: -params.cost,
        reason: params.reason,
        refType: params.refType,
        refId: params.refId,
      },
      tx,
    );

    return balance - params.cost;
  });
}

export async function refundCredits(params: {
  userId: string;
  amount: number;
  reason: LedgerReason;
  refType: RefType;
  refId: string;
}) {
  await addCreditEntry({
    userId: params.userId,
    delta: params.amount,
    reason: params.reason,
    refType: params.refType,
    refId: params.refId,
  });
}