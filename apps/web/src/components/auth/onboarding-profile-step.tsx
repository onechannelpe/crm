import UserRound from "~/components/icons/user-round";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import type { Role } from "~/lib/auth/access/rbac";
import { getRoleLabel } from "~/lib/auth/access/role-display";

import authStyles from "~/routes/auth/auth-shell.module.css";
import styles from "~/routes/onboarding-page.module.css";

interface OnboardingProfileStepProps {
  email: string;
  fullName: string;
  phone: string;
  role: Role;
  onContinue: () => void;
  onPhoneInput: (value: string) => void;
}

export function OnboardingProfileStep(props: OnboardingProfileStepProps) {
  return (
    <section class={styles.card}>
      <div class={styles.cardHeader}>
        <div class={styles.cardHeaderCopy}>
          <span class={styles.cardStep}>Paso 1</span>
          <h2 class={styles.cardTitle}>Perfil</h2>
          <p class={styles.cardDescription}>
            Los datos de identidad y rol vienen desde la invitación. Solo
            necesitamos confirmar tu contacto principal.
          </p>
        </div>
        <div class={styles.cardIcon}>
          <UserRound size={18} />
        </div>
      </div>

      <div class={styles.identityGrid}>
        <Input type="text" label="Nombre" value={props.fullName} disabled />
        <Input
          type="text"
          label="Rol"
          value={getRoleLabel(props.role)}
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
          id="onboarding-phone"
          type="tel"
          label="WhatsApp corporativo"
          placeholder="+51987654321"
          value={props.phone}
          onInput={(event) => props.onPhoneInput(event.currentTarget.value)}
          required
        />
      </div>

      <div class={styles.footer}>
        <p class={styles.footerCopy}>
          El siguiente paso define cómo vas a proteger el acceso a tu cuenta.
        </p>
        <div class={styles.footerActions}>
          <Button
            type="button"
            class={authStyles.full}
            onClick={props.onContinue}
          >
            Continuar a seguridad
          </Button>
        </div>
      </div>
    </section>
  );
}
