import { Show } from "solid-js";

import type { CurrentUser } from "~/actions/auth";
import { PasskeyMethodCard } from "~/components/auth/passkey-method-card";
import { RecoveryCodesPanel } from "~/components/auth/recovery-codes-panel";
import { TotpMethodCard } from "~/components/auth/totp-method-card";
import type { usePasskeyEnrollment } from "~/components/auth/use-passkey-enrollment";
import type { useTotpEnrollment } from "~/components/auth/use-totp-enrollment";
import { getSecurityStepDescription } from "~/lib/auth/onboarding-flow";

import styles from "~/routes/onboarding-page.module.css";

interface OnboardingSecurityStepProps {
  currentUser: Pick<
    CurrentUser,
    "hasPasskey" | "passkeyCount" | "passwordLoginPolicy" | "totpEnabled"
  >;
  passkeyEnrollment: ReturnType<typeof usePasskeyEnrollment>;
  totpEnrollment: ReturnType<typeof useTotpEnrollment>;
}

export function OnboardingSecurityStep(props: OnboardingSecurityStepProps) {
  return (
    <section class={styles.stepStack}>
      <div class={styles.highlightCard}>
        <p class={styles.highlightTitle}>
          Elige cómo quieres proteger el acceso
        </p>
        <p class={styles.highlightCopy}>
          {getSecurityStepDescription(props.currentUser.passwordLoginPolicy)}
        </p>
      </div>

      <div class={styles.securityGrid}>
        <PasskeyMethodCard
          title="Clave de acceso"
          description="Usa biometría o el desbloqueo del dispositivo para entrar sin contraseña desde dispositivos compatibles."
          statusLabel={
            props.currentUser.hasPasskey
              ? `${props.currentUser.passkeyCount} configurada${props.currentUser.passkeyCount === 1 ? "" : "s"}`
              : props.passkeyEnrollment.supported()
                ? "Disponible"
                : "No compatible"
          }
          active={props.currentUser.hasPasskey}
          supported={props.passkeyEnrollment.supported()}
          loading={props.passkeyEnrollment.loading()}
          actionLabel={
            props.currentUser.hasPasskey
              ? "Añadir otra clave"
              : "Configurar clave"
          }
          note={
            props.currentUser.passwordLoginPolicy === "passkey_only"
              ? "Con tu clave de acceso ya puedes terminar esta configuración."
              : "Las claves de acceso son ideales para entrar sin contraseña."
          }
          unsupportedNote="Este navegador o dispositivo no admite claves de acceso."
          onAction={() => {
            void props.passkeyEnrollment.registerPasskey();
          }}
        />

        <TotpMethodCard
          title="Aplicación de autenticación"
          description="Genera códigos de 6 dígitos con Authy, 1Password, Microsoft Authenticator u otra aplicación compatible."
          statusLabel={
            props.currentUser.totpEnabled ? "Configurada" : "No configurada"
          }
          active={props.currentUser.totpEnabled}
          loading={props.totpEnrollment.loading()}
          actionLabel={
            props.currentUser.totpEnabled
              ? "Ya configurada"
              : "Configurar aplicación"
          }
          note="Si eliges entrar con contraseña en un rol protegido, este será el segundo paso."
          code={props.totpEnrollment.code()}
          enrollment={props.totpEnrollment.enrollment()}
          onCodeInput={(event) =>
            props.totpEnrollment.setCode(event.currentTarget.value)
          }
          onBegin={() => {
            void props.totpEnrollment.beginEnrollment();
          }}
          onVerify={() => {
            void props.totpEnrollment.verifyEnrollment();
          }}
        />
      </div>

      <Show when={props.totpEnrollment.recoveryCodes().length > 0}>
        <RecoveryCodesPanel
          title="Códigos de recuperación"
          description="Guárdalos ahora. Se muestran una sola vez y sirven como respaldo si pierdes acceso a tu aplicación."
          codes={props.totpEnrollment.recoveryCodes()}
        />
      </Show>
    </section>
  );
}
