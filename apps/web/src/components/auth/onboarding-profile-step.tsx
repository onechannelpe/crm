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
      <div class={styles.formStack}>
        <Input
          type="text"
          placeholder="Nombre completo"
          value={props.fullName}
          disabled
        />
        <Input
          id="onboarding-email"
          type="email"
          placeholder="Correo corporativo"
          value={props.email}
          disabled
        />
        <Input
          type="text"
          placeholder="Rol"
          value={getRoleLabel(props.role)}
          disabled
        />
        <Input
          id="onboarding-phone"
          type="tel"
          placeholder="+51987654321"
          value={props.phone}
          onInput={(event) => props.onPhoneInput(event.currentTarget.value)}
          required
        />
      </div>

      <p class={styles.helperText}>
        Usa formato E.164, por ejemplo +51987654321.
      </p>
    </section>
  );
}
