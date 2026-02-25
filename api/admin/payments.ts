import { z } from "zod";
import { PAGINATION } from "@reelforge/shared";
import { requireAdminFromRequest } from "../lib/auth";
import { assertMethod, jsonOk, readQuery, withApi } from "../lib/http";
import { prisma } from "../lib/prisma";
import { serializePayment } from "../lib/serializers";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
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
  };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payment.count({ where }),
  ]);

  jsonOk(res, {
    page: query.page,
    pageSize,
    total,
    items: items.map(serializePayment),
  });
});