import { generationRequestSchema, type GenerationRequestInput } from "@reelforge/shared";
import { GenerationType } from "@prisma/client";
import { requireUserFromRequest } from "../lib/auth";
import { startGeneration } from "../lib/generations";
import { assertMethod, jsonOk, readJsonBody, withApi } from "../lib/http";
import { serializeGeneration } from "../lib/serializers";

export default withApi(async (req, res) => {
  assertMethod(req, "POST");

  const user = await requireUserFromRequest(req);
  const body = await readJsonBody<GenerationRequestInput>(req, generationRequestSchema);

  const generation = await startGeneration({
    userId: user.id,
    type: GenerationType.VIDEO,
    prompt: body.prompt,
    options: body.options ?? {},
  });

  jsonOk(res, { generation: serializeGeneration(generation) }, 201);
});