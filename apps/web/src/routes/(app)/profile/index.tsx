import { createSignal, onMount, Show } from "solid-js";

import {
  beginPasskeyRegistration,
  beginTotpEnrollment,
  finishPasskeyRegistration,
  finishTotpEnrollment,
  getTotpStatus,
} from "~/actions/auth";
import {
  AppPage,
  AppPageHeader,
} from "~/components/layout/page";
import { useSession } from "~/components/providers/session-provider";
import { Badge } from "~/components/ui/display/badge";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import {
  getRoleBadgeVariant,
  getRoleLabel,
} from "~/lib/auth/access/role-display";
import { getWorkspaceLabel } from "~/lib/auth/access/workspace-label";
import {
  isPasskeySupported,
  toCreationOptions,
  toRegistrationPayload,
} from "~/lib/auth/passkey/browser";
import { getErrorMessage } from "~/lib/errors";
import { createAppQuery } from "~/lib/ui/create-app-query";
import { runOptimistic } from "~/lib/ui/run-optimistic";
import styles from "./profile-page.module.css";

export default function ProfilePage() {
  const { currentUser } = useSession();
  const [passkeySupported, setPasskeySupported] = createSignal(false);
  const [passkeyLoading, setPasskeyLoading] = createSignal(false);
  const [passkeyMessage, setPasskeyMessage] = createSignal("");
  const [totpStatus, { mutate: mutateTotpStatus, refetch: refetchTotp }] =
    createAppQuery(getTotpStatus, { enabled: false });
  const currentTotpStatus = () => totpStatus();
  const [totpLoading, setTotpLoading] = createSignal(false);
  const [totpMessage, setTotpMessage] = createSignal("");
  const [totpQrCode, setTotpQrCode] = createSignal("");
  const [totpCode, setTotpCode] = createSignal("");
  const [recoveryCodes, setRecoveryCodes] = createSignal<string[]>([]);
  const user = () => currentUser();

  onMount(() => {
    setPasskeySupported(isPasskeySupported());
  });

  async function registerPasskey() {
    setPasskeyMessage("");
    setPasskeyLoading(true);
    try {
      const challenge = await beginPasskeyRegistration();
      const credential = await navigator.credentials.create({
        publicKey: toCreationOptions(challenge.options),
      });
      if (!(credential instanceof PublicKeyCredential)) {
        throw new Error("Invalid credential response");
      }

      const payload = toRegistrationPayload(credential);
      await finishPasskeyRegistration(challenge.challengeId, payload);
      setPasskeyMessage("Passkey registered");
    } catch (err: unknown) {
      setPasskeyMessage(getErrorMessage(err, "Failed to register passkey"));
    } finally {
      setPasskeyLoading(false);
    }
  }

  async function startTotpSetup() {
    setTotpMessage("");
    setTotpLoading(true);
    try {
      const enrollment = await beginTotpEnrollment();
      setTotpQrCode(enrollment.qrCodeDataUrl);
      setTotpMessage("Scan the QR and confirm with your TOTP code");
    } catch (err: unknown) {
      setTotpMessage(getErrorMessage(err, "Failed to start TOTP"));
    } finally {
      setTotpLoading(false);
    }
  }

  async function confirmTotpSetup() {
    setTotpMessage("");
    setTotpLoading(true);
    try {
      let codes: string[] = [];
      await runOptimistic({
        read: currentTotpStatus,
        write: (next) => mutateTotpStatus(() => next),
        optimistic: (prev) => ({ ...prev, enabled: true }),
        commit: async () => {
          codes = await finishTotpEnrollment(totpCode());
        },
        reconcile: () => {
          void refetchTotp();
        },
      });
      setRecoveryCodes(codes);
      setTotpQrCode("");
      setTotpCode("");
      setTotpMessage("TOTP enabled. Save the recovery codes.");
    } catch (err: unknown) {
      setTotpMessage(getErrorMessage(err, "Invalid TOTP code"));
    } finally {
      setTotpLoading(false);
    }
  }

  return (
    <AppPage>
      <AppPageHeader eyebrow="User" title="Profile" description="Personal information and account security." />

      <section class={styles.panel}>
        <div class={styles.topbar}>
          <div class={styles.crumbs}>
            <span>User</span>
            <span>/</span>
            <span>Profile</span>
          </div>
        </div>

        <div class={styles.contentWrap}>
          <div class={styles.content}>
            <section class={`${styles.section} ${styles.sectionBorder}`}>
              <h2 class={styles.title}>Identity</h2>
              <div class={styles.identityGrid}>
                <div>
                  <p class={styles.label}>Name</p>
                  <p class={`${styles.value} ${styles.valueStrong}`}>{user().fullName}</p>
                </div>
                <div>
                  <p class={styles.label}>Email</p>
                  <p class={styles.value}>{user().email}</p>
                </div>
              </div>
              <div class={styles.inline}>
                <span class={styles.label}>Role</span>
                <Badge variant={getRoleBadgeVariant(user().role)}>
                  {getRoleLabel(user().role)}
                </Badge>
              </div>
              <div class={styles.inline}>
                <span class={styles.label}>Team</span>
                <span class={styles.muted}>{getWorkspaceLabel(user())}</span>
              </div>
            </section>

            <section class={`${styles.section} ${styles.sectionBorder}`}>
              <h2 class={styles.title}>Passkey</h2>
              <p class={styles.muted}>
                Register a passkey to speed up login and improve security.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={!passkeySupported() || passkeyLoading()}
                onClick={() => {
                  void registerPasskey();
                }}
              >
                {passkeyLoading() ? "Registering passkey..." : "Register passkey"}
              </Button>
              <Show when={!passkeySupported()}>
                <p class={styles.muted}>
                  This browser does not support passkeys.
                </p>
              </Show>
              <Show when={passkeyMessage()}>
                <p class={styles.muted}>{passkeyMessage()}</p>
              </Show>
            </section>

            <section class={styles.section}>
              <h2 class={styles.title}>Two-factor authentication</h2>
              <Show when={totpStatus()?.enabled}>
                <p class={styles.muted}>TOTP enabled</p>
              </Show>
              <Show when={!totpStatus()?.enabled}>
                <p class={styles.muted}>
                  Add an authenticator app to require a one-time code on login.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={totpLoading()}
                  onClick={() => {
                    void startTotpSetup();
                  }}
                >
                  {totpLoading() ? "Preparing TOTP..." : "Set up TOTP"}
                </Button>
                <Show when={totpQrCode()}>
                  <div class={styles.qrWrap}>
                    <img src={totpQrCode()} alt="TOTP QR code" class={styles.qr} />
                    <Input
                      id="totp-setup-code"
                      type="text"
                      placeholder="Enter TOTP code"
                      value={totpCode()}
                      onInput={(
                        e: InputEvent & { currentTarget: HTMLInputElement },
                      ) => setTotpCode(e.currentTarget.value)}
                    />
                    <Button
                      type="button"
                      disabled={totpLoading()}
                      onClick={() => {
                        void confirmTotpSetup();
                      }}
                    >
                      Confirm TOTP
                    </Button>
                  </div>
                </Show>
              </Show>
              <Show when={totpMessage()}>
                <p class={styles.muted}>{totpMessage()}</p>
              </Show>
              <Show when={recoveryCodes().length > 0}>
                <div class={styles.recovery}>
                  <p class={styles.recoveryTitle}>Recovery codes (shown once)</p>
                  <ul class={styles.recoveryList}>
                    {recoveryCodes().map((code) => (
                      <li class={styles.mono}>{code}</li>
                    ))}
                  </ul>
                </div>
              </Show>
            </section>
          </div>
        </div>
      </section>
    </AppPage>
  );
}
