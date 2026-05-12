import { Show, createSignal } from "solid-js";

import {
  changePassword,
  disableTotp,
  removeAllPasskeys,
} from "~/actions/settings/security";
import { OtpSlotInput } from "~/features/auth/ui/otp-slot-input";
import { RecoveryCodesPanel } from "~/features/auth/security/recovery-codes-panel";
import { usePasskeyEnrollment } from "~/features/auth/security/use-passkey-enrollment";
import { useTotpEnrollment } from "~/features/auth/security/use-totp-enrollment";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { useAsyncAction } from "~/hooks/use-async-action";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { getErrorMessage } from "~/lib/errors";

import styles from "./security.module.css";
import base from "./settings-page.module.css";

function getSetupKey(otpauthUri: string): string {
  try {
    return new URL(otpauthUri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

export default function SecurityPage() {
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar, enqueueInfoSnackBar } =
    useSnackBar();
  const { currentUser, refreshCurrentUser } = useAuthenticatedSession();

  const [currentPassword, setCurrentPassword] = createSignal("");
  const [newPassword, setNewPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const removePasskeysDialog = useConfirmDialog();
  const disableTotpDialog = useConfirmDialog();
  const passkeyEnrollment = usePasskeyEnrollment({
    enqueueSuccessSnackBar,
    enqueueErrorSnackBar,
    refreshStatus: refreshCurrentUser,
    successMessage: "Clave de acceso añadida",
    failureMessage: "No se pudo añadir la clave de acceso",
  });
  const totpEnrollment = useTotpEnrollment({
    enqueueSuccessSnackBar,
    enqueueErrorSnackBar,
    enqueueInfoSnackBar,
    refreshStatus: refreshCurrentUser,
    verifySuccessMessage: "Autenticación en dos pasos activada",
  });
  const changePasswordFormId = "settings-security-change-password-form";

  const [doRemovePasskeys, isRemovingPasskeys] = useAsyncAction(async () => {
    try {
      await removeAllPasskeys();
      passkeyEnrollment.reset();
      await refreshCurrentUser();
      enqueueSuccessSnackBar("Claves de acceso eliminadas");
    } catch (err: unknown) {
      enqueueErrorSnackBar(
        getErrorMessage(err, "No se pudieron eliminar las claves de acceso"),
      );
    }
    removePasskeysDialog.close();
  });

  const [doDisableTotp, isDisablingTotp] = useAsyncAction(async () => {
    try {
      await disableTotp();
      totpEnrollment.reset();
      await refreshCurrentUser();
      enqueueSuccessSnackBar("Aplicación de autenticación desactivada");
    } catch (err: unknown) {
      enqueueErrorSnackBar(
        getErrorMessage(err, "No se pudo desactivar la autenticación TOTP"),
      );
    }
    disableTotpDialog.close();
  });

  const handleCopySetupKey = async (setupKey: string) => {
    await navigator.clipboard.writeText(setupKey);
    enqueueSuccessSnackBar("Clave de configuración copiada");
  };

  const [handleChangePassword, isChangingPassword] = useAsyncAction(
    async (e: Event) => {
      e.preventDefault();
      if (newPassword() !== confirmPassword()) {
        enqueueErrorSnackBar("Las contraseñas no coinciden");
        return;
      }
      try {
        await changePassword(currentPassword(), newPassword());
        enqueueSuccessSnackBar("Contraseña actualizada");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (err: unknown) {
        enqueueErrorSnackBar(
          getErrorMessage(err, "No se pudo cambiar la contraseña"),
        );
      }
    },
  );

  return (
    <>
      <ConfirmDialog
        isOpen={removePasskeysDialog.isOpen()}
        title="Eliminar claves de acceso"
        description="Se eliminarán todas las claves registradas en esta cuenta."
        confirmLabel="Eliminar"
        loading={isRemovingPasskeys()}
        onConfirm={() => void doRemovePasskeys()}
        onClose={removePasskeysDialog.close}
      />
      <ConfirmDialog
        isOpen={disableTotpDialog.isOpen()}
        title="Desactivar aplicación"
        description="Se desactivará el segundo paso con código para esta cuenta."
        confirmLabel="Desactivar"
        loading={isDisablingTotp()}
        onConfirm={() => void doDisableTotp()}
        onClose={disableTotpDialog.close}
      />

      <SettingsSection
        title="Cambiar contraseña"
        actions={
          <Button
            type="submit"
            form={changePasswordFormId}
            size="sm"
            variant="secondary"
            loading={isChangingPassword()}
          >
            Guardar
          </Button>
        }
      >
        <form
          id={changePasswordFormId}
          onSubmit={(e) => void handleChangePassword(e)}
        >
          <div class={base.formGrid}>
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
        </form>
      </SettingsSection>

      <SettingsSection title="Claves de acceso">
        <div class={styles.securityStack}>
          <div class={styles.configuredBlock}>
            <p class={styles.configuredTitle}>Claves de acceso</p>
            <p class={styles.configuredDescription}>
              Usa tu dispositivo para iniciar sesión.
            </p>
          </div>
          <Show
            when={passkeyEnrollment.supported()}
            fallback={
              <p class={styles.configuredDescription}>
                Este dispositivo no es compatible con claves de acceso.
              </p>
            }
          >
            <div class={styles.inlineActions}>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void passkeyEnrollment.registerPasskey()}
                disabled={passkeyEnrollment.loading()}
              >
                {currentUser().hasPasskey
                  ? "Agregar clave de acceso"
                  : "Configurar"}
              </Button>
              <Show when={currentUser().hasPasskey}>
                <button
                  type="button"
                  class={styles.inlineLink}
                  onClick={removePasskeysDialog.open}
                  disabled={passkeyEnrollment.loading()}
                >
                  Eliminar todas
                </button>
              </Show>
            </div>
          </Show>
        </div>
      </SettingsSection>

      <SettingsSection title="Autenticación en dos pasos">
        <div class={styles.securityStack}>
          <Show
            when={!currentUser().totpEnabled}
            fallback={
              <div class={styles.block}>
                <p class={styles.title}>Aplicación configurada</p>
                <p class={styles.sectionDescription}>
                  Puedes volver a configurarla cuando lo necesites.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={disableTotpDialog.open}
                >
                  Restablecer
                </Button>
              </div>
            }
          >
            <div class={styles.totpSetupBlock}>
              <div class={styles.block}>
                <p class={styles.title}>Aplicación de autenticación</p>
                <p class={styles.sectionDescription}>
                  Genera códigos temporales para confirmar tu acceso.
                </p>
              </div>

              <Show
                when={totpEnrollment.enrollment()}
                fallback={
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void totpEnrollment.beginEnrollment()}
                    disabled={totpEnrollment.loading()}
                  >
                    Configurar
                  </Button>
                }
              >
                {(enrollment) => (
                  <>
                    <div class={styles.qrBlock}>
                      <div class={styles.qrFrame}>
                        <img
                          src={enrollment().qrCodeDataUrl}
                          alt="QR code for authenticator app"
                          class={styles.qrImage}
                        />
                      </div>
                      <Show when={getSetupKey(enrollment().otpauthUri)}>
                        {(setupKey) => (
                          <p class={styles.qrCopy}>
                            ¿No puedes escanearlo? Copia la{" "}
                            <button
                              type="button"
                              class={styles.inlineLink}
                              onClick={() => {
                                void handleCopySetupKey(setupKey());
                              }}
                            >
                              clave manual
                            </button>
                          </p>
                        )}
                      </Show>
                    </div>

                    <div class={styles.divider} />

                    <div class={styles.block}>
                      <p class={styles.title}>
                        Ingresa el código de verificación
                      </p>
                    </div>
                    <div class={styles.verifyBlock}>
                      <OtpSlotInput
                        value={totpEnrollment.code()}
                        disabled={totpEnrollment.loading()}
                        onValueChange={totpEnrollment.setCode}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => void totpEnrollment.verifyEnrollment()}
                        disabled={totpEnrollment.loading()}
                      >
                        Guardar
                      </Button>
                    </div>
                  </>
                )}
              </Show>
            </div>
          </Show>

          <Show when={totpEnrollment.recoveryCodes().length > 0}>
            <RecoveryCodesPanel
              title="Códigos de recuperación"
              description="Guárdalos en un lugar seguro."
              codes={totpEnrollment.recoveryCodes()}
            />
          </Show>
        </div>
      </SettingsSection>
    </>
  );
}
