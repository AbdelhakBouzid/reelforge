import bcrypt from "bcryptjs";
import { z } from "zod";
import { resetPasswordSchema } from "@reelforge/shared";
import { AppError } from "../lib/errors";
import { assertMethod, jsonOk, readJsonBody, withApi } from "../lib/http";
import { enforceRateLimit } from "../lib/rateLimit";
import { hashToken } from "../lib/auth";
import { prisma } from "../lib/prisma";

type ResetInput = z.infer<typeof resetPasswordSchema>;

export default withApi(async (req, res) => {
  assertMethod(req, "POST");
  enforceRateLimit(req, "auth-reset", { windowMs: 15 * 60 * 1000, max: 15 });

  const body = await readJsonBody<ResetInput>(req, resetPasswordSchema);
  const tokenHash = hashToken(body.token);

  const resetRecord = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!resetRecord) {
    throw new AppError(400, "INVALID_RESET_TOKEN", "Reset token is invalid or expired.");
  }

  const passwordHash = await bcrypt.hash(body.password, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    });

    await tx.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    });

    await tx.refreshToken.updateMany({
      where: { userId: resetRecord.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });

  jsonOk(res, {
    success: true,
    message: "Password reset completed.",
  });
});