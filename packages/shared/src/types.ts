export type Role = "user" | "admin";

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  name: string | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type GenerationType = "image" | "video";
export type GenerationStatus = "queued" | "processing" | "succeeded" | "failed";

export type GenerationRecord = {
  id: string;
  type: GenerationType;
  prompt: string;
  optionsJson: Record<string, unknown> | null;
  status: GenerationStatus;
  costCredits: number;
  assetUrl: string | null;
  thumbUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
};