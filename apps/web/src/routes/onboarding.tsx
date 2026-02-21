import { useNavigate } from "@solidjs/router";
import { createEffect, createResource, createSignal, Show } from "solid-js";

import {
  beginTotpEnrollment,
  completeOnboarding,
  finishTotpEnrollment,
  getMe,
} from "~/actions/auth";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { getErrorMessage } from "~/lib/errors";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [user, { refetch: refetchUser }] = createResource(getMe);
  const [fullName, setFullName] = createSignal("");
  const [phone, setPhone] = createSignal("");
  const [totpCode, setTotpCode] = createSignal("");
  const [totpQrCode, setTotpQrCode] = createSignal("");
  const [recoveryCodes, setRecoveryCodes] = createSignal<string[]>([]);
  const [totpMessage, setTotpMessage] = createSignal("");
  const [totpLoading, setTotpLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);

  const requiresStrongAuth = () => {
    const currentUser = user();
    if (!currentUser) return false;
    return currentUser.strongAuthRequired;
  };

  const strongAuthIsEnrolled = () => {
    const currentUser = user();
    if (!currentUser) return false;
    return currentUser.strongAuthEnrolledAt !== null;
  };

  createEffect(() => {
    const currentUser = user();
    if (!currentUser) return;
    if (!fullName()) setFullName(currentUser.fullName);
    if (!phone() && currentUser.phoneE164) setPhone(currentUser.phoneE164);
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (requiresStrongAuth() && !strongAuthIsEnrolled()) {
        throw new Error(
          "TOTP is required before activating an administrative account.",
        );
      }
      await completeOnboarding(fullName(), phone());
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to complete onboarding"));
    } finally {
      setSubmitting(false);
    }
  }

  async function startTotpSetup() {
    setTotpMessage("");
    setTotpLoading(true);
    try {
      const enrollment = await beginTotpEnrollment();
      setTotpQrCode(enrollment.qrCodeDataUrl);
      setTotpMessage("Scan the QR code and confirm with your TOTP code.");
    } catch (err: unknown) {
      setTotpMessage(getErrorMessage(err, "Failed to initialize TOTP"));
    } finally {
      setTotpLoading(false);
    }
  }

  async function confirmTotpSetup() {
    setTotpMessage("");
    setTotpLoading(true);
    try {
      const codes = await finishTotpEnrollment(totpCode());
      setRecoveryCodes(codes);
      setTotpQrCode("");
      setTotpCode("");
      await refetchUser();
      setTotpMessage("TOTP enabled. Save your recovery codes.");
    } catch (err: unknown) {
      setTotpMessage(getErrorMessage(err, "Invalid TOTP code"));
    } finally {
      setTotpLoading(false);
    }
  }

  return (
    <div class="crm-shell grid min-h-screen items-center justify-center px-4">
      <section class="tw-record-index-panel w-full max-w-xl space-y-5 p-5">
        <div>
          <h1 class="text-2xl font-semibold text-foreground">
            Complete your profile
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Confirm your profile details and primary phone number.
          </p>
        </div>

        <Show when={user()}>
          {(currentUser) => (
            <form
              class="space-y-4"
              onSubmit={(e) => {
                void handleSubmit(e);
              }}
            >
              <div class="space-y-2">
                <Input
                  id="onboarding-email"
                  type="email"
                  label="Email"
                  value={currentUser().email}
                  disabled
                />
              </div>

              <div class="space-y-2">
                <Input
                  id="onboarding-name"
                  type="text"
                  label="Full name"
                  value={fullName()}
                  onInput={(e) => setFullName(e.currentTarget.value)}
                  required
                />
              </div>

              <div class="space-y-2">
                <Input
                  id="onboarding-phone"
                  type="tel"
                  label="WhatsApp (E.164, ex: +51987654321)"
                  value={phone()}
                  onInput={(e) => setPhone(e.currentTarget.value)}
                  required
                />
              </div>

              <Show when={requiresStrongAuth()}>
                <div class="space-y-3 border border-border p-3">
                  <p class="text-sm font-medium text-foreground">
                    Required security setup (TOTP)
                  </p>
                  <Show when={strongAuthIsEnrolled()}>
                    <p class="text-sm text-muted-foreground">TOTP enabled.</p>
                  </Show>
                  <Show when={!strongAuthIsEnrolled()}>
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
                        <img
                          src={totpQrCode()}
                          alt="TOTP QR code"
                          class="w-48 h-48"
                        />
                        <Input
                          id="onboarding-totp-code"
                          type="text"
                          placeholder="Enter TOTP code"
                          value={totpCode()}
                          onInput={(e) => setTotpCode(e.currentTarget.value)}
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
                    <p class="text-sm text-muted-foreground">{totpMessage()}</p>
                  </Show>
                  <Show when={recoveryCodes().length > 0}>
                    <div class="space-y-2 border border-border px-3 py-2">
                      <p class="text-sm font-medium">
                        Recovery codes (shown once)
                      </p>
                      <ul class="grid grid-cols-2 gap-2 text-sm">
                        {recoveryCodes().map((code) => (
                          <li class="font-mono">{code}</li>
                        ))}
                      </ul>
                    </div>
                  </Show>
                </div>
              </Show>

              <Show when={error()}>
                <p class="text-sm text-destructive">{error()}</p>
              </Show>

              <Button type="submit" class="w-full" disabled={submitting()}>
                {submitting() ? "Saving..." : "Save and continue"}
              </Button>
            </form>
          )}
        </Show>
      </section>
    </div>
  );
}
