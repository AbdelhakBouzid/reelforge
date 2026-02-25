import { requireAdminFromRequest } from "../lib/auth";
import { assertMethod, jsonOk, withApi } from "../lib/http";
import { prisma } from "../lib/prisma";
import { serializePack } from "../lib/serializers";

export default withApi(async (req, res) => {
  assertMethod(req, "GET");
  await requireAdminFromRequest(req);

  const packs = await prisma.creditPack.findMany({
    orderBy: { credits: "asc" },
  });

  jsonOk(res, {
    items: packs.map(serializePack),
  });
});