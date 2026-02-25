import { updatePlanSchema, type UpdatePlanInput } from "@reelforge/shared";
import { AppError } from "../../lib/errors";
import { requireAdminFromRequest } from "../../lib/auth";
import { assertMethod, jsonOk, readJsonBody, withApi } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { serializePlan } from "../../lib/serializers";

export default withApi(async (req, res) => {
  assertMethod(req, "PATCH");
  await requireAdminFromRequest(req);

  const id = req.query.id?.toString();
  if (!id) {
    throw new AppError(400, "BAD_REQUEST", "Plan id is required.");
  }

  const body = await readJsonBody<UpdatePlanInput>(req, updatePlanSchema);

  const updated = await prisma.plan.update({
    where: { id },
    data: {
      name: body.name,
      monthlyCredits: body.monthlyCredits,
      stripePriceId: body.stripePriceId,
      isActive: body.isActive,
    },
  });

  jsonOk(res, {
    plan: serializePlan(updated),
  });
});