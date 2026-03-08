import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { Alert, Linking } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { AuthContext, type AuthState } from "./context";
import { getCurrentUserProfile } from "./api";
import { registerAccessTokenProvider, registerUnauthorizedHandler } from "./bridge";
import { supabase } from "./supabase";

const AUTH_CALLBACK_URL = "archiveurl://auth/callback";
const DEV_AUTH_TOKEN = process.env.EXPO_PUBLIC_DEV_AUTH_TOKEN?.trim() || "";
const DEV_AUTH_EMAIL = process.env.EXPO_PUBLIC_DEV_AUTH_EMAIL?.trim().toLowerCase() || "";
const DEV_ACCESS_TOKEN_KEY = "archiveurl.dev_access_token";

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
  const queryClient = useQueryClient();
  const signingOutRef = useRef(false);

  const applySession = async (session: Session | null) => {
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
    } catch {
      await supabase.auth.signOut();
      setState({ status: "signedOut" });
    }
  };

  const applyAccessToken = async (accessToken: string | null) => {
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
    } catch {
      setState({ status: "signedOut" });
    }
  };

  const signOut = async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    try {
      await supabase.auth.signOut();
      await SecureStore.deleteItemAsync(DEV_ACCESS_TOKEN_KEY);
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

  const signInWithEmail = async (email: string) => {
    if (DEV_AUTH_TOKEN && DEV_AUTH_EMAIL && email.trim().toLowerCase() === DEV_AUTH_EMAIL) {
      await signInWithDevToken();
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: AUTH_CALLBACK_URL,
      },
    });
    if (error) {
      throw error;
    }
  };

  const signInWithDevToken = async () => {
    if (!DEV_AUTH_TOKEN) {
      throw new Error("개발용 토큰이 설정되지 않았습니다.");
    }
    await SecureStore.setItemAsync(DEV_ACCESS_TOKEN_KEY, DEV_AUTH_TOKEN);
    await applyAccessToken(DEV_AUTH_TOKEN);
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
        signInWithEmail,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
