import { AppError } from "../lib/errors";
import { requireUserFromRequest } from "../lib/auth";
import { assertMethod, jsonOk, withApi } from "../lib/http";
import { prisma } from "../lib/prisma";
import { serializeGeneration } from "../lib/serializers";

export default withApi(async (req, res) => {
  assertMethod(req, "GET");

  const user = await requireUserFromRequest(req);
  const generationId = req.query.id?.toString();

  if (!generationId) {
    throw new AppError(400, "BAD_REQUEST", "Generation id is required.");
  }

  const generation = await prisma.generation.findUnique({ where: { id: generationId } });

  if (!generation) {
    throw new AppError(404, "NOT_FOUND", "Generation not found.");
  }

  if (generation.userId !== user.id && user.role !== "admin") {
    throw new AppError(403, "FORBIDDEN", "You cannot access this generation.");
  }

  jsonOk(res, {
    generation: serializeGeneration(generation),
  });
});