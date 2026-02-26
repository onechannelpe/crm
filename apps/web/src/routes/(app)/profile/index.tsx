import { useAction } from "@solidjs/router";
import { createSignal, For, onMount, Show } from "solid-js";

import {
  beginPasskeyRegistration,
  beginTotpEnrollment,
  finishPasskeyRegistration,
} from "~/actions/auth";
import { updateUserProfile } from "~/actions/settings";
import { useToast } from "~/components/feedback/toast-provider";
import { AppPage } from "~/components/layout/page";
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
import { finishTotpEnrollmentMutation } from "~/lib/mutations/profile";
import { totpStatusQuery } from "~/lib/queries/profile";
import { createOptimisticQuery } from "~/lib/ui/create-optimistic-query";

import styles from "./profile-page.module.css";

export default function ProfilePage() {
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const user = () => currentUser();

  const [profileName, setProfileName] = createSignal(user().fullName || "");
  const [profilePhone, setProfilePhone] = createSignal(user().phoneE164 || "");
  const [savingProfile, setSavingProfile] = createSignal(false);

  const [passkeySupported, setPasskeySupported] = createSignal(false);
  const [passkeyLoading, setPasskeyLoading] = createSignal(false);
  const [passkeyMessage, setPasskeyMessage] = createSignal("");

  const { data: currentTotpStatus, update: updateTotpStatus } =
    createOptimisticQuery(totpStatusQuery, {
      initialValue: { enabled: false },
    });
  const finishTotpAction = useAction(finishTotpEnrollmentMutation);
  const [totpLoading, setTotpLoading] = createSignal(false);
  const [totpMessage, setTotpMessage] = createSignal("");
  const [totpQrCode, setTotpQrCode] = createSignal("");
  const [totpCode, setTotpCode] = createSignal("");
  const [recoveryCodes, setRecoveryCodes] = createSignal<string[]>([]);

  onMount(() => {
    setPasskeySupported(isPasskeySupported());
  });

  const saveProfile = async (e: Event) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserProfile(profileName(), profilePhone());
      showToast("success", "Profile updated");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to update profile"));
    } finally {
      setSavingProfile(false);
    }
  };

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
      await updateTotpStatus({
        optimistic: (prev) => ({ ...prev, enabled: true }),
        commit: async () => {
          codes = await finishTotpAction(totpCode());
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
    <AppPage width="medium">
      <div class={styles.content}>
        {/* Identity Section */}
        <section class={styles.section}>
          <div class={styles.sectionHeader}>
            <h2 class={styles.sectionTitle}>Personal Info</h2>
            <p class={styles.sectionDesc}>
              Update your contact details and view your role.
            </p>
          </div>
          <div class={styles.sectionContent}>
            <form
              onSubmit={(e) => {
                void saveProfile(e);
              }}
            >
              <div class={styles.formGrid}>
                <Input
                  label="Full name"
                  value={profileName()}
                  onInput={(e) => setProfileName(e.currentTarget.value)}
                  required
                />
                <Input label="Email" value={user().email} disabled />
                <Input
                  label="Phone"
                  value={profilePhone()}
                  onInput={(e) => setProfilePhone(e.currentTarget.value)}
                />
              </div>
              <div class={styles.identityMeta}>
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
              </div>
              <div class={styles.formActions}>
                <Button type="submit" disabled={savingProfile()}>
                  {savingProfile() ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </div>
        </section>

        {/* Passkey Section */}
        <section class={styles.section}>
          <div class={styles.sectionHeader}>
            <h2 class={styles.sectionTitle}>Passkey</h2>
            <p class={styles.sectionDesc}>
              Register a passkey to speed up login and improve security (FaceID,
              TouchID, Windows Hello).
            </p>
          </div>
          <div class={styles.sectionContent}>
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
              <p class={`${styles.muted} ${styles.feedbackHint}`}>
                This browser does not support passkeys.
              </p>
            </Show>
            <Show when={passkeyMessage()}>
              <p class={`${styles.muted} ${styles.feedbackHint}`}>
                {passkeyMessage()}
              </p>
            </Show>
          </div>
        </section>

        {/* TOTP Section */}
        <section class={styles.section}>
          <div class={styles.sectionHeader}>
            <h2 class={styles.sectionTitle}>Two-factor auth</h2>
            <p class={styles.sectionDesc}>
              Add an authenticator app (like Google Authenticator or Authy) to
              require a one-time code on login.
            </p>
          </div>
          <div class={styles.sectionContent}>
            <Show when={currentTotpStatus()?.enabled}>
              <p class={`${styles.sectionTitle} ${styles.statusEnabled}`}>
                ✓ TOTP is currently enabled
              </p>
            </Show>

            <Show when={!currentTotpStatus()?.enabled}>
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
                  <img
                    src={totpQrCode()}
                    alt="TOTP QR code"
                    class={styles.qr}
                  />
                  <Input
                    id="totp-setup-code"
                    type="text"
                    placeholder="Enter 6-digit TOTP code"
                    value={totpCode()}
                    onInput={(
                      e: InputEvent & { currentTarget: HTMLInputElement },
                    ) => setTotpCode(e.currentTarget.value)}
                  />
                  <div>
                    <Button
                      type="button"
                      disabled={totpLoading() || totpCode().length < 6}
                      onClick={() => {
                        void confirmTotpSetup();
                      }}
                    >
                      Confirm code
                    </Button>
                  </div>
                </div>
              </Show>
            </Show>

            <Show when={totpMessage()}>
              <p class={`${styles.muted} ${styles.feedbackHint}`}>
                {totpMessage()}
              </p>
            </Show>

            <Show when={recoveryCodes().length > 0}>
              <div class={styles.recovery}>
                <p class={styles.recoveryTitle}>Recovery codes (shown once!)</p>
                <ul class={styles.recoveryList}>
                  <For each={recoveryCodes()}>
                    {(code) => <li class={styles.mono}>{code}</li>}
                  </For>
                </ul>
              </div>
            </Show>
          </div>
        </section>
      </div>
    </AppPage>
  );
}
