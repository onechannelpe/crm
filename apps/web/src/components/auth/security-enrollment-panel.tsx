import { type JSX, For, Show } from "solid-js";

import Phone from "~/components/icons/phone";
import ShieldCheck from "~/components/icons/shield-check";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";

import styles from "./security-enrollment-panel.module.css";

interface TotpEnrollmentState {
  qrCodeDataUrl: string;
  otpauthUri: string;
}

interface SecurityEnrollmentPanelProps {
  mode: "onboarding" | "settings";
  strongAuthRequired: boolean;
  strongAuthConfigured: boolean;
  passkeySupported: boolean;
  hasPasskey: boolean;
  passkeyCount: number;
  passkeyLoading: boolean;
  totpEnabled: boolean;
  totpLoading: boolean;
  totpCode: string;
  totpEnrollment: TotpEnrollmentState | null;
  recoveryCodes: string[];
  onTotpCodeInput: JSX.EventHandler<HTMLInputElement, InputEvent>;
  onRegisterPasskey: () => void;
  onBeginTotp: () => void;
  onVerifyTotp: () => void;
}

function getTotpSetupKey(otpauthUri: string): string {
  try {
    return new URL(otpauthUri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

export function SecurityEnrollmentPanel(props: SecurityEnrollmentPanelProps) {
  const setupKey = () => {
    const enrollment = props.totpEnrollment;
    if (!enrollment) return "";
    return getTotpSetupKey(enrollment.otpauthUri);
  };

  const bannerTitle = () => {
    if (props.strongAuthRequired) {
      return "Necesitas al menos un método fuerte para terminar la configuración.";
    }
    return "Recomendado: configura al menos un método fuerte ahora.";
  };

  const bannerText = () =>
    "La clave de acceso sirve para entrar directamente desde dispositivos compatibles. Si también inicias con contraseña, añade una aplicación de autenticación como respaldo.";

  return (
    <div class={styles.panel}>
      <div class={styles.banner}>
        <span class={styles.bannerTitle}>{bannerTitle()}</span>
        <span class={styles.bannerText}>{bannerText()}</span>
      </div>

      <div class={styles.methodGrid}>
        <article class={styles.methodCard}>
          <div class={styles.methodHeader}>
            <div class={styles.methodIcon}>
              <Phone size={18} />
            </div>
            <div class={styles.methodCopy}>
              <h3 class={styles.methodTitle}>Clave de acceso</h3>
              <p class={styles.methodDescription}>
                Usa biometría o el desbloqueo del dispositivo para entrar sin
                escribir un código adicional.
              </p>
            </div>
            <span
              classList={{
                [styles.statusPill]: true,
                [styles.statusPillSuccess]: props.hasPasskey,
              }}
            >
              {props.hasPasskey
                ? `${props.passkeyCount} configurada${props.passkeyCount === 1 ? "" : "s"}`
                : props.passkeySupported
                  ? "Disponible"
                  : "No compatible"}
            </span>
          </div>

          <div class={styles.methodActions}>
            <Button
              type="button"
              variant={props.hasPasskey ? "outline" : "primary"}
              disabled={!props.passkeySupported || props.passkeyLoading}
              loading={props.passkeyLoading}
              onClick={props.onRegisterPasskey}
            >
              {props.hasPasskey ? "Añadir otra clave" : "Configurar clave"}
            </Button>
            <Show when={!props.passkeySupported}>
              <p class={styles.methodHint}>
                Este navegador o dispositivo no admite claves de acceso.
              </p>
            </Show>
            <Show
              when={
                props.mode === "onboarding" &&
                props.strongAuthRequired &&
                props.strongAuthConfigured &&
                props.hasPasskey &&
                !props.totpEnabled
              }
            >
              <p class={styles.methodHint}>
                Si vuelves a entrar con contraseña, necesitarás esta clave de
                acceso o deberás añadir una aplicación de autenticación después.
              </p>
            </Show>
          </div>
        </article>

        <article class={styles.methodCard}>
          <div class={styles.methodHeader}>
            <div class={styles.methodIcon}>
              <ShieldCheck size={18} />
            </div>
            <div class={styles.methodCopy}>
              <h3 class={styles.methodTitle}>Aplicación de autenticación</h3>
              <p class={styles.methodDescription}>
                Genera códigos de 6 dígitos con Authy, 1Password, Microsoft
                Authenticator u otra aplicación compatible.
              </p>
            </div>
            <span
              classList={{
                [styles.statusPill]: true,
                [styles.statusPillSuccess]: props.totpEnabled,
              }}
            >
              {props.totpEnabled ? "Configurada" : "No configurada"}
            </span>
          </div>

          <div class={styles.methodActions}>
            <Button
              type="button"
              variant={props.totpEnabled ? "outline" : "primary"}
              disabled={props.totpEnabled || props.totpLoading}
              loading={props.totpLoading}
              onClick={props.onBeginTotp}
            >
              {props.totpEnabled ? "Ya configurada" : "Configurar aplicación"}
            </Button>
          </div>

          <Show when={props.totpEnrollment}>
            {(enrollment) => (
              <div class={styles.totpSetup}>
                <div class={styles.qrPanel}>
                  <img
                    src={enrollment().qrCodeDataUrl}
                    alt="Código QR para autenticación"
                    class={styles.qr}
                  />
                </div>
                <div class={styles.totpDetails}>
                  <p class={styles.methodHint}>
                    Escanea el código QR con tu aplicación.
                  </p>
                  <Show when={setupKey()}>
                    <div class={styles.setupKeyBlock}>
                      <span class={styles.setupKeyLabel}>
                        No puedes escanear?
                      </span>
                      <Input
                        type="text"
                        label="Clave manual"
                        value={setupKey()}
                        disabled
                      />
                    </div>
                  </Show>
                  <div class={styles.verifyRow}>
                    <Input
                      type="text"
                      label="Código de 6 dígitos"
                      placeholder="123456"
                      value={props.totpCode}
                      onInput={props.onTotpCodeInput}
                    />
                    <Button
                      type="button"
                      disabled={props.totpLoading}
                      onClick={props.onVerifyTotp}
                    >
                      Verificar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Show>
        </article>
      </div>

      <Show when={props.recoveryCodes.length > 0}>
        <div class={styles.recovery}>
          <div class={styles.recoveryHeader}>
            <h3 class={styles.recoveryTitle}>Códigos de recuperación</h3>
            <p class={styles.recoveryDescription}>
              Guárdalos ahora. Se muestran una sola vez y sirven como respaldo
              si pierdes acceso a tu aplicación.
            </p>
          </div>
          <div class={styles.recoveryList}>
            <For each={props.recoveryCodes}>
              {(code) => <div class={styles.mono}>{code}</div>}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
