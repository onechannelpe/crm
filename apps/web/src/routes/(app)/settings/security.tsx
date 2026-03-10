import { Show, createSignal } from "solid-js";

import {
  changePassword,
  disableTotp,
  removeAllPasskeys,
} from "~/actions/settings";
import { OtpSlotInput } from "~/components/auth/flow/otp-slot-input";
import { RecoveryCodesPanel } from "~/components/auth/security-enrollment/recovery-codes-panel";
import { usePasskeyEnrollment } from "~/components/auth/security-enrollment/use-passkey-enrollment";
import { useTotpEnrollment } from "~/components/auth/security-enrollment/use-totp-enrollment";
import { useToast } from "~/components/feedback/toast-provider";
import { useSession } from "~/components/providers/session-provider";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { getErrorMessage } from "~/lib/errors";

import styles from "./settings-page.module.css";

function getSetupKey(otpauthUri: string): string {
  try {
    return new URL(otpauthUri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

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

  const handleCopySetupKey = async (setupKey: string) => {
    await navigator.clipboard.writeText(setupKey);
    showToast("success", "Clave de configuración copiada");
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
            ? "Eliminar claves de acceso"
            : "Desactivar aplicación"
        }
        description={
          pendingAction() === "remove-passkeys"
            ? "Se eliminarán todas las claves registradas en esta cuenta."
            : "Se desactivará el segundo paso con código para esta cuenta."
        }
        confirmLabel={
          pendingAction() === "remove-passkeys" ? "Eliminar" : "Desactivar"
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
                onClick={() => void passkeyEnrollment.registerPasskey()}
                disabled={passkeyEnrollment.loading()}
              >
                {currentUser().hasPasskey
                  ? "Agregar clave de acceso"
                  : "Configurar"}
              </Button>
              <Show when={currentUser().hasPasskey}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPendingAction("remove-passkeys");
                  }}
                >
                  Eliminar todas
                </Button>
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
                  variant="outline"
                  onClick={() => {
                    setPendingAction("disable-totp");
                  }}
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
    </div>
  );
}
