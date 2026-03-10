import { Show } from "solid-js";

import type { Role } from "~/lib/auth/access/rbac";
import { getRoleLabel } from "~/lib/auth/access/role-display";
import { isValidOnboardingPhone } from "~/lib/auth/onboarding-flow";

import styles from "~/routes/onboarding-page.module.css";

interface OnboardingProfileStepProps {
  email: string;
  fullName: string;
  phone: string;
  role: Role;
  onPhoneInput: (value: string) => void;
}

export function OnboardingProfileStep(props: OnboardingProfileStepProps) {
  const phoneError = () =>
    props.phone.length > 0 && !isValidOnboardingPhone(props.phone);

  return (
    <section class={styles.stepStack}>
      <p class={styles.confirmHint}>
        Verifica que tus datos sean correctos. Para cambios de nombre o correo,
        contacta a RR.HH.
      </p>

      <div class={styles.infoList}>
        <Show
          when={props.fullName.trim()}
          fallback={
            <div class={styles.infoRowMissing}>
              <span class={styles.infoKey}>Nombre</span>
              <span class={styles.infoValueMissing}>
                No registrado. Contacta a RR.HH.
              </span>
            </div>
          }
        >
          <div class={styles.infoRow}>
            <span class={styles.infoKey}>Nombre</span>
            <span class={styles.infoValue}>{props.fullName}</span>
          </div>
        </Show>
        <div class={styles.infoRow}>
          <span class={styles.infoKey}>Correo</span>
          <span class={styles.infoValue}>{props.email}</span>
        </div>
        <div class={styles.infoRow}>
          <span class={styles.infoKey}>Rol</span>
          <span class={styles.infoValue}>{getRoleLabel(props.role)}</span>
        </div>
      </div>

      {/* Phone is the only new field the user provides in this step */}
      <div class={styles.phoneField}>
        <label class={styles.phoneLabel}>
          <span class={styles.phoneLabelText}>WhatsApp corporativo</span>
          <div class={styles.phoneRow}>
            <span class={styles.phonePrefix}>+51</span>
            <input
              id="onboarding-phone"
              type="tel"
              class={styles.phoneInput}
              placeholder="987654321"
              maxlength="9"
              value={props.phone}
              onInput={(e) => props.onPhoneInput(e.currentTarget.value)}
              required
            />
          </div>
        </label>
        <Show when={phoneError()}>
          <p class={styles.helperTextError}>
            Ingresa los 9 dígitos del número.
          </p>
        </Show>
      </div>
    </section>
  );
}
