import { useNavigate } from "@solidjs/router";
import { createEffect, createResource, createSignal, Show } from "solid-js";

import { completeOnboarding, getMe } from "~/actions/auth";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { getErrorMessage } from "~/lib/errors";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [user] = createResource(getMe);
  const [fullName, setFullName] = createSignal("");
  const [phone, setPhone] = createSignal("");
  const [error, setError] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);

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
      await completeOnboarding(fullName(), phone());
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "No se pudo completar el onboarding"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div class="min-h-screen grid items-center justify-center bg-gray-50/50 px-4">
      <Card class="w-full max-w-xl p-6 space-y-5">
        <div>
          <h1 class="text-2xl font-semibold text-gray-900">
            Completa tu perfil
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Para continuar debes confirmar tus datos y registrar tu número
            principal.
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
                  label="Correo"
                  value={currentUser().email}
                  disabled
                />
              </div>

              <div class="space-y-2">
                <Input
                  id="onboarding-name"
                  type="text"
                  label="Nombre completo"
                  value={fullName()}
                  onInput={(e) => setFullName(e.currentTarget.value)}
                  required
                />
              </div>

              <div class="space-y-2">
                <Input
                  id="onboarding-phone"
                  type="tel"
                  label="WhatsApp (E.164, ejemplo +51987654321)"
                  value={phone()}
                  onInput={(e) => setPhone(e.currentTarget.value)}
                  required
                />
              </div>

              <Show when={error()}>
                <p class="text-sm text-destructive">{error()}</p>
              </Show>

              <Button type="submit" class="w-full" disabled={submitting()}>
                {submitting() ? "Guardando..." : "Guardar y continuar"}
              </Button>
            </form>
          )}
        </Show>
      </Card>
    </div>
  );
}
