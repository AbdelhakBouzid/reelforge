export type User = {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "admin";
};

export type Plan = {
  id: string;
  name: string;
  stripePriceId: string | null;
  monthlyCredits: number;
  isActive: boolean;
  createdAt: string;
};

export type CreditPack = {
  id: string;
  name: string;
  credits: number;
  price: number;
  stripePriceId: string | null;
  isActive: boolean;
  createdAt: string;
};

export type CatalogResponse = {
  plans: Plan[];
  packs: CreditPack[];
};

export type Generation = {
  id: string;
  userId: string;
  type: "image" | "video";
  prompt: string;
  optionsJson: Record<string, unknown> | null;
  status: "queued" | "processing" | "succeeded" | "failed";
  costCredits: number;
  assetUrl: string | null;
  thumbUrl: string | null;
  providerJobId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GenerationListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: Generation[];
};

export type Payment = {
  id: string;
  userId: string;
  stripePaymentIntentId: string | null;
  stripeCheckoutSessionId: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
};