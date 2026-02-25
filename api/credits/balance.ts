import { getCreditBalance } from "../lib/credits";
import { requireUserFromRequest } from "../lib/auth";
import { assertMethod, jsonOk, withApi } from "../lib/http";

export default withApi(async (req, res) => {
  assertMethod(req, "GET");

  const user = await requireUserFromRequest(req);
  const balance = await getCreditBalance(user.id);

  jsonOk(res, {
    balance,
  });
});