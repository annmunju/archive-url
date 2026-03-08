import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { Alert, Linking } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { AuthContext, type AuthState, type PendingSignupState } from "./context";
import { getCurrentUserProfile } from "./api";
import { registerAccessTokenProvider, registerUnauthorizedHandler } from "./bridge";
import { supabase } from "./supabase";

const AUTH_CALLBACK_URL = "archiveurl://auth/callback";
const DEV_AUTH_TOKEN = process.env.EXPO_PUBLIC_DEV_AUTH_TOKEN?.trim() || "";
const DEV_AUTH_EMAIL = process.env.EXPO_PUBLIC_DEV_AUTH_EMAIL?.trim().toLowerCase() || "";
const DEV_ACCESS_TOKEN_KEY = "archiveurl.dev_access_token";
const PENDING_SIGNUP_STATUS_KEY = "archiveurl.pending_signup_status";
const PENDING_SIGNUP_EMAIL_KEY = "archiveurl.pending_signup_email";

function parseSessionFromUrl(url: string): { accessToken: string; refreshToken: string } | null {
  const normalized = url.replace("#", "?");
  const parsed = new URL(normalized);
  const accessToken = parsed.searchParams.get("access_token");
  const refreshToken = parsed.searchParams.get("refresh_token");
  if (!accessToken || !refreshToken) {
    return null;
  }
  return { accessToken, refreshToken };
}

