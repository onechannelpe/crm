import { createEffect, createSignal } from "solid-js";

import {
  beginPasskeyRegistration,
  beginTotpEnrollment,
  finishPasskeyRegistration,
  finishTotpEnrollment,
} from "~/actions/auth";
import { changePassword } from "~/actions/settings";
import { SecurityEnrollmentPanel } from "~/components/auth/security-enrollment-panel";
import { useToast } from "~/components/feedback/toast-provider";
import { useSession } from "~/components/providers/session-provider";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import {
  isPasskeySupported,
  toCreationOptions,
  toRegistrationPayload,
} from "~/lib/auth/passkey/browser";
import { getErrorMessage } from "~/lib/errors";

import styles from "./settings-page.module.css";

export default function SecurityPage() {
  const { showToast } = useToast();
  const { currentUser, refreshCurrentUser } = useSession();

  const [currentPassword, setCurrentPassword] = createSignal("");
  const [newPassword, setNewPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [changingPassword, setChangingPassword] = createSignal(false);

  const [passkeySupported, setPasskeySupported] = createSignal(false);
  const [passkeyLoading, setPasskeyLoading] = createSignal(false);

  const [totpEnrolling, setTotpEnrolling] = createSignal(false);
  const [totpEnrollment, setTotpEnrollment] = createSignal<{
    qrCodeDataUrl: string;
    otpauthUri: string;
  } | null>(null);
  const [totpCode, setTotpCode] = createSignal("");
  const [recoveryCodes, setRecoveryCodes] = createSignal<string[]>([]);

  createEffect(() => {
    setPasskeySupported(isPasskeySupported());
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

  const onRegisterPasskey = async () => {
    setPasskeyLoading(true);
    try {
      const { challengeId, options } = await beginPasskeyRegistration();
      const creationOptions = toCreationOptions(options);
      const credential = await navigator.credentials.create({
        publicKey: creationOptions,
      });

      if (!credential || !(credential instanceof PublicKeyCredential)) {
        throw new Error("No se pudo crear la clave de acceso");
      }

      const response = toRegistrationPayload(credential);
      await finishPasskeyRegistration(challengeId, response);
      await refreshCurrentUser();
      showToast("success", "Clave de acceso añadida");
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(err, "No se pudo añadir la clave de acceso"),
      );
    } finally {
      setPasskeyLoading(false);
    }
  };

  const onBeginTotp = async () => {
    setTotpEnrolling(true);
    try {
      const enrollment = await beginTotpEnrollment();
      setTotpEnrollment(enrollment);
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(err, "No se pudo iniciar la configuración del 2FA"),
      );
    } finally {
      setTotpEnrolling(false);
    }
  };

  const onVerifyTotp = async () => {
    try {
      const codes = await finishTotpEnrollment(totpCode());
      setRecoveryCodes(codes);
      setTotpEnrollment(null);
      setTotpCode("");
      await refreshCurrentUser();
      showToast("success", "Autenticación en dos pasos activada");
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(err, "Código de verificación inválido"),
      );
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
          passkeySupported={passkeySupported()}
          hasPasskey={currentUser().hasPasskey}
          passkeyCount={currentUser().passkeyCount}
          passkeyLoading={passkeyLoading()}
          totpEnabled={currentUser().totpEnabled}
          totpLoading={totpEnrolling()}
          totpCode={totpCode()}
          totpEnrollment={totpEnrollment()}
          recoveryCodes={recoveryCodes()}
          onTotpCodeInput={(event) => setTotpCode(event.currentTarget.value)}
          onRegisterPasskey={() => void onRegisterPasskey()}
          onBeginTotp={() => void onBeginTotp()}
          onVerifyTotp={() => void onVerifyTotp()}
        />
      </SettingsSection>
    </div>
  );
}
