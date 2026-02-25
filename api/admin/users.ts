import { z } from "zod";
import { PAGINATION } from "@reelforge/shared";
import { requireAdminFromRequest } from "../lib/auth";
import { assertMethod, jsonOk, readQuery, withApi } from "../lib/http";
import { prisma } from "../lib/prisma";
import { serializeUser } from "../lib/serializers";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  search: z.string().optional(),
});

type QueryInput = z.infer<typeof querySchema>;

export default withApi(async (req, res) => {
  assertMethod(req, "GET");
  await requireAdminFromRequest(req);

  const query = readQuery<QueryInput>(req.query, querySchema);
  const page = query.page;
  const pageSize = PAGINATION.adminPageSize;

  const where = {
    email: query.search
      ? {
          contains: query.search,
          mode: "insensitive" as const,
        }
      : undefined,
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  const userIds = users.map((user) => user.id);
  const creditSums = userIds.length
    ? await prisma.creditsLedger.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds } },
        _sum: { delta: true },
      })
    : [];

  const balanceMap = new Map(creditSums.map((entry) => [entry.userId, entry._sum.delta ?? 0]));

  jsonOk(res, {
    page,
    pageSize,
    total,
    items: users.map((user) => ({
      ...serializeUser(user),
      credits: balanceMap.get(user.id) ?? 0,
    })),
  });
});