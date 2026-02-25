import { updatePackSchema, type UpdatePackInput } from "@reelforge/shared";
import { AppError } from "../../lib/errors";
import { requireAdminFromRequest } from "../../lib/auth";
import { assertMethod, jsonOk, readJsonBody, withApi } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { serializePack } from "../../lib/serializers";

export default withApi(async (req, res) => {
  assertMethod(req, "PATCH");
  await requireAdminFromRequest(req);

  const id = req.query.id?.toString();
  if (!id) {
    throw new AppError(400, "BAD_REQUEST", "Pack id is required.");
  }

  const body = await readJsonBody<UpdatePackInput>(req, updatePackSchema);

  const updated = await prisma.creditPack.update({
    where: { id },
    data: {
      name: body.name,
      credits: body.credits,
      price: body.price,
      stripePriceId: body.stripePriceId,
      isActive: body.isActive,
    },
  });

  jsonOk(res, {
    pack: serializePack(updated),
  });
});