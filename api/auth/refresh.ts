import { refreshSchema, type RefreshInput } from "@reelforge/shared";
import { AppError } from "../lib/errors";
import { rotateRefreshToken, verifyAccessToken } from "../lib/auth";
import { assertMethod, jsonOk, readJsonBody, withApi } from "../lib/http";
import { enforceRateLimit } from "../lib/rateLimit";
import { prisma } from "../lib/prisma";
import { serializeUser } from "../lib/serializers";

export default withApi(async (req, res) => {
  assertMethod(req, "POST");
  enforceRateLimit(req, "auth-refresh", { windowMs: 10 * 60 * 1000, max: 60 });

  const body = await readJsonBody<RefreshInput>(req, refreshSchema);
  const tokens = await rotateRefreshToken(body.refreshToken);

  const payload = verifyAccessToken(tokens.accessToken);

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "User account not found.");
  }

  jsonOk(res, {
    user: serializeUser(user),
    tokens,
  });
});