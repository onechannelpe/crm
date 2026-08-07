import { createSignal, onMount } from "solid-js";

export type AuthMethod = "google" | "password" | "passkey";
export type LastUsedMethod = AuthMethod | null;

const LAST_USED_KEY = "last_auth_method";

function readLastUsed(): LastUsedMethod {
  try {
    const v = localStorage.getItem(LAST_USED_KEY);
    if (v === "google" || v === "password" || v === "passkey") {
      return v;
    }
  } catch {
    // localStorage throws in SSR and sandboxed contexts
  }
  return null;
}

function persistLastUsed(method: AuthMethod): void {
  try {
    localStorage.setItem(LAST_USED_KEY, method);
  } catch {
    // localStorage throws in SSR and sandboxed contexts
  }
}

export function useLoginFlow() {
  const [lastUsedMethod, setLastUsedMethod] =
    createSignal<LastUsedMethod>(null);

  onMount(() => {
    setLastUsedMethod(readLastUsed());
  });

  function markUsed(method: AuthMethod): void {
    persistLastUsed(method);
    setLastUsedMethod(method);
  }

  return {
    lastUsedMethod,
    markUsed,
  };
}
