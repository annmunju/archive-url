import { createContext, useContext } from "react";

export type SessionUser = {
  id: string;
  email: string;
  display_name: string | null;
  status: "active" | "disabled" | "deleted";
  created_at: string;
};

export type AuthState =
  | { status: "booting" }
  | { status: "signedOut" }
  | { status: "signedIn"; accessToken: string; user: SessionUser };

export type AuthContextValue = {
  state: AuthState;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("AuthContext is not available");
  }
  return context;
}
