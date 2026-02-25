import crypto from "node:crypto";
import type { AIProvider } from "./aiProvider";

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function seededImage(seed: string, width: number, height: number) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}

export class MockProvider implements AIProvider {
  async generateImage(prompt: string, _options: Record<string, unknown>) {
    await sleep(1200);

    const seed = `${prompt.slice(0, 30)}-${Date.now()}`;

    return {
      assetUrl: seededImage(seed, 1024, 1024),
      thumbnailUrl: seededImage(seed, 480, 480),
      providerJobId: `mock-img-${crypto.randomUUID()}`,
    };
  }

  async generateVideo(prompt: string, _options: Record<string, unknown>) {
    await sleep(2000);

    const seed = `${prompt.slice(0, 30)}-${Date.now()}`;

    return {
      assetUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      thumbnailUrl: seededImage(seed, 640, 360),
      providerJobId: `mock-vid-${crypto.randomUUID()}`,
    };
  }
}