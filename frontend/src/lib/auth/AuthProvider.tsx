"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "@/lib/api/client";
import type { AuthUser } from "@/lib/types";

export type AuthStatus = "loading" | "authenticated" | "guest";

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const setUser = useCallback((next: AuthUser | null) => {
    setUserState(next);
    setStatus(next ? "authenticated" : "guest");
  }, []);

  const loadCurrentUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const current = await api.get<AuthUser>("/auth/me");
      if (mountedRef.current) setUser(current);
      return current;
    } catch {
      if (mountedRef.current) setUser(null);
      return null;
    }
  }, [setUser]);

  useEffect(() => {
    void loadCurrentUser();
  }, [loadCurrentUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      const loggedIn = await api.post<AuthUser>(
        "/auth/login",
        { email, password },
        { retryOnUnauthorized: false },
      );
      if (mountedRef.current) setUser(loggedIn);
      return loggedIn;
    },
    [setUser],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post<{ message: string }>("/auth/logout", undefined, {
        retryOnUnauthorized: false,
      });
    } catch {
      // The local session is cleared even if the server call fails.
    }
    if (mountedRef.current) setUser(null);
  }, [setUser]);

  const refresh = useCallback(() => loadCurrentUser(), [loadCurrentUser]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, logout, refresh, setUser }),
    [user, status, login, logout, refresh, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return context;
}
