import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ZodTypeAny } from "zod";
import { applyCors } from "./cors";
import { AppError, handleApiError } from "./errors";

export type ApiHandler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

export function withApi(handler: ApiHandler): ApiHandler {
  return async (req, res) => {
    applyCors(req, res);

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    try {
      await handler(req, res);
    } catch (error) {
      handleApiError(error, res);
    }
  };
}

export function assertMethod(req: VercelRequest, ...methods: string[]) {
  if (!req.method || !methods.includes(req.method)) {
    throw new AppError(405, "METHOD_NOT_ALLOWED", `Expected one of: ${methods.join(", ")}`);
  }
}

export async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const maybeBody = req.body;

  if (Buffer.isBuffer(maybeBody)) {
    return maybeBody;
  }

  if (typeof maybeBody === "string") {
    return Buffer.from(maybeBody);
  }

  if (maybeBody && typeof maybeBody === "object" && Object.keys(maybeBody).length > 0) {
    return Buffer.from(JSON.stringify(maybeBody));
  }

  const chunks: Uint8Array[] = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}

export async function readJsonBody<T>(req: VercelRequest, schema: ZodTypeAny): Promise<T> {
  let parsedValue: unknown;

  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    parsedValue = req.body;
  } else {
    const raw = await readRawBody(req);
    const rawString = raw.toString("utf-8");
    parsedValue = rawString.length > 0 ? JSON.parse(rawString) : {};
  }

  const parsed = schema.safeParse(parsedValue);

  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid request payload.", parsed.error.flatten());
  }

  return parsed.data as T;
}

export function readQuery<T>(query: unknown, schema: ZodTypeAny): T {
  const parsed = schema.safeParse(query);

  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid query params.", parsed.error.flatten());
  }

  return parsed.data as T;
}

export function jsonOk<T>(res: VercelResponse, data: T, status = 200) {
  return res.status(status).json(data);
}