import { Show, createSignal } from "solid-js";

import {
  changePassword,
  disableTotp,
  removeAllPasskeys,
} from "~/actions/settings";
import { PasskeyMethodCard } from "~/components/auth/passkey-method-card";
import { RecoveryCodesPanel } from "~/components/auth/recovery-codes-panel";
import { TotpMethodCard } from "~/components/auth/totp-method-card";
import { usePasskeyEnrollment } from "~/components/auth/use-passkey-enrollment";
import { useTotpEnrollment } from "~/components/auth/use-totp-enrollment";
import { useToast } from "~/components/feedback/toast-provider";
import { useSession } from "~/components/providers/session-provider";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
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
  const [pendingAction, setPendingAction] = createSignal<
    "remove-passkeys" | "disable-totp" | null
  >(null);
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

  const handleRemoveAllPasskeys = async () => {
    try {
      await removeAllPasskeys();
      passkeyEnrollment.reset();
      await refreshCurrentUser();
      showToast("success", "Claves de acceso eliminadas");
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(err, "No se pudieron eliminar las claves de acceso"),
      );
    }
  };

  const handleDisableTotp = async () => {
    try {
      await disableTotp();
      totpEnrollment.reset();
      await refreshCurrentUser();
      showToast("success", "Aplicación de autenticación desactivada");
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(err, "No se pudo desactivar la autenticación TOTP"),
      );
    }
  };

  const handleConfirmPendingAction = async () => {
    const action = pendingAction();
    setPendingAction(null);

    if (action === "remove-passkeys") {
      await handleRemoveAllPasskeys();
      return;
    }
    if (action === "disable-totp") {
      await handleDisableTotp();
    }
  };

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
      <ConfirmDialog
        isOpen={pendingAction() !== null}
        title={
          pendingAction() === "remove-passkeys"
            ? "Eliminar todas las claves de acceso"
            : "Desactivar aplicación de autenticación"
        }
        description={
          pendingAction() === "remove-passkeys"
            ? "Eliminarás todas las claves registradas en esta cuenta. Si tu rol exige seguridad reforzada, solo podrás hacerlo si otro método fuerte sigue activo."
            : "Desactivarás el segundo paso del flujo con contraseña. Si tu rol exige seguridad reforzada, solo podrás hacerlo si aún mantienes otro método fuerte."
        }
        confirmLabel={
          pendingAction() === "remove-passkeys"
            ? "Eliminar claves"
            : "Desactivar TOTP"
        }
        onConfirm={() => {
          void handleConfirmPendingAction();
        }}
        onClose={() => setPendingAction(null)}
      />

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
        description="Gestiona tus métodos con la misma lógica del inicio de sesión: la clave de acceso entra directo, y TOTP protege el flujo con contraseña."
      >
        <div class={styles.securityStack}>
          <div class={styles.securitySummary}>
            <article class={styles.securitySummaryCard}>
              <span class={styles.securitySummaryLabel}>Política actual</span>
              <strong class={styles.securitySummaryValue}>
                {currentUser().strongAuthRequired
                  ? "Método fuerte obligatorio"
                  : "Método fuerte opcional"}
              </strong>
              <p class={styles.sectionDescription}>
                {currentUser().strongAuthRequired
                  ? "Antes de quitar un método, mantén otro activo para no bloquear tu acceso."
                  : "Puedes dejar uno o ambos métodos activos según prefieras."}
              </p>
            </article>
            <article class={styles.securitySummaryCard}>
              <span class={styles.securitySummaryLabel}>Estado actual</span>
              <strong class={styles.securitySummaryValue}>
                {currentUser().hasPasskey || currentUser().totpEnabled
                  ? "Cuenta protegida"
                  : "Sin métodos configurados"}
              </strong>
              <p class={styles.sectionDescription}>
                {currentUser().hasPasskey
                  ? `${currentUser().passkeyCount} clave${currentUser().passkeyCount === 1 ? "" : "s"} de acceso activa${currentUser().passkeyCount === 1 ? "" : "s"}`
                  : "Ninguna clave de acceso configurada"}
                {currentUser().totpEnabled
                  ? " y aplicación de autenticación activa."
                  : "."}
              </p>
            </article>
          </div>

          <PasskeyMethodCard
            title="Claves de acceso"
            description="Añade o elimina las claves que usas para entrar sin contraseña desde dispositivos compatibles."
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
            secondaryActionLabel={
              currentUser().hasPasskey ? "Eliminar todas" : undefined
            }
            onSecondaryAction={
              currentUser().hasPasskey
                ? () => {
                    setPendingAction("remove-passkeys");
                  }
                : undefined
            }
          />

          <TotpMethodCard
            title="Aplicación de autenticación"
            description="Configura o desactiva los códigos TOTP del flujo de inicio de sesión con contraseña."
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
            secondaryActionLabel={
              currentUser().totpEnabled ? "Desactivar" : undefined
            }
            onSecondaryAction={
              currentUser().totpEnabled
                ? () => {
                    setPendingAction("disable-totp");
                  }
                : undefined
            }
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
