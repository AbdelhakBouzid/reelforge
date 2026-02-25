import { MockProvider } from "./mockProvider";
import { ReplicateProvider } from "./replicateProvider";
import { env } from "../lib/env";
import { AppError } from "../lib/errors";

export type ProviderResult = {
  assetUrl: string;
  thumbnailUrl: string;
  providerJobId: string;
};

export interface AIProvider {
  generateImage(prompt: string, options: Record<string, unknown>): Promise<ProviderResult>;
  generateVideo(prompt: string, options: Record<string, unknown>): Promise<ProviderResult>;
}

let provider: AIProvider | null = null;

export function getAIProvider() {
  if (!provider) {
    if (env.AI_PROVIDER === "replicate") {
      if (!env.REPLICATE_API_TOKEN || !env.REPLICATE_IMAGE_MODEL || !env.REPLICATE_VIDEO_MODEL) {
        throw new AppError(
          503,
          "AI_PROVIDER_NOT_CONFIGURED",
          "REPLICATE_API_TOKEN, REPLICATE_IMAGE_MODEL and REPLICATE_VIDEO_MODEL are required when AI_PROVIDER=replicate.",
        );
      }

      provider = new ReplicateProvider({
        apiToken: env.REPLICATE_API_TOKEN,
        imageModelPath: env.REPLICATE_IMAGE_MODEL,
        videoModelPath: env.REPLICATE_VIDEO_MODEL,
      });
    } else {
      provider = new MockProvider();
    }
  }

  return provider;
}
