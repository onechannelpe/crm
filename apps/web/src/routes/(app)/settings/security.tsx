import {
  createAsync,
  revalidate,
  type RouteDefinition,
  useAction,
  useSubmission,
} from "@solidjs/router";
import { Show, Suspense, createSignal } from "solid-js";

import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { recoveryCodesStatusQuery } from "~/features/auth/data/queries";
import {
  acknowledgeRecoveryCodesMutation,
  changePasswordMutation,
  disableTotpMutation,
  regenerateRecoveryCodesMutation,
  removeAllPasskeysMutation,
} from "~/features/auth/data/security-mutations";
import { RecoveryCodesPanel } from "~/features/auth/security/recovery-codes-panel";
import { usePasskeyEnrollment } from "~/features/auth/security/use-passkey-enrollment";
import { useTotpEnrollment } from "~/features/auth/security/use-totp-enrollment";
import { OtpSlotInput } from "~/features/auth/ui/otp-slot-input";
import { SettingsPageLayout } from "~/features/settings-shell/page/settings-page-layout";
import { useConfirmDialog } from "~/hooks/use-confirm-dialog";
import { actionErrorMessage } from "~/lib/wire-error";

import styles from "./security.module.css";
import base from "./settings-page.module.css";

const CHANGE_PASSWORD_FORM_ID = "settings-security-change-password-form";

export const route = {
  preload: () => recoveryCodesStatusQuery(),
} satisfies RouteDefinition;

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

  const recoveryStatus = createAsync(() => recoveryCodesStatusQuery());
  const removePasskeys = useAction(removeAllPasskeysMutation);
  const removePasskeysSubmission = useSubmission(removeAllPasskeysMutation);
  const disableAuthenticator = useAction(disableTotpMutation);
  const disableTotpSubmission = useSubmission(disableTotpMutation);
  const regenerateRecovery = useAction(regenerateRecoveryCodesMutation);
  const regenerateRecoverySubmission = useSubmission(
    regenerateRecoveryCodesMutation,
  );
  const acknowledgeRecovery = useAction(acknowledgeRecoveryCodesMutation);
  const acknowledgeRecoverySubmission = useSubmission(
    acknowledgeRecoveryCodesMutation,
  );
  const savePassword = useAction(changePasswordMutation);
  const changePasswordSubmission = useSubmission(changePasswordMutation);

  // Recovery codes are returned once, so keep them in memory until confirmed.
  const [freshRecoveryCodes, setFreshRecoveryCodes] = createSignal<string[]>(
    [],
  );

  function showFreshRecoveryCodes(codes: string[]) {
    setFreshRecoveryCodes(codes);
    void revalidate(recoveryCodesStatusQuery.key);
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

  async function handleRemovePasskeys(): Promise<void> {
    try {
      const { message } = await removePasskeys();
      enqueueSuccessSnackBar(message);
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    } finally {
      removePasskeysDialog.close();
    }
  }

  async function handleDisableTotp(): Promise<void> {
    try {
      const { message } = await disableAuthenticator();

      totpEnrollment.reset();
      enqueueSuccessSnackBar(message);
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    } finally {
      disableTotpDialog.close();
    }
  }

  async function handleCopySetupKey(setupKey: string) {
    await navigator.clipboard.writeText(setupKey);
    enqueueSuccessSnackBar("Clave de configuración copiada");
  }

  async function handleRegenerateRecovery(): Promise<void> {
    try {
      const { recoveryCodes } = await regenerateRecovery();
      showFreshRecoveryCodes(recoveryCodes);
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    } finally {
      regenerateRecoveryDialog.close();
    }
  }

  async function handleAcknowledgeRecovery(): Promise<void> {
    try {
      await acknowledgeRecovery();
      setFreshRecoveryCodes([]);
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    }
  }

  async function handleChangePassword(event: Event): Promise<void> {
    event.preventDefault();

    if (newPassword() !== confirmPassword()) {
      enqueueErrorSnackBar("Las contraseñas no coinciden");
      return;
    }

    try {
      const { message } = await savePassword(currentPassword(), newPassword());

      enqueueSuccessSnackBar(message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    }
  }

  return (
    <SettingsPageLayout>
      <ConfirmDialog
        isOpen={removePasskeysDialog.isOpen()}
        title="Eliminar claves de acceso"
        description="Se eliminarán todas las claves registradas en esta cuenta."
        confirmLabel="Eliminar"
        loading={Boolean(removePasskeysSubmission.pending)}
        onConfirm={() => void handleRemovePasskeys()}
        onClose={removePasskeysDialog.close}
      />

      <ConfirmDialog
        isOpen={disableTotpDialog.isOpen()}
        title="Desactivar autenticación en dos pasos"
        description="Se desactivará el segundo paso con código para esta cuenta."
        confirmLabel="Desactivar"
        loading={Boolean(disableTotpSubmission.pending)}
        onConfirm={() => void handleDisableTotp()}
        onClose={disableTotpDialog.close}
      />

      <ConfirmDialog
        isOpen={regenerateRecoveryDialog.isOpen()}
        title="Regenerar códigos de recuperación"
        description="Los códigos actuales dejarán de funcionar. Recibirás nuevos códigos."
        confirmLabel="Regenerar"
        loading={Boolean(regenerateRecoverySubmission.pending)}
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
            loading={Boolean(changePasswordSubmission.pending)}
          >
            Guardar
          </Button>
        }
      >
        <form
          id={CHANGE_PASSWORD_FORM_ID}
          onSubmit={(event) => void handleChangePassword(event)}
        >
          <div class={base.formGrid}>
            <Input
              type="password"
              label="Contraseña actual"
              value={currentPassword()}
              onInput={(event) => setCurrentPassword(event.currentTarget.value)}
              required
            />
            <Input
              type="password"
              label="Nueva contraseña"
              value={newPassword()}
              onInput={(event) => setNewPassword(event.currentTarget.value)}
              required
            />
            <Input
              type="password"
              label="Confirmar nueva contraseña"
              value={confirmPassword()}
              onInput={(event) => setConfirmPassword(event.currentTarget.value)}
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
                    loading={Boolean(acknowledgeRecoverySubmission.pending)}
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
    </SettingsPageLayout>
  );
}
