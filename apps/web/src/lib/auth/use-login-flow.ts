import { createSignal, onMount } from "solid-js";

import { initializeThemeMode } from "~/components/ui/theme/theme-mode";
import { isPasskeySupported } from "~/lib/auth/passkey/browser";

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
  const [passkeySupport, setPasskeySupport] = createSignal<
    "unknown" | "supported" | "unsupported"
  >("unknown");
  const [lastUsedMethod, setLastUsedMethod] =
    createSignal<LastUsedMethod>(null);

  onMount(() => {
    initializeThemeMode();
    setPasskeySupport(isPasskeySupported() ? "supported" : "unsupported");
    setLastUsedMethod(readLastUsed());
  });

  function markPasswordUsed(): void {
    persistLastUsed("password");
    setLastUsedMethod("password");
  }

  function handleGoogleLogin() {
    persistLastUsed("google");
    window.location.href = "/api/auth/google";
  }

  return {
    passkeySupport,
    lastUsedMethod,
    markPasswordUsed,
    handleGoogleLogin,
  };
}
