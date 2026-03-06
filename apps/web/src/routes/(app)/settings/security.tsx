import { Show, createSignal } from "solid-js";

import {
  changePassword,
  disableTotp,
  removeAllPasskeys,
} from "~/actions/settings";
import { OtpSlotInput } from "~/components/auth/otp-slot-input";
import { RecoveryCodesPanel } from "~/components/auth/recovery-codes-panel";
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
    showToast("success", "Setup key copied");
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
          <div class={styles.configuredBlock}>
            <p class={styles.configuredTitle}>Passkeys</p>
            <p class={styles.configuredDescription}>
              Use your device to sign in.
            </p>
          </div>
          <Show
            when={passkeyEnrollment.supported()}
            fallback={
              <p class={styles.configuredDescription}>
                This device does not support passkeys.
              </p>
            }
          >
            <div class={styles.inlineActions}>
              <Button
                type="button"
                onClick={() => void passkeyEnrollment.registerPasskey()}
                disabled={passkeyEnrollment.loading()}
              >
                {currentUser().hasPasskey ? "Add passkey" : "Set up"}
              </Button>
              <Show when={currentUser().hasPasskey}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPendingAction("remove-passkeys");
                  }}
                >
                  Delete all
                </Button>
              </Show>
            </div>
          </Show>
        </div>
      </SettingsSection>

      <SettingsSection title="Two-Factor Authentication">
        <div class={styles.securityStack}>
          <Show
            when={!currentUser().totpEnabled}
            fallback={
              <div class={styles.block}>
                <p class={styles.title}>
                  Delete Two-Factor Authentication Method
                </p>
                <p class={styles.sectionDescription}>
                  Deleting this method will remove it permanently from your
                  account.
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
            <div class={styles.totpSetupBlock}>
              <div class={styles.block}>
                <p class={styles.title}>Authenticator app</p>
                <p class={styles.sectionDescription}>
                  Authenticator apps and browser extensions like 1Password,
                  Authy, Microsoft Authenticator, etc. generate one-time
                  passwords that are used as a second factor to verify your
                  identity when prompted during sign-in.
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
                    Set up
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
                            Can't scan? Copy the{" "}
                            <button
                              type="button"
                              class={styles.inlineLink}
                              onClick={() => {
                                void handleCopySetupKey(setupKey());
                              }}
                            >
                              setup key
                            </button>
                          </p>
                        )}
                      </Show>
                    </div>

                    <div class={styles.divider} />

                    <div class={styles.block}>
                      <p class={styles.title}>Verify the code from the app</p>
                      <p class={styles.sectionDescription}>
                        Copy paste the code below
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
                        Save
                      </Button>
                    </div>
                  </>
                )}
              </Show>
            </div>
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
