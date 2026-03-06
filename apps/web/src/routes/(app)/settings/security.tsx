import { createSignal } from "solid-js";

import { changePassword } from "~/actions/settings";
import { SecurityEnrollmentPanel } from "~/components/auth/security-enrollment-panel";
import { useSecurityEnrollmentController } from "~/components/auth/use-security-enrollment-controller";
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
  const enrollment = useSecurityEnrollmentController({
    showToast,
    refreshStatus: refreshCurrentUser,
    messages: {
      passkeySuccess: "Clave de acceso añadida",
      passkeyFailure: "No se pudo añadir la clave de acceso",
      totpVerifySuccess: "Autenticación en dos pasos activada",
    },
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

      <SettingsSection title="Protege tu cuenta">
        <SecurityEnrollmentPanel
          mode="settings"
          strongAuthRequired={currentUser().strongAuthRequired}
          strongAuthConfigured={currentUser().strongAuthConfigured}
          passkeySupported={enrollment.passkeySupported()}
          hasPasskey={currentUser().hasPasskey}
          passkeyCount={currentUser().passkeyCount}
          passkeyLoading={enrollment.passkeyLoading()}
          totpEnabled={currentUser().totpEnabled}
          totpLoading={enrollment.totpLoading()}
          totpCode={enrollment.totpCode()}
          totpEnrollment={enrollment.totpEnrollment()}
          recoveryCodes={enrollment.recoveryCodes()}
          onTotpCodeInput={(event) =>
            enrollment.setTotpCode(event.currentTarget.value)
          }
          onRegisterPasskey={() => void enrollment.registerPasskey()}
          onBeginTotp={() => void enrollment.beginTotp()}
          onVerifyTotp={() => void enrollment.verifyTotp()}
        />
      </SettingsSection>
    </div>
  );
}
