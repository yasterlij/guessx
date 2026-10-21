import { useState, useCallback, useRef } from "react";
import {
  api,
  setApiToken,
  setRefreshToken,
  getUserFriendlyMessage,
  type SessionExpireReason,
} from "../api";

export type UserRole = "admin" | "user";

export type AuthUser = {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
};

interface UseAuthSessionOptions {
  onLogin?: (user: AuthUser) => void;
  onLogout?: (reason: SessionExpireReason) => void;
}

export function useAuthSession({ onLogin, onLogout }: UseAuthSessionOptions = {}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionEndReason, setSessionEndReason] =
    useState<SessionExpireReason | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);

  const login = useCallback(
    async (phone: string, password: string): Promise<string | null> => {
      try {
        setAuthError(null);
        setSessionEndReason(null);
        sessionStartedAtRef.current = Date.now();
        const res = await api.auth.login(phone, password);
        setApiToken(res.access_token);
        setRefreshToken(res.refresh_token);
        const appUser: AuthUser = {
          id: res.user.id,
          name: res.user.phone_number,
          phone: res.user.phone_number,
          role: res.user.role as UserRole,
        };
        try {
          const profile = await api.auth.profile();
          appUser.name = profile.full_name || profile.phone_number;
        } catch {
          // non-fatal
        }
        setUser(appUser);
        onLogin?.(appUser);
        return null;
      } catch (e: unknown) {
        const msg = getUserFriendlyMessage(e);
        setAuthError(msg);
        return msg;
      }
    },
    [onLogin],
  );

  const register = useCallback(
    async (phone: string, password: string, name: string): Promise<string | null> => {
      try {
        setAuthError(null);
        setSessionEndReason(null);
        sessionStartedAtRef.current = Date.now();
        const res = await api.auth.register(phone, password, name);
        setApiToken(res.access_token);
        setRefreshToken(res.refresh_token);
        const appUser: AuthUser = {
          id: res.user.id,
          name,
          phone: res.user.phone_number,
          role: res.user.role as UserRole,
        };
        setUser(appUser);
        onLogin?.(appUser);
        return null;
      } catch (e: unknown) {
        const msg = getUserFriendlyMessage(e);
        setAuthError(msg);
        return msg;
      }
    },
    [onLogin],
  );

  const logout = useCallback(
    (reason: SessionExpireReason = "logout") => {
      setSessionEndReason(reason);
      sessionStartedAtRef.current = null;
      setApiToken(null);
      setRefreshToken(null);
      setUser(null);
      setAuthError(null);
      onLogout?.(reason);
    },
    [onLogout],
  );

  const restoreSession = useCallback(
    async (savedUser: AuthUser, accessToken: string, refreshToken: string): Promise<boolean> => {
      setApiToken(accessToken);
      setRefreshToken(refreshToken);
      try {
        const profile = await api.auth.profile();
        const restoredUser: AuthUser = {
          ...savedUser,
          id: profile.id,
          name: profile.full_name || profile.phone_number,
          phone: profile.phone_number,
          role: profile.role as UserRole,
        };
        setUser(restoredUser);
        onLogin?.(restoredUser);
        return true;
      } catch {
        try {
          const refreshed = await api.auth.refresh(refreshToken);
          setApiToken(refreshed.access_token);
          setRefreshToken(refreshed.refresh_token);
          setUser(savedUser);
          onLogin?.(savedUser);
          return true;
        } catch {
          setApiToken(null);
          setRefreshToken(null);
          return false;
        }
      }
    },
    [onLogin],
  );

  return {
    user,
    setUser,
    authError,
    setAuthError,
    sessionEndReason,
    setSessionEndReason,
    sessionStartedAtRef,
    login,
    register,
    logout,
    restoreSession,
  };
}
