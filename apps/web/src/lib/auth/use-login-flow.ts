import { createSignal } from "solid-js";

export type LastUsedMethod = "google" | "password" | null;

const LAST_USED_KEY = "last_auth_method";

function readLastUsed(): LastUsedMethod {
  try {
    const v = localStorage.getItem(LAST_USED_KEY);
    if (v === "google" || v === "password") return v;
  } catch {
    // localStorage unavailable (SSR / sandboxed)
  }
  return null;
}

function persistLastUsed(method: LastUsedMethod): void {
  try {
    if (method) localStorage.setItem(LAST_USED_KEY, method);
  } catch {
    // ignore
  }
}

export function useLoginFlow() {
  const [lastUsedMethod, setLastUsedMethod] =
    createSignal<LastUsedMethod>(readLastUsed());

  function markPasswordUsed(): void {
    persistLastUsed("password");
    setLastUsedMethod("password");
  }

  function markGoogleUsed(): void {
    persistLastUsed("google");
    setLastUsedMethod("google");
  }

  return {
    lastUsedMethod,
    markPasswordUsed,
    markGoogleUsed,
  };
}
