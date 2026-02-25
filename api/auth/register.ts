import bcrypt from "bcryptjs";
import { registerSchema, type RegisterInput } from "@reelforge/shared";
import { AppError } from "../lib/errors";
import { assertMethod, jsonOk, readJsonBody, withApi } from "../lib/http";
import { enforceRateLimit } from "../lib/rateLimit";
import { issueAuthTokens } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { serializeUser } from "../lib/serializers";

export default withApi(async (req, res) => {
  assertMethod(req, "POST");
  enforceRateLimit(req, "auth-register", { windowMs: 15 * 60 * 1000, max: 15 });

  const body = await readJsonBody<RegisterInput>(req, registerSchema);
  const email = body.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, "EMAIL_EXISTS", "An account with that email already exists.");
  }

  const passwordHash = await bcrypt.hash(body.password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: body.name?.trim() || null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  const tokens = await issueAuthTokens({ id: user.id, email: user.email, role: user.role });

  jsonOk(
    res,
    {
      user: serializeUser(user),
      tokens,
    },
    201,
  );
});