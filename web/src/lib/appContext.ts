import { createContext, useContext } from "react";
import type { Digest, Meta, Profile } from "../types";

export type Session = {
  profile: Profile;
  digest: Digest;
  key: CryptoKey;
  rawKey: Uint8Array;
};

export type ToastTone = "info" | "success" | "error";

export type AppContextValue = {
  session: Session | null;
  meta: Meta | null;
  loading: boolean;
  unlock: (password: string, remember: boolean) => Promise<void>;
  lock: () => void;
  refresh: () => Promise<void>;
  toast: (message: string, tone?: ToastTone) => void;
};

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppContext");
  return ctx;
}
