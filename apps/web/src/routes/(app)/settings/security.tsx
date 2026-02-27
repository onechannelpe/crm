import { createSignal, onMount, Show, For } from "solid-js";

import {
  beginPasskeyRegistration,
  beginTotpEnrollment,
  finishPasskeyRegistration,
  finishTotpEnrollment,
} from "~/actions/auth";
import { changePassword } from "~/actions/settings";
import { useToast } from "~/components/feedback/toast-provider";
import Phone from "~/components/icons/phone";
import ShieldCheck from "~/components/icons/shield-check";
import { SettingsCard } from "~/components/settings/SettingsCard";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import {
  isPasskeySupported,
  toCreationOptions,
  toRegistrationPayload,
} from "~/lib/auth/passkey/browser";
import { getErrorMessage } from "~/lib/errors";
import { totpStatusQuery } from "~/lib/queries/profile";
import { createOptimisticQuery } from "~/lib/ui/create-optimistic-query";

import securityStyles from "./security-page.module.css";
import styles from "./settings-page.module.css";

export default function SecurityPage() {
  const { showToast } = useToast();

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
  const [recoveryCodes, setRecoveryCodes] = createSignal<string[] | null>(null);

  const { data: currentTotpStatus, invalidate: invalidateTotp } =
    createOptimisticQuery(totpStatusQuery, {
      initialValue: { enabled: false },
    });

  onMount(() => {
    setPasskeySupported(isPasskeySupported());
  });

  const handleChangePassword = async (e: Event) => {
    e.preventDefault();
    if (newPassword() !== confirmPassword()) {
      showToast("error", "Passwords do not match");
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
      showToast("error", getErrorMessage(err, "Failed to change password"));
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
        throw new Error("Failed to create passkey");
      }

      const response = toRegistrationPayload(credential);
      await finishPasskeyRegistration(challengeId, response);
      showToast("success", "Contraseña añadida");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to add passkey"));
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
        getErrorMessage(err, "No pudimos iniciar la configuración del 2FA"),
      );
    } finally {
      setTotpEnrolling(false);
    }
  };

  const onVerifyTotp = async (e: Event) => {
    e.preventDefault();
    try {
      const codes = await finishTotpEnrollment(totpCode());
      setRecoveryCodes(codes);
      setTotpEnrollment(null);
      await invalidateTotp();
      showToast("success", "Two-factor authentication enabled");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Invalid verification code"));
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

      <SettingsSection title="Autenticación en dos pasos">
        <SettingsCard
          title="Aplicación de autenticación"
          icon={ShieldCheck}
          status={{
            text: currentTotpStatus()?.enabled ? "Activa" : "Desactivada",
            active: currentTotpStatus()?.enabled ?? false,
          }}
        />

        <Show
          when={
            !currentTotpStatus()?.enabled &&
            !totpEnrollment() &&
            !recoveryCodes()
          }
        >
          <div
            class={`${styles.sectionActions} ${securityStyles.sectionActionsSpaced}`}
          >
            <Button
              variant="outline"
              onClick={() => void onBeginTotp()}
              disabled={totpEnrolling()}
            >
              {totpEnrolling()
                ? "Iniciando configuración..."
                : "Configurar aplicación de autenticación"}
            </Button>
          </div>
        </Show>

        <Show when={totpEnrollment()}>
          <div class={securityStyles.qrWrap}>
            <p class={styles.sectionDescription}>Escanea el código QR.</p>
            <div class={securityStyles.qrContainer}>
              <img
                src={totpEnrollment()?.qrCodeDataUrl}
                class={securityStyles.qr}
                alt="QR Code"
              />
            </div>
            <form
              onSubmit={(e) => void onVerifyTotp(e)}
              class={securityStyles.qrInput}
            >
              <Input
                label="Código de verificación"
                value={totpCode()}
                onInput={(e) => setTotpCode(e.currentTarget.value)}
                placeholder="123456"
                required
              />
              <Button type="submit">Verificar</Button>
            </form>
          </div>
        </Show>

        <Show when={recoveryCodes()}>
          <div class={securityStyles.recovery}>
            <p class={securityStyles.recoveryTitle}>Códigos de recuperación</p>
            <p class={styles.sectionDescription}>
              Guarda estos códigos en un lugar seguro.
            </p>
            <div class={securityStyles.recoveryList}>
              <For each={recoveryCodes()}>
                {(code) => <div class={securityStyles.mono}>{code}</div>}
              </For>
            </div>
            <div class={securityStyles.recoveryActions}>
              <Button onClick={() => setRecoveryCodes(null)}>
                Guarde mis códigos
              </Button>
            </div>
          </div>
        </Show>
      </SettingsSection>

      <SettingsSection title="Claves de acceso">
        <SettingsCard title="Clave de acceso del dispositivo" icon={Phone} />
        <div
          class={`${styles.sectionActions} ${securityStyles.sectionActionsSpaced}`}
        >
          <Button
            variant="outline"
            disabled={!passkeySupported() || passkeyLoading()}
            onClick={() => void onRegisterPasskey()}
          >
            {passkeyLoading()
              ? "Añadiendo clave de acceso..."
              : "Añadir clave de acceso"}
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}
