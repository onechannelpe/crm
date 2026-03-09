import { useNavigate } from "@solidjs/router";
import { createEffect, createSignal, onMount } from "solid-js";

import { beginPasskeyLogin, finishPasskeyLogin, login } from "~/actions/auth";
import { useToast } from "~/components/feedback/toast-provider";
import { initializeThemeMode } from "~/components/ui/theme/theme-mode";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import {
  isPasskeySupported,
  toAuthenticationPayload,
  toRequestOptions,
} from "~/lib/auth/passkey/browser";
import { getErrorMessage } from "~/lib/errors";

export type LoginStep = "init" | "email" | "password" | "totp" | "passkey";
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

  const [step, setStep] = createSignal<LoginStep>("init");
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [totpCode, setTotpCode] = createSignal("");
  const [loading, setLoading] = createSignal(false);
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

  // Auto-trigger the WebAuthn prompt immediately on step entry
  createEffect(() => {
    if (step() === "passkey") {
      void triggerPasskeyLogin();
    }
  });

  function requireUsername(): boolean {
    if (username().trim()) return true;
    showToast("error", "Ingresa tu usuario");
    return false;
  }

  async function handlePasswordSubmit() {
    setLoading(true);

    try {
      const result = await login(username(), password());
      persistLastUsed("password");
      navigate(
        result.onboardingCompleted
          ? getDefaultAppPath(result.role)
          : "/onboarding",
      );
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.message === "Strong authentication required"
      ) {
        setStep("totp");
        showToast("info", "Ingresa el código de verificación para continuar.");
        return;
      }
      showToast("error", getErrorMessage(err, "Credenciales inválidas"));
    } finally {
      setLoading(false);
    }
  }

  async function handleTotpSubmit() {
    setLoading(true);

    try {
      const result = await login(username(), password(), totpCode());
      navigate(
        result.onboardingCompleted
          ? getDefaultAppPath(result.role)
          : "/onboarding",
      );
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(err, "No se pudo verificar el código"),
      );
    } finally {
      setLoading(false);
    }
  }

  async function triggerPasskeyLogin() {
    setPasskeyLoading(true);

    try {
      const challenge = await beginPasskeyLogin(username());
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
    step,
    setStep,
    username,
    setUsername,
    password,
    setPassword,
    totpCode,
    setTotpCode,
    loading,
    passkeyLoading,
    passkeySupport,
    lastUsedMethod,
    requireUsername,
    handleGoogleLogin,
    handlePasswordSubmit,
    handleTotpSubmit,
    triggerPasskeyLogin,
  };
}
