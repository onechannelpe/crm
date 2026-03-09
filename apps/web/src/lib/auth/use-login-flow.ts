import { useNavigate } from "@solidjs/router";
import { createSignal, onMount } from "solid-js";

import { beginPasskeyLogin, finishPasskeyLogin } from "~/actions/auth";
import { useToast } from "~/components/feedback/toast-provider";
import { initializeThemeMode } from "~/components/ui/theme/theme-mode";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import {
  isPasskeySupported,
  toAuthenticationPayload,
  toRequestOptions,
} from "~/lib/auth/passkey/browser";
import { getErrorMessage } from "~/lib/errors";

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
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [passkeyLoading, setPasskeyLoading] = createSignal(false);
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

  async function triggerPasskeyLogin(form: HTMLFormElement) {
    const identifierValue = new FormData(form).get("identifier");
    const safeIdentifier =
      typeof identifierValue === "string" ? identifierValue.trim() : "";
    if (safeIdentifier.length === 0) {
      showToast("error", "Ingresa tu usuario para usar la clave de acceso.");
      return;
    }

    setPasskeyLoading(true);

    try {
      const challenge = await beginPasskeyLogin(safeIdentifier);
      const credential = await navigator.credentials.get({
        publicKey: toRequestOptions(challenge.options),
      });

      if (!(credential instanceof PublicKeyCredential)) {
        throw new Error("Respuesta de credencial inválida");
      }

      const payload = toAuthenticationPayload(credential);
      const result = await finishPasskeyLogin(challenge.challengeId, payload);
      navigate(
        result.onboardingCompleted
          ? getDefaultAppPath(result.role)
          : "/onboarding",
      );
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(
          err,
          "No se pudo iniciar sesión con la clave de acceso",
        ),
      );
    } finally {
      setPasskeyLoading(false);
    }
  }

  function handleGoogleLogin() {
    persistLastUsed("google");
    window.location.href = "/api/auth/google";
  }

  return {
    passkeyLoading,
    passkeySupport,
    lastUsedMethod,
    markPasswordUsed,
    handleGoogleLogin,
    triggerPasskeyLogin,
  };
}
