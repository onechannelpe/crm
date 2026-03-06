import { Show, type JSX } from "solid-js";

import ShieldCheck from "~/components/icons/shield-check";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";

import type { TotpEnrollmentState } from "./use-totp-enrollment";

import styles from "./security-enrollment-panel.module.css";

interface TotpMethodCardProps {
  title: string;
  description: string;
  statusLabel: string;
  active: boolean;
  loading: boolean;
  actionLabel: string;
  note?: string;
  code: string;
  enrollment: TotpEnrollmentState | null;
  onCodeInput: JSX.EventHandler<HTMLInputElement, InputEvent>;
  onBegin: () => void;
  onVerify: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

function getSetupKey(otpauthUri: string): string {
  try {
    return new URL(otpauthUri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

export function TotpMethodCard(props: TotpMethodCardProps) {
  const setupKey = () => {
    const currentEnrollment = props.enrollment;
    if (!currentEnrollment) return "";
    return getSetupKey(currentEnrollment.otpauthUri);
  };

  return (
    <article class={styles.methodCard}>
      <div class={styles.methodHeader}>
        <div class={styles.methodIcon}>
          <ShieldCheck size={18} />
        </div>
        <div class={styles.methodCopy}>
          <h3 class={styles.methodTitle}>{props.title}</h3>
          <p class={styles.methodDescription}>{props.description}</p>
        </div>
        <span
          classList={{
            [styles.statusPill]: true,
            [styles.statusPillSuccess]: props.active,
          }}
        >
          {props.statusLabel}
        </span>
      </div>

      <div class={styles.methodActions}>
        <div class={styles.buttonRow}>
          <Button
            type="button"
            variant={props.active ? "outline" : "primary"}
            disabled={props.active || props.loading}
            loading={props.loading}
            onClick={props.onBegin}
          >
            {props.actionLabel}
          </Button>
          <Show when={props.secondaryActionLabel && props.onSecondaryAction}>
            <Button
              type="button"
              variant="ghost"
              disabled={props.loading}
              onClick={() => props.onSecondaryAction?.()}
            >
              {props.secondaryActionLabel}
            </Button>
          </Show>
        </div>
        <Show when={props.note}>
          {(note) => <p class={styles.methodHint}>{note()}</p>}
        </Show>
      </div>

      <Show when={props.enrollment}>
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
                  <span class={styles.setupKeyLabel}>No puedes escanear?</span>
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
                  value={props.code}
                  onInput={props.onCodeInput}
                />
                <Button
                  type="button"
                  disabled={props.loading}
                  onClick={props.onVerify}
                >
                  Verificar
                </Button>
              </div>
            </div>
          </div>
        )}
      </Show>
    </article>
  );
}
