import { MockProvider } from "./mockProvider";

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
    provider = new MockProvider();
  }

  return provider;
}