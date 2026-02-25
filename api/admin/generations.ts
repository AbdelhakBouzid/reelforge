import { z } from "zod";
import { PAGINATION, generationStatusSchema, generationTypeSchema } from "@reelforge/shared";
import { requireAdminFromRequest } from "../lib/auth";
import { assertMethod, jsonOk, readQuery, withApi } from "../lib/http";
import { prisma } from "../lib/prisma";
import { serializeGeneration, wireGenerationStatusToDb, wireGenerationTypeToDb } from "../lib/serializers";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  type: generationTypeSchema.optional(),
  status: generationStatusSchema.optional(),
  userId: z.string().optional(),
});

type QueryInput = z.infer<typeof querySchema>;

export default withApi(async (req, res) => {
  assertMethod(req, "GET");
  await requireAdminFromRequest(req);

  const query = readQuery<QueryInput>(req.query, querySchema);
  const pageSize = PAGINATION.adminPageSize;

  const where = {
    userId: query.userId,
    type: query.type ? wireGenerationTypeToDb(query.type) : undefined,
    status: query.status ? wireGenerationStatusToDb(query.status) : undefined,
  };

  const [items, total] = await Promise.all([
    prisma.generation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.generation.count({ where }),
  ]);

  jsonOk(res, {
    page: query.page,
    pageSize,
    total,
    items: items.map(serializeGeneration),
  });
});