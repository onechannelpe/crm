import { useNavigate } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";

import { beginPasskeyLogin, finishPasskeyLogin } from "~/actions/auth";
import { login } from "~/actions/auth-login";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { initializeThemeMode } from "~/components/ui/theme/theme-mode";
import {
  isPasskeySupported,
  toAuthenticationPayload,
  toRequestOptions,
} from "~/lib/auth/passkey/browser";
import { getErrorMessage } from "~/lib/errors";

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
      navigate(result.onboardingCompleted ? "/dashboard" : "/onboarding");
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
      navigate(result.onboardingCompleted ? "/dashboard" : "/onboarding");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Passkey sign in failed"));
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <div class="crm-shell flex min-h-screen items-center justify-center p-4">
      <div class="tw-record-index-panel w-full max-w-[420px] p-5">
        <div class="mb-5 space-y-1">
          <p class="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            CRM Workspace
          </p>
          <h1 class="text-xl font-semibold text-foreground">Sign in</h1>
          <p class="text-sm text-muted-foreground">
            Continue with password or passkey.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          class="space-y-3"
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
            <div class="border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
              {error()}
            </div>
          </Show>

          <div class="space-y-2 pt-1">
            <Button
              type="submit"
              class="h-9 w-full"
              disabled={loading() || passkeyLoading()}
            >
              {loading() ? "Signing in..." : "Sign in"}
            </Button>
            <Button
              type="button"
              variant="outline"
              class="h-9 w-full"
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
            <p class="text-xs text-muted-foreground">
              Passkeys are not supported on this device.
            </p>
          </Show>
        </form>
      </div>
    </div>
  );
}
