import { useNavigate } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";

import { beginPasskeyLogin, finishPasskeyLogin } from "~/actions/auth";
import { login } from "~/actions/auth-login";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { initializeThemeMode } from "~/components/ui/theme/theme-mode";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import {
  isPasskeySupported,
  toAuthenticationPayload,
  toRequestOptions,
} from "~/lib/auth/passkey/browser";
import { getErrorMessage } from "~/lib/errors";

import styles from "../auth/auth-shell.module.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [totpCode, setTotpCode] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [passkeyLoading, setPasskeyLoading] = createSignal(false);
  const [passkeySupport, setPasskeySupport] = createSignal<
    "unknown" | "supported" | "unsupported"
  >("unknown");

  onMount(() => {
    initializeThemeMode();
    setPasskeySupport(isPasskeySupported() ? "supported" : "unsupported");
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email(), password(), totpCode());
      navigate(
        result.onboardingCompleted
          ? getDefaultAppPath(result.role)
          : "/onboarding",
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Invalid credentials"));
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskeyLogin() {
    setError("");
    setPasskeyLoading(true);

    try {
      if (!isPasskeySupported()) {
        throw new Error("This browser does not support passkeys");
      }

      if (!email().trim()) {
        throw new Error("Enter email before using passkey");
      }

      const challenge = await beginPasskeyLogin(email());
      const credential = await navigator.credentials.get({
        publicKey: toRequestOptions(challenge.options),
      });

      if (!(credential instanceof PublicKeyCredential)) {
        throw new Error("Invalid credential response");
      }

      const payload = toAuthenticationPayload(credential);
      const result = await finishPasskeyLogin(challenge.challengeId, payload);
      navigate(
        result.onboardingCompleted
          ? getDefaultAppPath(result.role)
          : "/onboarding",
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Passkey sign in failed"));
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <div class={styles.shell}>
      <div class={`${styles.panel} ${styles.panelSm}`}>
        <div class={styles.stack1}>
          <p class={styles.eyebrow}>CRM Workspace</p>
          <h1 class={styles.titleSm}>Sign in</h1>
          <p class={styles.muted}>Continue with password or passkey.</p>
        </div>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          class={styles.stack3}
        >
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="name@company.com"
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
            required
          />

          <Input
            id="password"
            type="password"
            label="Password"
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
            required
          />

          <Input
            id="totp"
            type="text"
            label="TOTP or recovery code"
            placeholder="Optional"
            value={totpCode()}
            onInput={(e) => setTotpCode(e.currentTarget.value)}
          />

          <Show when={error()}>
            <div class={styles.errorBox}>{error()}</div>
          </Show>

          <div class={styles.stack2}>
            <Button
              type="submit"
              class={styles.full}
              disabled={loading() || passkeyLoading()}
            >
              {loading() ? "Signing in..." : "Sign in"}
            </Button>
            <Button
              type="button"
              variant="outline"
              class={styles.full}
              disabled={
                loading() ||
                passkeyLoading() ||
                passkeySupport() !== "supported"
              }
              onClick={() => {
                void handlePasskeyLogin();
              }}
            >
              {passkeyLoading() ? "Checking passkey..." : "Use passkey"}
            </Button>
          </div>

          <Show when={passkeySupport() === "unsupported"}>
            <p class={styles.muted}>
              Passkeys are not supported on this device.
            </p>
          </Show>
        </form>
      </div>
    </div>
  );
}
