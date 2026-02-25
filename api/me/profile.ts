import { z } from "zod";
import { accountProfileSchema } from "@reelforge/shared";
import { requireUserFromRequest } from "../lib/auth";
import { assertMethod, jsonOk, readJsonBody, withApi } from "../lib/http";
import { prisma } from "../lib/prisma";
import { serializeUser } from "../lib/serializers";

type ProfileInput = z.infer<typeof accountProfileSchema>;

export default withApi(async (req, res) => {
  assertMethod(req, "PATCH");

  const user = await requireUserFromRequest(req);
  const body = await readJsonBody<ProfileInput>(req, accountProfileSchema);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: body.name.trim(),
    },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      createdAt: true,
    },
  });

  jsonOk(res, { user: serializeUser(updated) });
});