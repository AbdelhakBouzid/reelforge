import { requireAdminFromRequest } from "../lib/auth";
import { assertMethod, jsonOk, withApi } from "../lib/http";
import { prisma } from "../lib/prisma";
import { serializePlan } from "../lib/serializers";

export default withApi(async (req, res) => {
  assertMethod(req, "GET");
  await requireAdminFromRequest(req);

  const plans = await prisma.plan.findMany({
    orderBy: { monthlyCredits: "asc" },
  });

  jsonOk(res, {
    items: plans.map(serializePlan),
  });
});