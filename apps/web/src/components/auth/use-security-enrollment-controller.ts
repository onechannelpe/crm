import { createEffect, createSignal } from "solid-js";

import {
  beginPasskeyRegistration,
  beginTotpEnrollment,
  finishPasskeyRegistration,
  finishTotpEnrollment,
} from "~/actions/auth";
import {
  isPasskeySupported,
  toCreationOptions,
  toRegistrationPayload,
} from "~/lib/auth/passkey/browser";
import { getErrorMessage } from "~/lib/errors";

type ShowToast = (type: "success" | "error" | "info", message: string) => void;

interface SecurityEnrollmentControllerOptions {
  showToast: ShowToast;
  refreshStatus: () => void | PromiseLike<unknown>;
  messages?: {
    passkeySuccess?: string;
    passkeyFailure?: string;
    totpBeginInfo?: string;
    totpBeginFailure?: string;
    totpVerifySuccess?: string;
    totpVerifyFailure?: string;
  };
}

export function useSecurityEnrollmentController(
  options: SecurityEnrollmentControllerOptions,
) {
  const [passkeySupported, setPasskeySupported] = createSignal(false);
  const [passkeyLoading, setPasskeyLoading] = createSignal(false);
  const [totpLoading, setTotpLoading] = createSignal(false);
  const [totpCode, setTotpCode] = createSignal("");
  const [totpEnrollment, setTotpEnrollment] = createSignal<{
    qrCodeDataUrl: string;
    otpauthUri: string;
  } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = createSignal<string[]>([]);

  createEffect(() => {
    setPasskeySupported(isPasskeySupported());
  });

  async function registerPasskey() {
    setPasskeyLoading(true);
    try {
      const { challengeId, options: registrationOptions } =
        await beginPasskeyRegistration();
      const creationOptions = toCreationOptions(registrationOptions);
      const credential = await navigator.credentials.create({
        publicKey: creationOptions,
      });

      if (!credential || !(credential instanceof PublicKeyCredential)) {
        throw new Error("No se pudo crear la clave de acceso");
      }

      await finishPasskeyRegistration(
        challengeId,
        toRegistrationPayload(credential),
      );
      await options.refreshStatus();
      options.showToast(
        "success",
        options.messages?.passkeySuccess ?? "Clave de acceso configurada",
      );
    } catch (error: unknown) {
      options.showToast(
        "error",
        getErrorMessage(
          error,
          options.messages?.passkeyFailure ??
            "No se pudo configurar la clave de acceso",
        ),
      );
    } finally {
      setPasskeyLoading(false);
    }
  }

  async function beginTotp() {
    setTotpLoading(true);
    try {
      const enrollment = await beginTotpEnrollment();
      setTotpEnrollment(enrollment);
      const beginInfo = options.messages?.totpBeginInfo;
      if (beginInfo) {
        options.showToast("info", beginInfo);
      }
    } catch (error: unknown) {
      options.showToast(
        "error",
        getErrorMessage(
          error,
          options.messages?.totpBeginFailure ??
            "No se pudo iniciar la configuración del 2FA",
        ),
      );
    } finally {
      setTotpLoading(false);
    }
  }

  async function verifyTotp() {
    setTotpLoading(true);
    try {
      const codes = await finishTotpEnrollment(totpCode());
      setRecoveryCodes(codes);
      setTotpEnrollment(null);
      setTotpCode("");
      await options.refreshStatus();
      options.showToast(
        "success",
        options.messages?.totpVerifySuccess ??
          "Aplicación de autenticación configurada",
      );
    } catch (error: unknown) {
      options.showToast(
        "error",
        getErrorMessage(
          error,
          options.messages?.totpVerifyFailure ??
            "Código de verificación inválido",
        ),
      );
    } finally {
      setTotpLoading(false);
    }
  }

  return {
    passkeySupported,
    passkeyLoading,
    totpLoading,
    totpCode,
    totpEnrollment,
    recoveryCodes,
    setTotpCode,
    registerPasskey,
    beginTotp,
    verifyTotp,
  };
}
