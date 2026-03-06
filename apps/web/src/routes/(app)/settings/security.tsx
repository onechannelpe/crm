import { Show, createSignal } from "solid-js";

import { changePassword } from "~/actions/settings";
import { PasskeyMethodCard } from "~/components/auth/passkey-method-card";
import { RecoveryCodesPanel } from "~/components/auth/recovery-codes-panel";
import { TotpMethodCard } from "~/components/auth/totp-method-card";
import { usePasskeyEnrollment } from "~/components/auth/use-passkey-enrollment";
import { useTotpEnrollment } from "~/components/auth/use-totp-enrollment";
import { useToast } from "~/components/feedback/toast-provider";
import { useSession } from "~/components/providers/session-provider";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { getErrorMessage } from "~/lib/errors";

import styles from "./settings-page.module.css";

export default function SecurityPage() {
  const { showToast } = useToast();
  const { currentUser, refreshCurrentUser } = useSession();

  const [currentPassword, setCurrentPassword] = createSignal("");
  const [newPassword, setNewPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [changingPassword, setChangingPassword] = createSignal(false);
  const passkeyEnrollment = usePasskeyEnrollment({
    showToast,
    refreshStatus: refreshCurrentUser,
    successMessage: "Clave de acceso añadida",
    failureMessage: "No se pudo añadir la clave de acceso",
  });
  const totpEnrollment = useTotpEnrollment({
    showToast,
    refreshStatus: refreshCurrentUser,
    verifySuccessMessage: "Autenticación en dos pasos activada",
  });

  const handleChangePassword = async (e: Event) => {
    e.preventDefault();
    if (newPassword() !== confirmPassword()) {
      showToast("error", "Las contraseñas no coinciden");
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(currentPassword(), newPassword());
      showToast("success", "Contraseña actualizada");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(err, "No se pudo cambiar la contraseña"),
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div class={styles.content}>
      <SettingsSection title="Cambiar contraseña">
        <form onSubmit={(e) => void handleChangePassword(e)}>
          <div class={styles.formGrid}>
            <Input
              type="password"
              label="Contraseña actual"
              value={currentPassword()}
              onInput={(e) => setCurrentPassword(e.currentTarget.value)}
              required
            />
            <Input
              type="password"
              label="Nueva contraseña"
              value={newPassword()}
              onInput={(e) => setNewPassword(e.currentTarget.value)}
              required
            />
            <Input
              type="password"
              label="Confirmar nueva contraseña"
              value={confirmPassword()}
              onInput={(e) => setConfirmPassword(e.currentTarget.value)}
              required
            />
          </div>
          <div class={styles.formActions}>
            <Button type="submit" disabled={changingPassword()}>
              {changingPassword() ? "Actualizando..." : "Actualizar contraseña"}
            </Button>
          </div>
        </form>
      </SettingsSection>

      <SettingsSection
        title="Protege tu cuenta"
        description="Administra por separado el acceso con clave de acceso y el segundo paso para el flujo con contraseña."
      >
        <div class={styles.securityStack}>
          <PasskeyMethodCard
            title="Claves de acceso"
            description="Administra cuántas claves tienes disponibles para entrar sin contraseña desde dispositivos compatibles."
            statusLabel={
              currentUser().hasPasskey
                ? `${currentUser().passkeyCount} configurada${currentUser().passkeyCount === 1 ? "" : "s"}`
                : passkeyEnrollment.supported()
                  ? "Sin configurar"
                  : "No compatible"
            }
            active={currentUser().hasPasskey}
            supported={passkeyEnrollment.supported()}
            loading={passkeyEnrollment.loading()}
            actionLabel={
              currentUser().hasPasskey ? "Añadir otra clave" : "Añadir clave"
            }
            note="El acceso con clave de acceso entra directo al espacio de trabajo, sin contraseña."
            unsupportedNote="Este navegador o dispositivo no admite claves de acceso."
            onAction={() => void passkeyEnrollment.registerPasskey()}
          />

          <TotpMethodCard
            title="Aplicación de autenticación"
            description="Configura códigos TOTP para el flujo de inicio de sesión con contraseña."
            statusLabel={
              currentUser().totpEnabled ? "Configurada" : "Sin configurar"
            }
            active={currentUser().totpEnabled}
            loading={totpEnrollment.loading()}
            actionLabel={
              currentUser().totpEnabled
                ? "Ya configurada"
                : "Configurar aplicación"
            }
            note="Si entras con contraseña en un rol protegido, este será el segundo paso requerido."
            code={totpEnrollment.code()}
            enrollment={totpEnrollment.enrollment()}
            onCodeInput={(event) =>
              totpEnrollment.setCode(event.currentTarget.value)
            }
            onBegin={() => void totpEnrollment.beginEnrollment()}
            onVerify={() => void totpEnrollment.verifyEnrollment()}
          />

          <Show when={totpEnrollment.recoveryCodes().length > 0}>
            <RecoveryCodesPanel
              title="Códigos de recuperación"
              description="Guárdalos ahora. Se muestran una sola vez y sirven como respaldo si pierdes acceso a tu aplicación."
              codes={totpEnrollment.recoveryCodes()}
            />
          </Show>
        </div>
      </SettingsSection>
    </div>
  );
}
