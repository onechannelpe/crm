import { useNavigate } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";

import { beginPasskeyLogin, finishPasskeyLogin, login } from "~/actions/auth";
import { AuthFlowShell } from "~/components/auth/auth-flow-shell";
import { useToast } from "~/components/feedback/toast-provider";
import { EnterTransition } from "~/components/ui/animation/enter-transition";
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

type LoginStep = "init" | "password" | "totp" | "passkey";

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

  const title = () => {
    if (step() === "password") return "Contraseña";
    if (step() === "totp") return "Verificación";
    if (step() === "passkey") return "Clave de acceso";
    return "Bienvenido";
  };

  const description = () => {
    if (step() === "passkey") {
      return "Usa una clave de acceso configurada.";
    }
    if (step() === "totp") {
      return "Ingresa el código de 6 dígitos de tu aplicación.";
    }
    return undefined;
  };

  function requireUsername(): boolean {
    if (username().trim()) return true;
    showToast("error", "Ingresa tu usuario");
    return false;
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
        showToast("info", "Ahora ingresa el código de tu aplicación.");
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

  async function handlePasskeyLogin() {
    setPasskeyLoading(true);

    try {
      if (!isPasskeySupported()) {
        throw new Error("Este navegador no admite claves de acceso");
      }

      if (!username().trim()) {
        throw new Error("Ingresa tu usuario antes de usar la clave de acceso");
      }

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

  return (
    <AuthFlowShell title={title()} description={description()}>
      <div class={pageStyles.formStack}>
        <Input
          id="auth-username"
          type="text"
          name="username"
          placeholder="Usuario"
          autocomplete={step() === "passkey" ? "username webauthn" : "username"}
          value={username()}
          onInput={(e) => setUsername(e.currentTarget.value)}
          required
        />

        <Show when={step() === "init"}>
          <EnterTransition>
            <div class={pageStyles.formStack}>
              <Button
                type="button"
                class={styles.full}
                onClick={() => {
                  if (!requireUsername()) return;
                  setStep("password");
                }}
              >
                Continuar con contraseña
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
                Continuar con clave de acceso
              </Button>
            </div>
          </EnterTransition>
        </Show>

        <Show when={step() === "password"}>
          <EnterTransition>
            <form
              class={pageStyles.formStack}
              onSubmit={(e) => {
                void handlePasswordSubmit(e);
              }}
            >
              <div class={pageStyles.passwordFields}>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Contraseña"
                  autocomplete="current-password"
                  value={password()}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  required
                />
              </div>

              <div class={pageStyles.actionRow}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("init")}
                >
                  Atrás
                </Button>
                <Button type="submit" class={styles.full} loading={loading()}>
                  Continuar
                </Button>
              </div>
            </form>
          </EnterTransition>
        </Show>

        <Show when={step() === "totp"}>
          <EnterTransition>
            <form
              class={pageStyles.formStack}
              onSubmit={(e) => {
                void handleTotpSubmit(e);
              }}
            >
              <Input
                id="totp"
                type="text"
                name="totp"
                placeholder="Código de 6 dígitos"
                autocomplete="one-time-code"
                value={totpCode()}
                onInput={(e) => setTotpCode(e.currentTarget.value)}
                required
              />

              <div class={pageStyles.actionRow}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("password")}
                >
                  Atrás
                </Button>
                <Button type="submit" class={styles.full} loading={loading()}>
                  Ingresar
                </Button>
              </div>
            </form>
          </EnterTransition>
        </Show>

        <Show when={step() === "passkey"}>
          <EnterTransition>
            <div class={pageStyles.formStack}>
              <Show
                when={passkeySupport() === "supported"}
                fallback={
                  <p class={pageStyles.supportText}>
                    Este dispositivo o navegador no admite claves de acceso.
                  </p>
                }
              >
                <p class={pageStyles.supportText}>
                  Usa una clave de acceso configurada.
                </p>
              </Show>

              <div class={pageStyles.actionRow}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("init")}
                >
                  Atrás
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
                  Usar clave de acceso
                </Button>
              </div>
            </div>
          </EnterTransition>
        </Show>
      </div>
    </AuthFlowShell>
  );
}
