import { useNavigate } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";

import { beginPasskeyLogin, finishPasskeyLogin } from "~/actions/auth";
import { login } from "~/actions/auth";
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

export default function LoginPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [totpCode, setTotpCode] = createSignal("");
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
    setLoading(true);

    try {
      const result = await login(email(), password(), totpCode());
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
    <div class={styles.shell}>
      <div class={`${styles.panel} ${styles.panelSm}`}>
        <div class={styles.stack1}>
          <p class={styles.eyebrow}>One Channel</p>
          <h1 class={styles.titleSm}>Iniciar sesión</h1>
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
            label="Correo"
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
            required
          />

          <Input
            id="password"
            type="password"
            label="Contraseña"
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
                Tengo un código de verificación
              </button>
            }
          >
            <div class={styles.reveal}>
              <Input
                id="totp"
                type="text"
                label="Código TOTP o de recuperación"
                placeholder="Opcional"
                value={totpCode()}
                onInput={(e) => setTotpCode(e.currentTarget.value)}
              />
            </div>
          </Show>

          <div class={styles.stack2}>
            <Button type="submit" class={styles.full} loading={loading()}>
              Iniciar sesión
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

          <Show when={passkeySupport() === "unsupported"}>
            <p class={styles.muted}>
              Las claves de acceso no son compatibles con este dispositivo.
            </p>
          </Show>
        </form>
      </div>
    </div>
  );
}
