import { Show } from "solid-js";

import { AuthFlowShell } from "~/components/auth/auth-flow-shell";
import { OtpSlotInput } from "~/components/auth/otp-slot-input";
import { EnterTransition } from "~/components/ui/animation/enter-transition";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { useLoginFlow } from "~/lib/auth/use-login-flow";

import styles from "../auth/auth-shell.module.css";
import pageStyles from "../auth/login-page.module.css";

export default function LoginPage() {
  const flow = useLoginFlow();

  const title = () => {
    if (flow.step() === "password") return "Contraseña";
    if (flow.step() === "totp") return "Código de verificación";
    if (flow.step() === "passkey") return "Clave de acceso";
    return "Iniciar sesión";
  };

  return (
    <AuthFlowShell
      title={title()}
      description={
        flow.step() === "totp"
          ? "Ingresa el código de 6 dígitos de tu app de autenticación."
          : undefined
      }
      footerNote={
        flow.step() === "password" ? (
          <a href="/reset-password" class={pageStyles.forgotLink}>
            ¿Olvidaste tu contraseña?
          </a>
        ) : undefined
      }
    >
      <div class={pageStyles.formStack}>
        <Show
          when={flow.step() !== "init"}
          fallback={
            <Input
              id="auth-username"
              type="text"
              name="username"
              placeholder="Usuario"
              autocomplete="username"
              value={flow.username()}
              onInput={(e) => flow.setUsername(e.currentTarget.value)}
              required
            />
          }
        >
          <div class={pageStyles.lockedIdentifier}>
            <span class={pageStyles.lockedUser}>{flow.username()}</span>
            <button
              type="button"
              class={pageStyles.changeUser}
              onClick={() => flow.setStep("init")}
            >
              Cambiar
            </button>
          </div>
        </Show>

        <Show when={flow.step() === "init"}>
          <EnterTransition>
            <div class={pageStyles.formStack}>
              <Button
                type="button"
                class={styles.full}
                onClick={flow.goToPassword}
              >
                Continuar con contraseña
              </Button>
              <Button
                type="button"
                variant="outline"
                class={styles.full}
                disabled={flow.passkeySupport() !== "supported"}
                onClick={flow.goToPasskey}
              >
                Continuar con clave de acceso
              </Button>
            </div>
          </EnterTransition>
        </Show>

        <Show when={flow.step() === "password"}>
          <EnterTransition>
            <form
              class={pageStyles.formStack}
              onSubmit={(e) => {
                void flow.handlePasswordSubmit(e);
              }}
            >
              <Input
                id="password"
                type="password"
                name="password"
                placeholder="Contraseña"
                autocomplete="current-password"
                value={flow.password()}
                onInput={(e) => flow.setPassword(e.currentTarget.value)}
                required
              />
              <div class={pageStyles.actionRow}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => flow.setStep("init")}
                >
                  Atrás
                </Button>
                <Button
                  type="submit"
                  class={styles.full}
                  loading={flow.loading()}
                >
                  Iniciar sesión
                </Button>
              </div>
            </form>
          </EnterTransition>
        </Show>

        <Show when={flow.step() === "totp"}>
          <EnterTransition>
            <form
              class={pageStyles.formStack}
              onSubmit={(e) => {
                void flow.handleTotpSubmit(e);
              }}
            >
              <OtpSlotInput
                value={flow.totpCode()}
                onValueChange={flow.setTotpCode}
              />
              <div class={pageStyles.actionRow}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => flow.setStep("password")}
                >
                  Atrás
                </Button>
                <Button
                  type="submit"
                  class={styles.full}
                  loading={flow.loading()}
                >
                  Iniciar sesión
                </Button>
              </div>
            </form>
          </EnterTransition>
        </Show>

        <Show when={flow.step() === "passkey"}>
          <EnterTransition>
            <div class={pageStyles.formStack}>
              <p class={pageStyles.supportText}>
                {flow.passkeyLoading()
                  ? "Esperando tu dispositivo..."
                  : flow.passkeySupport() === "unsupported"
                    ? "Este dispositivo no es compatible con claves de acceso."
                    : "Usa una clave de acceso registrada."}
              </p>
              <div class={pageStyles.actionRow}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => flow.setStep("init")}
                >
                  Atrás
                </Button>
                <Show
                  when={
                    flow.passkeySupport() === "supported" &&
                    !flow.passkeyLoading()
                  }
                >
                  <Button
                    type="button"
                    variant="outline"
                    class={styles.full}
                    onClick={() => {
                      void flow.triggerPasskeyLogin();
                    }}
                  >
                    Reintentar
                  </Button>
                </Show>
              </div>
            </div>
          </EnterTransition>
        </Show>
      </div>
    </AuthFlowShell>
  );
}
