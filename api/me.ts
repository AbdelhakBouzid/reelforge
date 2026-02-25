import { getCreditBalance } from "./lib/credits";
import { requireUserFromRequest } from "./lib/auth";
import { assertMethod, jsonOk, withApi } from "./lib/http";
import { prisma } from "./lib/prisma";
import { serializeSubscription } from "./lib/serializers";

export default withApi(async (req, res) => {
  assertMethod(req, "GET");

  const user = await requireUserFromRequest(req);
  const balance = await getCreditBalance(user.id);

  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      userId: user.id,
      status: {
        in: ["ACTIVE", "TRIALING", "PAST_DUE"],
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  jsonOk(res, {
    user,
    credits: balance,
    subscription: activeSubscription ? serializeSubscription(activeSubscription) : null,
  });
});