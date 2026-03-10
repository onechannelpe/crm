import { createEffect, createSignal } from "solid-js";

import {
  beginPasskeyRegistration,
  finishPasskeyRegistration,
} from "~/actions/auth";
import {
  isPasskeySupported,
  toCreationOptions,
  toRegistrationPayload,
} from "~/lib/auth/passkey/browser";
import { getErrorMessage } from "~/lib/errors";

type ShowToast = (type: "success" | "error" | "info", message: string) => void;

interface PasskeyEnrollmentOptions {
  showToast: ShowToast;
  refreshStatus: () => void | PromiseLike<unknown>;
  successMessage?: string;
  failureMessage?: string;
}

export function usePasskeyEnrollment(options: PasskeyEnrollmentOptions) {
  const [supported, setSupported] = createSignal(false);
  const [loading, setLoading] = createSignal(false);

  createEffect(() => {
    setSupported(isPasskeySupported());
  });

  async function registerPasskey() {
    setLoading(true);
    try {
      const { challengeId, options: registrationOptions } =
        await beginPasskeyRegistration();
      const credential = await navigator.credentials.create({
        publicKey: toCreationOptions(registrationOptions),
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
        options.successMessage ?? "Clave de acceso configurada",
      );
    } catch (error: unknown) {
      options.showToast(
        "error",
        getErrorMessage(
          error,
          options.failureMessage ?? "No se pudo configurar la clave de acceso",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setLoading(false);
  }

  return {
    supported,
    loading,
    registerPasskey,
    reset,
  };
}
