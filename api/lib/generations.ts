import { CREDIT_COSTS } from "@reelforge/shared";
import { GenerationStatus, LedgerReason, RefType, type GenerationType, type Prisma } from "@prisma/client";
import { AppError } from "./errors";
import { prisma } from "./prisma";
import { getAIProvider } from "../providers/aiProvider";

type StartGenerationInput = {
  userId: string;
  type: GenerationType;
  prompt: string;
  options: Record<string, unknown>;
};

export async function startGeneration(input: StartGenerationInput) {
  const provider = getAIProvider();
  const cost = input.type === "VIDEO" ? CREDIT_COSTS.video : CREDIT_COSTS.image;

  const generation = await prisma.$transaction(async (tx) => {
    const creditAggregate = await tx.creditsLedger.aggregate({
      where: { userId: input.userId },
      _sum: { delta: true },
    });

    const balance = creditAggregate._sum.delta ?? 0;

    if (balance < cost) {
      throw new AppError(402, "INSUFFICIENT_CREDITS", "Not enough credits for this generation.", {
        required: cost,
        balance,
      });
    }

    const created = await tx.generation.create({
      data: {
        userId: input.userId,
        type: input.type,
        prompt: input.prompt,
        optionsJson: input.options as Prisma.InputJsonValue,
        status: GenerationStatus.QUEUED,
        costCredits: cost,
      },
    });

    await tx.creditsLedger.create({
      data: {
        userId: input.userId,
        delta: -cost,
        reason: LedgerReason.GENERATION_DEBIT,
        refType: RefType.GENERATION,
        refId: created.id,
      },
    });

    return created;
  });

  await prisma.generation.update({
    where: { id: generation.id },
    data: { status: GenerationStatus.PROCESSING },
  });

  try {
    const result =
      input.type === "VIDEO"
        ? await provider.generateVideo(input.prompt, input.options)
        : await provider.generateImage(input.prompt, input.options);

    return prisma.generation.update({
      where: { id: generation.id },
      data: {
        status: GenerationStatus.SUCCEEDED,
        assetUrl: result.assetUrl,
        thumbUrl: result.thumbnailUrl,
        providerJobId: result.providerJobId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";

    await prisma.$transaction(async (tx) => {
      await tx.generation.update({
        where: { id: generation.id },
        data: {
          status: GenerationStatus.FAILED,
          errorMessage: message,
        },
      });

      await tx.creditsLedger.create({
        data: {
          userId: input.userId,
          delta: cost,
          reason: LedgerReason.GENERATION_REFUND,
          refType: RefType.GENERATION,
          refId: generation.id,
        },
      });
    });

    return prisma.generation.findUniqueOrThrow({
      where: { id: generation.id },
    });
  }
}