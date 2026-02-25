import { assertMethod, jsonOk, withApi } from "./lib/http";
import { prisma } from "./lib/prisma";
import { serializePack, serializePlan } from "./lib/serializers";
import { env, paypalEnabled } from "./lib/env";

export default withApi(async (req, res) => {
  assertMethod(req, "GET");

  const [plans, packs] = await Promise.all([
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { monthlyCredits: "asc" },
    }),
    prisma.creditPack.findMany({
      where: { isActive: true },
      orderBy: { credits: "asc" },
    }),
  ]);

  jsonOk(res, {
    plans: plans.map(serializePlan),
    packs: packs.map(serializePack),
    paypalEnabled,
    aiProvider: env.AI_PROVIDER,
  });
});
