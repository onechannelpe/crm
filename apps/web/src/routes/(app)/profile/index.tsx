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
    <AppPage class="space-y-0 pb-0">
      <AppPageHeader eyebrow="User" title="Profile" description="Personal information and account security." />

      <section class="tw-record-index-panel">
        <div class="tw-view-bar">
          <div class="tw-view-picker">
            <span>User</span>
            <span>/</span>
            <span class="text-foreground">Profile</span>
          </div>
        </div>

        <div class="px-6 py-5">
          <div class="mx-auto flex max-w-[640px] flex-col gap-8">
            <section class="space-y-3 border-b border-border pb-6">
              <h2 class="text-[16px] font-semibold text-foreground">Identity</h2>
              <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p class="text-[12px] text-muted-foreground">Name</p>
                  <p class="mt-1 text-[14px] font-medium text-foreground">{user().fullName}</p>
                </div>
                <div>
                  <p class="text-[12px] text-muted-foreground">Email</p>
                  <p class="mt-1 text-[14px] text-foreground">{user().email}</p>
                </div>
              </div>
              <div class="inline-flex items-center gap-2">
                <span class="text-[12px] text-muted-foreground">Role</span>
                <Badge variant={getRoleBadgeVariant(user().role)}>
                  {getRoleLabel(user().role)}
                </Badge>
              </div>
              <div class="inline-flex items-center gap-2">
                <span class="text-[12px] text-muted-foreground">Team</span>
                <span class="text-[13px] text-foreground">{getWorkspaceLabel(user())}</span>
              </div>
            </section>

            <section class="space-y-3 border-b border-border pb-6">
              <h2 class="text-[16px] font-semibold text-foreground">Passkey</h2>
              <p class="text-[13px] text-muted-foreground">
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
                <p class="text-[13px] text-muted-foreground">
                  This browser does not support passkeys.
                </p>
              </Show>
              <Show when={passkeyMessage()}>
                <p class="text-[13px] text-muted-foreground">{passkeyMessage()}</p>
              </Show>
            </section>

            <section class="space-y-3">
              <h2 class="text-[16px] font-semibold text-foreground">Two-factor authentication</h2>
              <Show when={totpStatus()?.enabled}>
                <p class="text-[13px] text-muted-foreground">TOTP enabled</p>
              </Show>
              <Show when={!totpStatus()?.enabled}>
                <p class="text-[13px] text-muted-foreground">
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
                  <div class="space-y-2">
                    <img src={totpQrCode()} alt="TOTP QR code" class="h-48 w-48 border border-border p-2" />
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
                <p class="text-[13px] text-muted-foreground">{totpMessage()}</p>
              </Show>
              <Show when={recoveryCodes().length > 0}>
                <div class="space-y-2 border border-border px-3 py-2">
                  <p class="text-sm font-medium">Recovery codes (shown once)</p>
                  <ul class="grid grid-cols-2 gap-2 text-sm">
                    {recoveryCodes().map((code) => (
                      <li class="font-mono">{code}</li>
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
