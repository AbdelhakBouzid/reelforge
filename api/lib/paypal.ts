import type { IncomingHttpHeaders } from "node:http";
import { AppError } from "./errors";
import { env, paypalEnabled } from "./env";

type PayPalLink = {
  href: string;
  rel: string;
  method?: string;
};

type PayPalSubscriptionResponse = {
  id: string;
  status: string;
  plan_id?: string;
  custom_id?: string;
  start_time?: string;
  billing_info?: {
    next_billing_time?: string;
  };
  subscriber?: {
    payer_id?: string;
  };
  links?: PayPalLink[];
};

type PayPalOrderResponse = {
  id: string;
  status: string;
  links?: PayPalLink[];
  purchase_units?: Array<{
    custom_id?: string;
    amount?: {
      currency_code?: string;
      value?: string;
    };
  }>;
  payer?: {
    payer_id?: string;
  };
};

let accessTokenCache: { token: string; expiresAt: number } | null = null;

function getBaseUrl() {
  return env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

function resolveRelUrl(links: PayPalLink[] | undefined, rel: string) {
  const link = links?.find((item) => item.rel === rel);
  return link?.href ?? null;
}

function toUrlWithParams(rawUrl: string, params: Record<string, string>) {
  const url = new URL(rawUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function readHeader(headers: IncomingHttpHeaders, key: string) {
  const value = headers[key.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value ?? "";
}

async function getAccessToken() {
  const now = Date.now();
  if (accessTokenCache && accessTokenCache.expiresAt > now + 10_000) {
    return accessTokenCache.token;
  }

  const auth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString("base64");

  const response = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const payload = (await response.json()) as { access_token?: string; expires_in?: number; error_description?: string };

  if (!response.ok || !payload.access_token) {
    throw new AppError(502, "PAYPAL_AUTH_FAILED", payload.error_description || "Unable to authenticate with PayPal.");
  }

  accessTokenCache = {
    token: payload.access_token,
    expiresAt: now + (payload.expires_in ?? 300) * 1000,
  };

  return payload.access_token;
}

export async function paypalRequest<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    const message =
      (payload?.message as string | undefined) ||
      (payload?.error_description as string | undefined) ||
      `PayPal API request failed: ${response.status}`;
    throw new AppError(502, "PAYPAL_API_ERROR", message, payload ?? undefined);
  }

  return payload as T;
}

export function assertPayPalConfigured() {
  if (!paypalEnabled) {
    throw new AppError(
      503,
      "PAYPAL_NOT_CONFIGURED",
      "PayPal is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.",
    );
  }
}

export async function createPayPalSubscription(params: { planId: string; userId: string; localPlanId: string }) {
  const payload = await paypalRequest<PayPalSubscriptionResponse>("/v1/billing/subscriptions", {
    method: "POST",
    body: {
      plan_id: params.planId,
      custom_id: `${params.userId}:${params.localPlanId}`,
      application_context: {
        return_url: toUrlWithParams(env.PAYPAL_RETURN_URL, { kind: "subscription" }),
        cancel_url: toUrlWithParams(env.PAYPAL_CANCEL_URL, { kind: "subscription" }),
        user_action: "SUBSCRIBE_NOW",
      },
    },
  });

  const approveUrl = resolveRelUrl(payload.links, "approve");
  if (!approveUrl) {
    throw new AppError(502, "PAYPAL_API_ERROR", "PayPal did not return an approval URL for subscription.");
  }

  return {
    id: payload.id,
    status: payload.status,
    approveUrl,
  };
}

export async function createPayPalOrder(params: { userId: string; packId: string; packName: string; amountCents: number }) {
  const amountValue = (params.amountCents / 100).toFixed(2);

  const payload = await paypalRequest<PayPalOrderResponse>("/v2/checkout/orders", {
    method: "POST",
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: `${params.userId}:${params.packId}`,
          description: `ReelForge Credit Pack: ${params.packName}`,
          amount: {
            currency_code: "USD",
            value: amountValue,
          },
        },
      ],
      application_context: {
        return_url: toUrlWithParams(env.PAYPAL_RETURN_URL, { kind: "pack" }),
        cancel_url: toUrlWithParams(env.PAYPAL_CANCEL_URL, { kind: "pack" }),
        user_action: "PAY_NOW",
      },
    },
  });

  const approveUrl = resolveRelUrl(payload.links, "approve");
  if (!approveUrl) {
    throw new AppError(502, "PAYPAL_API_ERROR", "PayPal did not return an approval URL for order.");
  }

  return {
    id: payload.id,
    status: payload.status,
    approveUrl,
  };
}

export async function getPayPalOrder(orderId: string) {
  return paypalRequest<PayPalOrderResponse>(`/v2/checkout/orders/${orderId}`);
}

export async function capturePayPalOrder(orderId: string) {
  return paypalRequest<PayPalOrderResponse>(`/v2/checkout/orders/${orderId}/capture`, { method: "POST", body: {} });
}

export async function getPayPalSubscription(subscriptionId: string) {
  return paypalRequest<PayPalSubscriptionResponse>(`/v1/billing/subscriptions/${subscriptionId}`);
}

export async function verifyPayPalWebhook(headers: IncomingHttpHeaders, event: Record<string, unknown>) {
  if (!env.PAYPAL_WEBHOOK_ID) {
    throw new AppError(503, "PAYPAL_WEBHOOK_NOT_CONFIGURED", "PAYPAL_WEBHOOK_ID is missing.");
  }

  const verification = await paypalRequest<{ verification_status?: string }>(
    "/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      body: {
        transmission_id: readHeader(headers, "paypal-transmission-id"),
        transmission_time: readHeader(headers, "paypal-transmission-time"),
        cert_url: readHeader(headers, "paypal-cert-url"),
        auth_algo: readHeader(headers, "paypal-auth-algo"),
        transmission_sig: readHeader(headers, "paypal-transmission-sig"),
        webhook_id: env.PAYPAL_WEBHOOK_ID,
        webhook_event: event,
      },
    },
  );

  return verification.verification_status === "SUCCESS";
}

export function parseSubscriptionCustomId(customId: string | undefined | null) {
  if (!customId) return null;
  const [userId, planId] = customId.split(":");
  if (!userId || !planId) return null;
  return { userId, planId };
}

export function parseOrderCustomId(customId: string | undefined | null) {
  if (!customId) return null;
  const [userId, packId] = customId.split(":");
  if (!userId || !packId) return null;
  return { userId, packId };
}

export function amountToCents(value: string | undefined | null) {
  const amount = Number(value ?? "0");
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

