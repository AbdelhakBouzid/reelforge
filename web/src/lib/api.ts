import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./storage";

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export class RequestError extends Error {
  status: number;
  payload?: ApiError;

  constructor(status: number, message: string, payload?: ApiError) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

const API_BASE = import.meta.env.VITE_API_URL || "/api";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
};

async function requestRaw(path: string, options: RequestOptions = {}) {
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (options.auth) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorPayload = payload?.error as ApiError | undefined;
    throw new RequestError(
      response.status,
      errorPayload?.message || `Request failed with status ${response.status}`,
      errorPayload,
    );
  }

  return payload as T;
}

let refreshPromise: Promise<void> | null = null;

async function refreshTokens() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new RequestError(401, "Session expired");
  }

  const response = await requestRaw("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });

  const payload = await parseResponse<{
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  }>(response);

  setTokens(payload.tokens.accessToken, payload.tokens.refreshToken);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const shouldRetry = options.retryOnUnauthorized ?? true;

  try {
    const response = await requestRaw(path, options);

    if (response.status === 401 && options.auth && shouldRetry) {
      if (!refreshPromise) {
        refreshPromise = refreshTokens().finally(() => {
          refreshPromise = null;
        });
      }

      await refreshPromise;

      const retryResponse = await requestRaw(path, {
        ...options,
        retryOnUnauthorized: false,
      });

      return parseResponse<T>(retryResponse);
    }

    return parseResponse<T>(response);
  } catch (error) {
    if (error instanceof RequestError && error.status === 401) {
      clearTokens();
    }
    throw error;
  }
}

export { clearTokens, getAccessToken, getRefreshToken, setTokens };