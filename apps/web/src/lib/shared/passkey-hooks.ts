import { createSignal } from "solid-js";
import {
  formatRegistrationOptions,
  formatAuthenticationOptions,
  serializeRegistrationCredential,
  serializeAuthenticationCredential,
} from "~/lib/shared/webauthn";

export function usePasskeyRegistration() {
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  const register = async (): Promise<any> => {
    setLoading(true);
    setError("");

    try {
      const optionsResponse = await fetch(
        "/api/auth/passkey/registration-options",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!optionsResponse.ok) {
        throw new Error("Failed to get registration options");
      }

      const options = await optionsResponse.json();
      const formattedOptions = formatRegistrationOptions(options);

      const credential = (await navigator.credentials.create({
        publicKey: formattedOptions,
      })) as PublicKeyCredential;

      if (!credential) {
        throw new Error("No credential created");
      }

      return serializeRegistrationCredential(credential);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { register, loading, error, setError };
}

export function usePasskeyAuthentication() {
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  const authenticate = async (): Promise<any> => {
    setLoading(true);
    setError("");

    try {
      const optionsResponse = await fetch(
        "/api/auth/passkey/authentication-options",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!optionsResponse.ok) {
        throw new Error("Failed to get authentication options");
      }

      const options = await optionsResponse.json();
      const formattedOptions = formatAuthenticationOptions(options);

      const credential = (await navigator.credentials.get({
        publicKey: formattedOptions,
      })) as PublicKeyCredential;

      if (!credential) {
        throw new Error("No credential received");
      }

      return serializeAuthenticationCredential(credential);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { authenticate, loading, error, setError };
}
