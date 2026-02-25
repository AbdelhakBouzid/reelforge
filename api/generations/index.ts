import { PAGINATION, generationListQuerySchema, type GenerationListQueryInput } from "@reelforge/shared";
import { requireUserFromRequest } from "../lib/auth";
import { assertMethod, jsonOk, readQuery, withApi } from "../lib/http";
import { prisma } from "../lib/prisma";
import { serializeGeneration, wireGenerationStatusToDb, wireGenerationTypeToDb } from "../lib/serializers";

export default withApi(async (req, res) => {
  assertMethod(req, "GET");

  const user = await requireUserFromRequest(req);
  const query = readQuery<GenerationListQueryInput>(req.query, generationListQuerySchema);

  const where = {
    userId: user.id,
    type: query.type ? wireGenerationTypeToDb(query.type) : undefined,
    status: query.status ? wireGenerationStatusToDb(query.status) : undefined,
  };

  const page = query.page || PAGINATION.defaultPage;
  const pageSize = PAGINATION.pageSize;

  const [items, total] = await Promise.all([
    prisma.generation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.generation.count({ where }),
  ]);

  jsonOk(res, {
    page,
    pageSize,
    total,
    items: items.map(serializeGeneration),
  });
});