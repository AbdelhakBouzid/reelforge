import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LoginInput, RegisterInput } from "@reelforge/shared";
import { apiRequest, clearTokens, getAccessToken, getRefreshToken, setTokens } from "../lib/api";

type User = {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "admin";
};

type AuthContextValue = {
  user: User | null;
  credits: number;
  subscription: {
    id: string;
    planId: string;
    status: string;
    currentPeriodEnd: string | null;
  } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signIn: (payload: LoginInput) => Promise<void>;
  signUp: (payload: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type MeResponse = {
  user: User;
  credits: number;
  subscription: AuthContextValue["subscription"];
};

type AuthResponse = {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
};

async function fetchMe() {
  return apiRequest<MeResponse>("/me", { auth: true });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState(0);
  const [subscription, setSubscription] = useState<AuthContextValue["subscription"]>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback((payload: AuthResponse | MeResponse) => {
    setUser(payload.user);

    if ("credits" in payload) {
      setCredits(payload.credits);
      setSubscription(payload.subscription);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await fetchMe();
    applySession(me);
  }, [applySession]);

  useEffect(() => {
    const bootstrap = async () => {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      if (!accessToken && !refreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        if (!accessToken && refreshToken) {
          const refreshed = await apiRequest<AuthResponse>("/auth/refresh", {
            method: "POST",
            body: { refreshToken },
          });
          setTokens(refreshed.tokens.accessToken, refreshed.tokens.refreshToken);
        }

        await refreshMe();
      } catch {
        clearTokens();
        setUser(null);
        setCredits(0);
        setSubscription(null);
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, [refreshMe]);

  const signIn = useCallback(
    async (payload: LoginInput) => {
      const response = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: payload,
      });

      setTokens(response.tokens.accessToken, response.tokens.refreshToken);
      applySession(response);
      await refreshMe();
    },
    [applySession, refreshMe],
  );

  const signUp = useCallback(
    async (payload: RegisterInput) => {
      const response = await apiRequest<AuthResponse>("/auth/register", {
        method: "POST",
        body: payload,
      });

      setTokens(response.tokens.accessToken, response.tokens.refreshToken);
      applySession(response);
      await refreshMe();
    },
    [applySession, refreshMe],
  );

  const signOut = useCallback(async () => {
    const refreshToken = getRefreshToken();

    if (refreshToken) {
      try {
        await apiRequest("/auth/logout", {
          method: "POST",
          body: { refreshToken },
        });
      } catch {
        // Ignore logout API failures and clear local session regardless.
      }
    }

    clearTokens();
    setUser(null);
    setCredits(0);
    setSubscription(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      credits,
      subscription,
      isLoading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "admin",
      signIn,
      signUp,
      signOut,
      refreshMe,
    }),
    [credits, isLoading, refreshMe, signIn, signOut, signUp, subscription, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}