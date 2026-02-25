import { AppError } from "../lib/errors";
import { env } from "../lib/env";
import type { AIProvider, ProviderResult } from "./aiProvider";

type ReplicatePrediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: string | null;
  urls?: {
    get?: string;
  };
};

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseModelPath(modelPath: string, label: string) {
  const [owner, name] = modelPath.split("/");

  if (!owner || !name) {
    throw new AppError(
      500,
      "INVALID_AI_MODEL",
      `${label} must be set as "owner/model" (example: black-forest-labs/flux-schnell).`,
    );
  }

  return { owner, name };
}

function pickOutputUrl(output: unknown): string | null {
  if (typeof output === "string") {
    return output;
  }

  if (Array.isArray(output)) {
    const firstUrl = output.find((item) => typeof item === "string");
    return typeof firstUrl === "string" ? firstUrl : null;
  }

  if (output && typeof output === "object") {
    const maybeUrl = (output as Record<string, unknown>).url;
    if (typeof maybeUrl === "string") {
      return maybeUrl;
    }
  }

  return null;
}

export class ReplicateProvider implements AIProvider {
  private readonly apiToken: string;

  private readonly imageModelPath: string;

  private readonly videoModelPath: string;

  constructor(params: { apiToken: string; imageModelPath: string; videoModelPath: string }) {
    this.apiToken = params.apiToken;
    this.imageModelPath = params.imageModelPath;
    this.videoModelPath = params.videoModelPath;
  }

  async generateImage(prompt: string, options: Record<string, unknown>): Promise<ProviderResult> {
    const prediction = await this.createAndWaitPrediction(this.imageModelPath, {
      prompt,
      aspect_ratio: options.ratio ?? "1:1",
      output_format: "jpg",
      safety_tolerance: 2,
      ...options,
    });

    const assetUrl = pickOutputUrl(prediction.output);
    if (!assetUrl) {
      throw new AppError(502, "AI_EMPTY_OUTPUT", "Image provider returned no output URL.");
    }

    return {
      assetUrl,
      thumbnailUrl: assetUrl,
      providerJobId: prediction.id,
    };
  }

  async generateVideo(prompt: string, options: Record<string, unknown>): Promise<ProviderResult> {
    const prediction = await this.createAndWaitPrediction(this.videoModelPath, {
      prompt,
      aspect_ratio: options.ratio ?? "9:16",
      duration: Number(options.duration ?? 5),
      ...options,
    });

    const assetUrl = pickOutputUrl(prediction.output);
    if (!assetUrl) {
      throw new AppError(502, "AI_EMPTY_OUTPUT", "Video provider returned no output URL.");
    }

    const thumbSeed = encodeURIComponent(prediction.id);

    return {
      assetUrl,
      thumbnailUrl: `https://picsum.photos/seed/${thumbSeed}/640/360`,
      providerJobId: prediction.id,
    };
  }

  private async createAndWaitPrediction(modelPath: string, input: Record<string, unknown>) {
    const { owner, name } = parseModelPath(modelPath, "Replicate model");
    const createUrl = `https://api.replicate.com/v1/models/${owner}/${name}/predictions`;

    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input }),
    });

    const prediction = (await createResponse.json()) as ReplicatePrediction & {
      detail?: string;
    };

    if (!createResponse.ok) {
      throw new AppError(
        502,
        "AI_PROVIDER_ERROR",
        prediction.detail || prediction.error || "Replicate request failed.",
      );
    }

    if (prediction.status === "succeeded") {
      return prediction;
    }

    const getUrl = prediction.urls?.get;
    if (!getUrl) {
      throw new AppError(502, "AI_PROVIDER_ERROR", "Replicate did not return a poll URL.");
    }

    const startedAt = Date.now();
    while (Date.now() - startedAt < env.REPLICATE_TIMEOUT_MS) {
      await sleep(env.REPLICATE_POLL_INTERVAL_MS);

      const pollResponse = await fetch(getUrl, {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
        },
      });

      const polled = (await pollResponse.json()) as ReplicatePrediction & {
        detail?: string;
      };

      if (!pollResponse.ok) {
        throw new AppError(502, "AI_PROVIDER_ERROR", polled.detail || "Replicate polling failed.");
      }

      if (polled.status === "succeeded") {
        return polled;
      }

      if (polled.status === "failed" || polled.status === "canceled") {
        throw new AppError(
          502,
          "AI_PROVIDER_ERROR",
          polled.error || "Replicate generation failed or was canceled.",
        );
      }
    }

    throw new AppError(504, "AI_TIMEOUT", "AI generation timed out.");
  }
}

