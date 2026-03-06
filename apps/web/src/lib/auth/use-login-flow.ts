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

export type LoginStep = "init" | "password" | "totp" | "passkey";

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

  onMount(() => {
    initializeThemeMode();
    setPasskeySupport(isPasskeySupported() ? "supported" : "unsupported");
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

  function goToPassword() {
    if (!requireUsername()) return;
    setStep("password");
  }

  function goToPasskey() {
    if (!requireUsername()) return;
    setStep("passkey");
  }

  async function handlePasswordSubmit(e: Event) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(username(), password());
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

  async function handleTotpSubmit(e: Event) {
    e.preventDefault();
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
    goToPassword,
    goToPasskey,
    handlePasswordSubmit,
    handleTotpSubmit,
    triggerPasskeyLogin,
  };
}
