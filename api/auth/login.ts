import bcrypt from "bcryptjs";
import { loginSchema, type LoginInput } from "@reelforge/shared";
import { AppError } from "../lib/errors";
import { assertMethod, jsonOk, readJsonBody, withApi } from "../lib/http";
import { enforceRateLimit } from "../lib/rateLimit";
import { issueAuthTokens } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { serializeUser } from "../lib/serializers";

export default withApi(async (req, res) => {
  assertMethod(req, "POST");
  enforceRateLimit(req, "auth-login", { windowMs: 15 * 60 * 1000, max: 25 });

  const body = await readJsonBody<LoginInput>(req, loginSchema);
  const email = body.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const validPassword = await bcrypt.compare(body.password, user.passwordHash);

  if (!validPassword) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const tokens = await issueAuthTokens({ id: user.id, email: user.email, role: user.role });

  jsonOk(res, {
    user: serializeUser(user),
    tokens,
  });
});