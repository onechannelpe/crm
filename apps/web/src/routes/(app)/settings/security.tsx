import { Show, Suspense, createResource, createSignal } from "solid-js";

import {
  acknowledgeRecoveryCodes,
  getRecoveryCodesStatus,
  regenerateRecoveryCodes,
} from "~/actions/auth/recovery-codes";
import {
  changePassword,
  disableTotp,
  removeAllPasskeys,
} from "~/actions/settings/security";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { RecoveryCodesPanel } from "~/features/auth/security/recovery-codes-panel";
import { usePasskeyEnrollment } from "~/features/auth/security/use-passkey-enrollment";
import { useTotpEnrollment } from "~/features/auth/security/use-totp-enrollment";
import { OtpSlotInput } from "~/features/auth/ui/otp-slot-input";
import { useAsyncAction } from "~/hooks/use-async-action";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { actionErrorMessage } from "~/lib/wire-error";

import styles from "./security.module.css";
import base from "./settings-page.module.css";

const CHANGE_PASSWORD_FORM_ID = "settings-security-change-password-form";

function getSetupKey(otpauthUri: string): string {
  try {
    return new URL(otpauthUri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

function TotpEnrollmentPanel(props: {
  totp: ReturnType<typeof useTotpEnrollment>;
  onCopySetupKey: (setupKey: string) => void;
}) {
  return (
    <Show
      when={props.totp.enrollment()}
      fallback={
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void props.totp.beginEnrollment()}
          disabled={props.totp.loading()}
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
                alt="Código QR para la aplicación de autenticación"
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
                    onClick={() => props.onCopySetupKey(setupKey())}
                  >
                    clave manual
                  </button>
                </p>
              )}
            </Show>
          </div>

          <div class={styles.divider} />

          <div class={styles.block}>
            <p class={styles.title}>Ingresa el código de verificación</p>
          </div>
          <div class={styles.verifyBlock}>
            <OtpSlotInput
              value={props.totp.code()}
              disabled={props.totp.loading()}
              onValueChange={props.totp.setCode}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void props.totp.verifyEnrollment()}
              disabled={props.totp.loading()}
            >
              Guardar
            </Button>
          </div>
        </>
      )}
    </Show>
  );
}

