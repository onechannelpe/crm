import { useNavigate } from "@solidjs/router";
import { createMemo, createSignal, onMount, Show } from "solid-js";

import { beginPasskeyLogin, finishPasskeyLogin, login } from "~/actions/auth";
import { AuthFlowShell } from "~/components/auth/auth-flow-shell";
import { useToast } from "~/components/feedback/toast-provider";
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
import pageStyles from "../auth/login-page.module.css";

type LoginStep = "init" | "password" | "passkey";

export default function LoginPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [totpCode, setTotpCode] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [passkeyLoading, setPasskeyLoading] = createSignal(false);
  const [passkeySupport, setPasskeySupport] = createSignal<
    "unknown" | "supported" | "unsupported"
  >("unknown");
  const [step, setStep] = createSignal<LoginStep>("init");

  onMount(() => {
    initializeThemeMode();
    setPasskeySupport(isPasskeySupported() ? "supported" : "unsupported");
  });

  const contentTitle = createMemo(() => {
    if (step() === "password") return "Password";
    if (step() === "passkey") return "Passkey";
    return "Sign in";
  });

  const contentDescription = createMemo(() => {
    if (step() === "password") {
      return "Enter your password and verification code when prompted.";
    }
    if (step() === "passkey") {
      return "Use a passkey already configured on this account.";
    }
    return "Use your username to continue.";
  });

  function requireUsername(): boolean {
    if (username().trim()) return true;
    showToast("error", "Ingresa tu usuario");
    return false;
  }

  async function handleSubmit(e: Event) {
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
      showToast("error", getErrorMessage(err, "Credenciales inválidas"));
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskeyLogin() {
    setPasskeyLoading(true);

    try {
      if (!isPasskeySupported()) {
        throw new Error("This browser does not support passkeys");
      }

      if (!username().trim()) {
        throw new Error("Ingresa tu usuario antes de usar la clave de acceso");
      }

      const challenge = await beginPasskeyLogin(username());
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

  return (
    <AuthFlowShell
      eyebrow="One Channel"
      title="Welcome back"
      description="Sign in to continue."
      contentTitle={contentTitle()}
      contentDescription={contentDescription()}
    >
      <div class={pageStyles.formStack}>
        <Input
          id="auth-username"
          type="text"
          name="username"
          label="Username"
          autocomplete={step() === "passkey" ? "username webauthn" : "username"}
          value={username()}
          onInput={(e) => setUsername(e.currentTarget.value)}
          required
        />

        <Show when={step() === "init"}>
          <div class={pageStyles.formStack}>
            <Button
              type="button"
              class={styles.full}
              onClick={() => {
                if (!requireUsername()) return;
                setStep("password");
              }}
            >
              Continue with password
            </Button>
            <Button
              type="button"
              variant="outline"
              class={styles.full}
              disabled={passkeySupport() !== "supported"}
              onClick={() => {
                if (!requireUsername()) return;
                setStep("passkey");
              }}
            >
              Continue with passkey
            </Button>
          </div>
        </Show>

        <Show when={step() === "password"}>
          <form
            class={pageStyles.formStack}
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
          >
            <div class={pageStyles.passwordFields}>
              <Input
                id="password"
                type="password"
                name="password"
                label="Password"
                autocomplete="current-password"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                required
              />

              <Input
                id="totp"
                type="text"
                name="totp"
                label="Verification code"
                placeholder="If required"
                autocomplete="one-time-code"
                value={totpCode()}
                onInput={(e) => setTotpCode(e.currentTarget.value)}
              />
            </div>

            <div class={pageStyles.actionRow}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("init")}
              >
                Back
              </Button>
              <Button type="submit" class={styles.full} loading={loading()}>
                Sign in
              </Button>
            </div>
          </form>
        </Show>

        <Show when={step() === "passkey"}>
          <div class={pageStyles.formStack}>
            <Show
              when={passkeySupport() === "supported"}
              fallback={
                <p class={pageStyles.supportText}>
                  Passkeys are not supported on this device or browser.
                </p>
              }
            >
              <p class={pageStyles.supportText}>Use a configured passkey.</p>
            </Show>

            <div class={pageStyles.actionRow}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("init")}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="outline"
                class={styles.full}
                disabled={loading() || passkeySupport() !== "supported"}
                loading={passkeyLoading()}
                onClick={() => {
                  void handlePasskeyLogin();
                }}
              >
                Use passkey
              </Button>
            </div>
          </div>
        </Show>
      </div>
    </AuthFlowShell>
  );
}
