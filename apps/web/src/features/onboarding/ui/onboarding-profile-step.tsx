import { Show } from "solid-js";

import { Button } from "~/components/ui/input/button";
import type { Role } from "~/domain/auth/access/rbac";
import { getRoleLabel } from "~/domain/auth/access/role-display";
import { isValidPhone, normalizePhoneInput } from "~/domain/phone/pe-mobile";

import { OnboardingStepAnimatedItem } from "./onboarding-step-animated-item";
import { OnboardingStepHeading } from "./onboarding-step-heading";

import styles from "./onboarding-page.module.css";

const FORM_ID = "onboarding-profile-form";

interface OnboardingProfileStepProps {
  email: string;
  fullName: string;
  role: Role;
  phone: string;
  submitting: boolean;
  onPhoneInput: (value: string) => void;
  onSubmit: () => void;
}

export function OnboardingProfileStep(props: OnboardingProfileStepProps) {
  const phoneError = () => props.phone.length > 0 && !isValidPhone(props.phone);
  const canSubmit = () => isValidPhone(props.phone);

  return (
    <>
      <OnboardingStepHeading
        title="Confirma tus datos"
        subtitle="Revisa tu información y agrega tu número corporativo."
      />

      <form
        id={FORM_ID}
        class={styles.formContents}
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit()) props.onSubmit();
        }}
      >
        <OnboardingStepAnimatedItem index={2}>
          <div class={styles.profileGroups}>
            <div class={styles.profileGroup}>
              <div class={styles.infoList}>
                <Show
                  when={props.fullName.trim()}
                  fallback={
                    <div class={styles.infoRow}>
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
                  <span class={styles.infoValue}>
                    {getRoleLabel(props.role)}
                  </span>
                </div>
              </div>
              <p class={styles.groupHint}>
                Estos datos los gestiona el área de Recursos Humanos.
              </p>
            </div>

            <label class={styles.field}>
              <span class={styles.fieldLabel}>WhatsApp corporativo</span>
              <input
                class={styles.textInput}
                type="tel"
                placeholder="987654321"
                maxlength="9"
                value={props.phone}
                onInput={(event) =>
                  props.onPhoneInput(
                    normalizePhoneInput(event.currentTarget.value),
                  )
                }
                required
              />
              <Show when={phoneError()}>
                <p class={styles.fieldError}>
                  Ingresa 9 dígitos y que empiece con 9.
                </p>
              </Show>
            </label>
          </div>
        </OnboardingStepAnimatedItem>
      </form>

      <OnboardingStepAnimatedItem index={3} class={styles.actionBlock}>
        <Button
          type="submit"
          form={FORM_ID}
          class={styles.primaryButton}
          loading={props.submitting}
          disabled={!canSubmit()}
        >
          Continuar
        </Button>
      </OnboardingStepAnimatedItem>
    </>
  );
}
