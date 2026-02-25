import { refreshSchema, type RefreshInput } from "@reelforge/shared";
import { revokeRefreshToken } from "../lib/auth";
import { assertMethod, jsonOk, readJsonBody, withApi } from "../lib/http";
import { enforceRateLimit } from "../lib/rateLimit";

export default withApi(async (req, res) => {
  assertMethod(req, "POST");
  enforceRateLimit(req, "auth-logout", { windowMs: 10 * 60 * 1000, max: 40 });

  const body = await readJsonBody<RefreshInput>(req, refreshSchema);
  await revokeRefreshToken(body.refreshToken);

  jsonOk(res, { success: true });
});