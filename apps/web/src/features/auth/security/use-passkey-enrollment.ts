import { createSignal, onMount } from "solid-js";

import {
  beginPasskeyEnrollment,
  finishPasskeyEnrollment,
} from "~/actions/auth/security/passkey";
import {
  createRegistrationResponse,
  isPasskeyRegistrationSupported,
} from "~/lib/auth/passkey/registration-client";
import { actionErrorMessage } from "~/lib/wire-error";

interface PasskeyEnrollmentOptions {
  enqueueSuccessSnackBar: (message: string) => void;
  enqueueErrorSnackBar: (message: string) => void;
  refreshStatus: () => void | PromiseLike<unknown>;
  onRecoveryCodes?: (codes: string[]) => void;
}

export function usePasskeyEnrollment(options: PasskeyEnrollmentOptions) {
  const [supported, setSupported] = createSignal(false);
  const [loading, setLoading] = createSignal(false);

  onMount(() => {
    setSupported(isPasskeyRegistrationSupported());
  });

  async function enrollPasskey() {
    setLoading(true);
    try {
      const { challengeId, options: registrationOptions } =
        await beginPasskeyEnrollment();
      const { message, recoveryCodes } = await finishPasskeyEnrollment(
        challengeId,
        await createRegistrationResponse(registrationOptions),
      );
      await options.refreshStatus();
      if (recoveryCodes.length > 0) {
        options.onRecoveryCodes?.(recoveryCodes);
      }
      options.enqueueSuccessSnackBar(message);
    } catch (caught: unknown) {
      options.enqueueErrorSnackBar(actionErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return {
    supported,
    loading,
    enrollPasskey,
  };
}
