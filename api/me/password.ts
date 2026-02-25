import bcrypt from "bcryptjs";
import { z } from "zod";
import { accountPasswordSchema } from "@reelforge/shared";
import { AppError } from "../lib/errors";
import { requireUserFromRequest } from "../lib/auth";
import { assertMethod, jsonOk, readJsonBody, withApi } from "../lib/http";
import { prisma } from "../lib/prisma";

type PasswordInput = z.infer<typeof accountPasswordSchema>;

export default withApi(async (req, res) => {
  assertMethod(req, "PATCH");

  const user = await requireUserFromRequest(req);
  const body = await readJsonBody<PasswordInput>(req, accountPasswordSchema);

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!existing) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found.");
  }

  const isCurrentPasswordValid = await bcrypt.compare(body.currentPassword, existing.passwordHash);

  if (!isCurrentPasswordValid) {
    throw new AppError(400, "INVALID_PASSWORD", "Current password is incorrect.");
  }

  const newHash = await bcrypt.hash(body.newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
    },
  });

  jsonOk(res, {
    success: true,
    message: "Password updated successfully.",
  });
});