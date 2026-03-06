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

      <SettingsSection title="Passkeys">
        <div class={styles.securityStack}>
          <PasskeyMethodCard
            title="Passkeys"
            description="Use your device to sign in."
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
            actionLabel={currentUser().hasPasskey ? "Add passkey" : "Set up"}
            unsupportedNote="This device does not support passkeys."
            onAction={() => void passkeyEnrollment.registerPasskey()}
            secondaryActionLabel={
              currentUser().hasPasskey ? "Delete all" : undefined
            }
            onSecondaryAction={
              currentUser().hasPasskey
                ? () => {
                    setPendingAction("remove-passkeys");
                  }
                : undefined
            }
          />
        </div>
      </SettingsSection>

      <SettingsSection title="Two-Factor Authentication">
        <div class={styles.securityStack}>
          <Show
            when={!currentUser().totpEnabled}
            fallback={
              <div class={styles.configuredBlock}>
                <p class={styles.configuredTitle}>
                  Authenticator app configured
                </p>
                <p class={styles.configuredDescription}>
                  Delete this method to reset it.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPendingAction("disable-totp");
                  }}
                >
                  Reset 2FA
                </Button>
              </div>
            }
          >
            <TotpMethodCard
              title="Authenticator app"
              description="Use a 6-digit code during sign in."
              statusLabel="Setup"
              active={false}
              loading={totpEnrollment.loading()}
              actionLabel="Set up"
              code={totpEnrollment.code()}
              enrollment={totpEnrollment.enrollment()}
              onCodeInput={(event) =>
                totpEnrollment.setCode(event.currentTarget.value)
              }
              onBegin={() => void totpEnrollment.beginEnrollment()}
              onVerify={() => void totpEnrollment.verifyEnrollment()}
            />
          </Show>

          <Show when={totpEnrollment.recoveryCodes().length > 0}>
            <RecoveryCodesPanel
              title="Recovery codes"
              description="Save these codes now."
              codes={totpEnrollment.recoveryCodes()}
            />
          </Show>
        </div>
      </SettingsSection>
    </div>
  );
}
