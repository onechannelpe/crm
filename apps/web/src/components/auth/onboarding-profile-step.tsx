import Phone from "~/components/icons/phone";
import UserRound from "~/components/icons/user-round";
import { Input } from "~/components/ui/input/input";
import type { Role } from "~/lib/auth/access/rbac";
import { getRoleLabel } from "~/lib/auth/access/role-display";

import styles from "~/routes/onboarding-page.module.css";

interface OnboardingProfileStepProps {
  email: string;
  fullName: string;
  phone: string;
  role: Role;
  onPhoneInput: (value: string) => void;
}

export function OnboardingProfileStep(props: OnboardingProfileStepProps) {
  return (
    <section class={styles.stepStack}>
      <div class={styles.stepIntro}>
        <div class={styles.stepIntroIcon}>
          <UserRound size={16} />
        </div>
        <div class={styles.stepIntroCopy}>
          <p class={styles.kicker}>Invitación</p>
          <h3 class={styles.sectionTitle}>Tus datos ya están listos</h3>
          <p class={styles.sectionDescription}>
            No necesitas volver a escribir tu nombre, correo o rol. Solo
            confirma el WhatsApp corporativo que usaremos como contacto
            principal.
          </p>
        </div>
      </div>

      <div class={styles.formStack}>
        <Input
          type="text"
          label="Nombre completo"
          value={props.fullName}
          disabled
        />
        <Input
          id="onboarding-email"
          type="email"
          label="Correo corporativo"
          value={props.email}
          disabled
        />
        <Input
          type="text"
          label="Rol"
          value={getRoleLabel(props.role)}
          disabled
        />
        <Input
          id="onboarding-phone"
          type="tel"
          label="WhatsApp corporativo"
          placeholder="+51987654321"
          value={props.phone}
          onInput={(event) => props.onPhoneInput(event.currentTarget.value)}
          required
        />
      </div>

      <div class={styles.helperCopy}>
        <div class={styles.helperHeader}>
          <Phone size={16} />
          <span>Formato esperado</span>
        </div>
        <p class={styles.helperText}>
          Usa el número en formato internacional E.164, por ejemplo `
          +51987654321 `. Lo guardaremos como tu canal principal de WhatsApp.
        </p>
      </div>
    </section>
  );
}
