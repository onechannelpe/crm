import { useNavigate } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";

import { beginPasskeyLogin, finishPasskeyLogin } from "~/actions/auth";
import { login } from "~/actions/auth";
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
  const [showTotp, setShowTotp] = createSignal(false);
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
          <p class={styles.eyebrow}>One Channel</p>
          <h1 class={styles.titleSm}>Sign in</h1>
        </div>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          class={styles.stack3}
        >
          <Show when={error()}>
            <div class={styles.errorOverlay} role="alert">
              <svg
                class={styles.errorIcon}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
              <span>{error()}</span>
            </div>
          </Show>

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

          <Show
            when={showTotp()}
            fallback={
              <button
                type="button"
                class={styles.textButton}
                onClick={() => setShowTotp(true)}
              >
                I have a two-factor code
              </button>
            }
          >
            <Input
              id="totp"
              type="text"
              label="TOTP or recovery code"
              placeholder="Optional"
              value={totpCode()}
              onInput={(e) => setTotpCode(e.currentTarget.value)}
            />
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
