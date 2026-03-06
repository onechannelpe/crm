import { useNavigate } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";

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

  onMount(() => {
    initializeThemeMode();
    setPasskeySupport(isPasskeySupported() ? "supported" : "unsupported");
  });

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
      title="Inicia sesión según tu método"
      description="Mantén un único flujo claro: contraseña para el acceso tradicional, o clave de acceso para entrar directo desde un dispositivo compatible."
      railNote="Si tu rol está protegido y eliges contraseña, el segundo paso es un código TOTP o uno de recuperación."
      progress={[
        {
          label: "Contraseña",
          description: "Usuario, contraseña y, cuando aplique, código TOTP.",
          state: "current",
        },
        {
          label: "Clave de acceso",
          description:
            "Acceso directo con biometría o desbloqueo del dispositivo.",
          state: "upcoming",
        },
      ]}
      contentEyebrow="Acceso"
      contentTitle="Elige cómo quieres entrar hoy"
      contentDescription="Usa el mismo usuario para ambos caminos. Si tu cuenta solo tiene passkeys, omite la contraseña y entra desde el panel dedicado."
    >
      <div class={pageStyles.methodGrid}>
        <form
          class={pageStyles.methodPanel}
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
        >
          <div class={pageStyles.methodHeader}>
            <div class={pageStyles.methodTitleRow}>
              <h2 class={pageStyles.methodTitle}>Entrar con contraseña</h2>
              <span class={pageStyles.pill}>Flujo clásico</span>
            </div>
            <p class={pageStyles.methodDescription}>
              Si tu rol requiere protección reforzada, deja listo aquí también
              el código TOTP o uno de recuperación.
            </p>
          </div>

          <div class={pageStyles.passwordFields}>
            <Input
              id="username"
              type="text"
              name="username"
              label="Usuario"
              autocomplete="username"
              value={username()}
              onInput={(e) => setUsername(e.currentTarget.value)}
              required
            />

            <Input
              id="password"
              type="password"
              name="password"
              label="Contraseña"
              autocomplete="current-password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              required
            />

            <Input
              id="totp"
              type="text"
              name="totp"
              label="Código TOTP o de recuperación"
              placeholder="Solo si tu cuenta lo pide"
              autocomplete="one-time-code"
              value={totpCode()}
              onInput={(e) => setTotpCode(e.currentTarget.value)}
            />
          </div>

          <p class={pageStyles.supportText}>
            Si tu cuenta tiene solo clave de acceso, este flujo te redirigirá a
            usar ese método.
          </p>

          <div class={pageStyles.panelFooter}>
            <Button type="submit" class={styles.full} loading={loading()}>
              Iniciar sesión
            </Button>
          </div>
        </form>

        <section class={pageStyles.methodPanel}>
          <div class={pageStyles.methodHeader}>
            <div class={pageStyles.methodTitleRow}>
              <h2 class={pageStyles.methodTitle}>Usar clave de acceso</h2>
              <span class={pageStyles.pill}>
                {passkeySupport() === "supported" ? "Compatible" : "Limitado"}
              </span>
            </div>
            <p class={pageStyles.methodDescription}>
              Este camino entra directo al espacio de trabajo sin contraseña.
              Solo necesitas indicar tu usuario para localizar el desafío
              correcto.
            </p>
          </div>

          <Input
            id="passkey-username"
            type="text"
            name="passkey-username"
            label="Usuario"
            autocomplete="username webauthn"
            value={username()}
            onInput={(e) => setUsername(e.currentTarget.value)}
            required
          />

          <Show
            when={passkeySupport() === "supported"}
            fallback={
              <p class={pageStyles.supportText}>
                Las claves de acceso no son compatibles con este dispositivo o
                navegador.
              </p>
            }
          >
            <p class={pageStyles.supportText}>
              Si ya configuraste una clave en esta cuenta, este es el botón que
              debes usar.
            </p>
          </Show>

          <div class={pageStyles.panelFooter}>
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
        </section>
      </div>
    </AuthFlowShell>
  );
}
