import { createEffect, createSignal } from "solid-js";

import {
  beginPasskeyRegistration,
  finishPasskeyRegistration,
} from "~/actions/auth/onboarding/passkey";
import {
  createRegistrationResponse,
  isPasskeyRegistrationSupported,
} from "~/lib/auth/passkey/registration-client";
import { getErrorMessage } from "~/lib/errors";

interface PasskeyEnrollmentOptions {
  enqueueSuccessSnackBar: (message: string) => void;
  enqueueErrorSnackBar: (message: string) => void;
  refreshStatus: () => void | PromiseLike<unknown>;
  successMessage?: string;
  failureMessage?: string;
}

export function usePasskeyEnrollment(options: PasskeyEnrollmentOptions) {
  const [supported, setSupported] = createSignal(false);
  const [loading, setLoading] = createSignal(false);

  createEffect(() => {
    setSupported(isPasskeyRegistrationSupported());
  });

  async function registerPasskey() {
    setLoading(true);
    try {
      const { challengeId, options: registrationOptions } =
        await beginPasskeyRegistration();
      await finishPasskeyRegistration(
        challengeId,
        await createRegistrationResponse(registrationOptions),
      );
      await options.refreshStatus();
      options.enqueueSuccessSnackBar(
        options.successMessage ?? "Clave de acceso configurada",
      );
    } catch (error: unknown) {
      options.enqueueErrorSnackBar(
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