function parseCodeFromUrl(url: string): string | null {
  const normalized = url.replace("#", "?");
  const parsed = new URL(normalized);
  return parsed.searchParams.get("code");
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ status: "booting" });
  const [pendingSignup, setPendingSignup] = useState<PendingSignupState>(null);
  const queryClient = useQueryClient();
  const signingOutRef = useRef(false);

  const setPendingSignupState = async (status: "requested" | "confirmed", email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    setPendingSignup({ status, email: normalizedEmail });
    await SecureStore.setItemAsync(PENDING_SIGNUP_STATUS_KEY, status);
    await SecureStore.setItemAsync(PENDING_SIGNUP_EMAIL_KEY, normalizedEmail);
  };

  const clearPendingSignup = async () => {
    setPendingSignup(null);
    await SecureStore.deleteItemAsync(PENDING_SIGNUP_STATUS_KEY);
    await SecureStore.deleteItemAsync(PENDING_SIGNUP_EMAIL_KEY);
  };

  const applySession = async (session: Session | null, options?: { rethrow?: boolean }) => {
    if (!session?.access_token) {
      setState({ status: "signedOut" });
      return;
    }

    try {
      const profile = await getCurrentUserProfile(session.access_token);
      setState({
        status: "signedIn",
        accessToken: session.access_token,
        user: profile.user,
      });
      await clearPendingSignup();
    } catch (error) {
      await supabase.auth.signOut();
      setState({ status: "signedOut" });
      if (options?.rethrow) {
        throw error;
      }
    }
  };

  const applyAccessToken = async (accessToken: string | null, options?: { rethrow?: boolean }) => {
    if (!accessToken) {
      setState({ status: "signedOut" });
      return;
    }

    try {
      const profile = await getCurrentUserProfile(accessToken);
      setState({
        status: "signedIn",
        accessToken,
        user: profile.user,
      });
      await clearPendingSignup();
    } catch (error) {
      setState({ status: "signedOut" });
      if (options?.rethrow) {
        throw error;
      }
    }
  };

  const signOut = async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    try {
      await supabase.auth.signOut();
      await SecureStore.deleteItemAsync(DEV_ACCESS_TOKEN_KEY);
      await clearPendingSignup();
      await queryClient.cancelQueries();
      queryClient.clear();
      setState({ status: "signedOut" });
    } finally {
      signingOutRef.current = false;
    }
  };

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession();
    await applySession(data.session);
  };

  const signInWithPassword = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (DEV_AUTH_TOKEN && DEV_AUTH_EMAIL && normalizedEmail === DEV_AUTH_EMAIL) {
      await signInWithDevToken();
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) {
      throw error;
    }
    await applySession(data.session, { rethrow: true });
  };

  const signUpWithPassword = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: AUTH_CALLBACK_URL,
      },
    });
    if (error) {
      throw error;
    }
    if (data.session?.access_token) {
      await applySession(data.session);
      return;
    }
    await setPendingSignupState("requested", normalizedEmail);
  };

  const signInWithDevToken = async () => {
    if (!DEV_AUTH_TOKEN) {
      throw new Error("개발용 토큰이 설정되지 않았습니다.");
    }
    await SecureStore.setItemAsync(DEV_ACCESS_TOKEN_KEY, DEV_AUTH_TOKEN);
    await applyAccessToken(DEV_AUTH_TOKEN, { rethrow: true });
  };

  useEffect(() => {
    registerAccessTokenProvider(async () => {
      if (state.status === "signedIn") {
        return state.accessToken;
      }
      const devToken = await SecureStore.getItemAsync(DEV_ACCESS_TOKEN_KEY);
      if (devToken) {
        return devToken;
      }
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    });
    registerUnauthorizedHandler(async () => {
      await signOut();
    });
  }, [state]);

  useEffect(() => {
    const handleUrl = async (url: string) => {
      console.log("[auth] incoming url:", url);
      const parsed = parseSessionFromUrl(url);
      if (parsed) {
        const { error } = await supabase.auth.setSession({
          access_token: parsed.accessToken,
          refresh_token: parsed.refreshToken,
        });
        if (!error) {
          await refreshProfile();
          return;
        }
        console.log("[auth] setSession error", error);
        Alert.alert("로그인 실패", error.message);
        return;
      }

      const code = parseCodeFromUrl(url);
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          await refreshProfile();
          return;
        }
        console.log("[auth] exchangeCodeForSession error", error);
        Alert.alert("로그인 실패", error.message);
        return;
      }

      if (url.startsWith(AUTH_CALLBACK_URL)) {
        console.log("[auth] callback received without code/token", url);
        const [pendingStatus, pendingEmail] = await Promise.all([
          SecureStore.getItemAsync(PENDING_SIGNUP_STATUS_KEY),
          SecureStore.getItemAsync(PENDING_SIGNUP_EMAIL_KEY),
        ]);
        if (pendingStatus && pendingEmail) {
          await setPendingSignupState("confirmed", pendingEmail);
          return;
        }
        Alert.alert("로그인 콜백 확인 필요", "앱으로 돌아왔지만 세션 코드나 토큰이 없습니다.");
      }
    };

    void Linking.getInitialURL().then((url) => {
      if (url) {
        void handleUrl(url);
      }
    });

    const sub = Linking.addEventListener("url", ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const [storedPendingSignupStatus, storedPendingSignupEmail] = await Promise.all([
          SecureStore.getItemAsync(PENDING_SIGNUP_STATUS_KEY),
          SecureStore.getItemAsync(PENDING_SIGNUP_EMAIL_KEY),
        ]);
        if (
          (storedPendingSignupStatus === "requested" || storedPendingSignupStatus === "confirmed") &&
          storedPendingSignupEmail
        ) {
          setPendingSignup({
            status: storedPendingSignupStatus,
            email: storedPendingSignupEmail,
          });
        }
        const devToken = await SecureStore.getItemAsync(DEV_ACCESS_TOKEN_KEY);
        if (devToken) {
          await applyAccessToken(devToken);
          return;
        }
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          await applySession(data.session);
        }
      } catch {
        if (!cancelled) {
          setState({ status: "signedOut" });
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: unknown, session: Session | null) => {
      void applySession(session);
    });

    void bootstrap();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        state,
        pendingSignup,
        signInWithPassword,
        signUpWithPassword,
        clearPendingSignup,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