export default function SecurityPage() {
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const { currentUser, refreshCurrentUser } = useAuthenticatedSession();

  const [currentPassword, setCurrentPassword] = createSignal("");
  const [newPassword, setNewPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const removePasskeysDialog = useConfirmDialog();
  const disableTotpDialog = useConfirmDialog();
  const regenerateRecoveryDialog = useConfirmDialog();
  const [recoveryStatus, { refetch: refetchRecoveryStatus }] = createResource(
    getRecoveryCodesStatus,
  );
  // Keep newly issued codes visible until acknowledgement; stored codes are
  // never returned.
  const [freshRecoveryCodes, setFreshRecoveryCodes] = createSignal<string[]>(
    [],
  );

  function showFreshRecoveryCodes(codes: string[]) {
    setFreshRecoveryCodes(codes);
    void refetchRecoveryStatus();
  }

  const passkeyEnrollment = usePasskeyEnrollment({
    enqueueSuccessSnackBar,
    enqueueErrorSnackBar,
    refreshStatus: refreshCurrentUser,
    onRecoveryCodes: showFreshRecoveryCodes,
  });
  const totpEnrollment = useTotpEnrollment({
    enqueueSuccessSnackBar,
    enqueueErrorSnackBar,
    refreshStatus: refreshCurrentUser,
    onRecoveryCodes: showFreshRecoveryCodes,
  });
  const [handleRemovePasskeys, isRemovingPasskeys] = useAsyncAction(
    async () => {
      try {
        const { message } = await removeAllPasskeys();
        await refreshCurrentUser();
        enqueueSuccessSnackBar(message);
      } catch (caught: unknown) {
        enqueueErrorSnackBar(actionErrorMessage(caught));
      }
      removePasskeysDialog.close();
    },
  );

  const [handleDisableTotp, isDisablingTotp] = useAsyncAction(async () => {
    try {
      const { message } = await disableTotp();
      totpEnrollment.reset();
      await refreshCurrentUser();
      enqueueSuccessSnackBar(message);
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    }
    disableTotpDialog.close();
  });

  const handleCopySetupKey = async (setupKey: string) => {
    await navigator.clipboard.writeText(setupKey);
    enqueueSuccessSnackBar("Clave de configuración copiada");
  };

  const [handleRegenerateRecovery, isRegeneratingRecovery] = useAsyncAction(
    async () => {
      try {
        const { recoveryCodes } = await regenerateRecoveryCodes();
        showFreshRecoveryCodes(recoveryCodes);
      } catch (caught: unknown) {
        enqueueErrorSnackBar(actionErrorMessage(caught));
      }
      regenerateRecoveryDialog.close();
    },
  );

  const [handleAcknowledgeRecovery, isAcknowledgingRecovery] = useAsyncAction(
    async () => {
      try {
        await acknowledgeRecoveryCodes();
        setFreshRecoveryCodes([]);
        await refreshCurrentUser();
        await refetchRecoveryStatus();
      } catch (caught: unknown) {
        enqueueErrorSnackBar(actionErrorMessage(caught));
      }
    },
  );

  const [handleChangePassword, isChangingPassword] = useAsyncAction(
    async (e: Event) => {
      e.preventDefault();
      if (newPassword() !== confirmPassword()) {
        enqueueErrorSnackBar("Las contraseñas no coinciden");
        return;
      }
      try {
        const { message } = await changePassword(
          currentPassword(),
          newPassword(),
        );
        enqueueSuccessSnackBar(message);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (caught: unknown) {
        enqueueErrorSnackBar(actionErrorMessage(caught));
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
        onConfirm={() => void handleRemovePasskeys()}
        onClose={removePasskeysDialog.close}
      />
      <ConfirmDialog
        isOpen={disableTotpDialog.isOpen()}
        title="Desactivar autenticación en dos pasos"
        description="Se desactivará el segundo paso con código para esta cuenta."
        confirmLabel="Desactivar"
        loading={isDisablingTotp()}
        onConfirm={() => void handleDisableTotp()}
        onClose={disableTotpDialog.close}
      />
      <ConfirmDialog
        isOpen={regenerateRecoveryDialog.isOpen()}
        title="Regenerar códigos de recuperación"
        description="Los códigos actuales dejarán de funcionar. Recibirás nuevos códigos."
        confirmLabel="Regenerar"
        loading={isRegeneratingRecovery()}
        onConfirm={() => void handleRegenerateRecovery()}
        onClose={regenerateRecoveryDialog.close}
      />

      <SettingsSection
        title="Cambiar contraseña"
        actions={
          <Button
            type="submit"
            form={CHANGE_PASSWORD_FORM_ID}
            size="sm"
            variant="secondary"
            loading={isChangingPassword()}
          >
            Guardar
          </Button>
        }
      >
        <form
          id={CHANGE_PASSWORD_FORM_ID}
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
                onClick={() => void passkeyEnrollment.enrollPasskey()}
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
                  Desactivar
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

              <TotpEnrollmentPanel
                totp={totpEnrollment}
                onCopySetupKey={(setupKey) => void handleCopySetupKey(setupKey)}
              />
            </div>
          </Show>
        </div>
      </SettingsSection>

      <Suspense>
        <Show
          when={
            freshRecoveryCodes().length > 0 || recoveryStatus()?.hasActiveSet
          }
        >
          <SettingsSection title="Códigos de recuperación">
            <div class={styles.securityStack}>
              <Show
                when={freshRecoveryCodes().length > 0}
                fallback={
                  <div class={styles.block}>
                    <p class={styles.title}>Códigos de recuperación</p>
                    <p class={styles.sectionDescription}>
                      Te quedan {recoveryStatus()?.unused ?? 0} de{" "}
                      {recoveryStatus()?.total ?? 0} códigos. Úsalos para entrar
                      si pierdes tu método de autenticación.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={regenerateRecoveryDialog.open}
                    >
                      Regenerar
                    </Button>
                  </div>
                }
              >
                <div class={styles.block}>
                  <p class={styles.title}>Guarda estos códigos</p>
                  <p class={styles.sectionDescription}>
                    Guárdalos en un lugar seguro. No volverás a verlos.
                  </p>
                </div>
                <RecoveryCodesPanel codes={freshRecoveryCodes()} />
                <div class={styles.inlineActions}>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    loading={isAcknowledgingRecovery()}
                    onClick={() => void handleAcknowledgeRecovery()}
                  >
                    Ya los guardé
                  </Button>
                </div>
              </Show>
            </div>
          </SettingsSection>
        </Show>
      </Suspense>
    </>
  );
}
