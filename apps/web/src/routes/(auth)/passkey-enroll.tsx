import { action, useSubmission } from "@solidjs/router";
import { Show, createSignal } from "solid-js";
import { verifyPasskeyRegistration } from "~/server/auth/passkey";
import { usePasskeyRegistration } from "~/lib/shared/passkey-hooks";

const passkeyEnrollAction = action(async (formData: FormData) => {
  "use server";

  const response = formData.get("response") as string;
  const password = formData.get("password") as string;

  if (!response || !password) {
    return { error: "Passkey enrollment failed" };
  }

  try {
    const registrationResponse = JSON.parse(response);
    await verifyPasskeyRegistration(registrationResponse, password);
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Enrollment failed" };
  }
}, "passkey-enroll");

export default function PasskeyEnroll() {
  const submission = useSubmission(passkeyEnrollAction);
  const { register, loading, error, setError } = usePasskeyRegistration();
  const [password, setPassword] = createSignal("");
  const [showPasswordForm, setShowPasswordForm] = createSignal(false);
  const [pendingCredential, setPendingCredential] = createSignal<any>(null);

  const handleEnroll = async () => {
    try {
      const credential = await register();
      setPendingCredential(credential);
      setShowPasswordForm(true);
    } catch {
      // Error already handled by hook
    }
  };

  const handlePasswordSubmit = async (e: Event) => {
    e.preventDefault();
    
    if (!pendingCredential() || !password()) {
      setError("Missing required data");
      return;
    }

    const form = new FormData();
    form.append("response", JSON.stringify(pendingCredential()));
    form.append("password", password());
    
    const result = await passkeyEnrollAction(form);
    if (result?.success) {
      window.location.href = "/search";
    }
  };

  return (
    <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div class="w-full max-w-md">
        <div class="bg-white rounded-lg shadow-lg p-8">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-black">Configurar Passkey</h1>
            <p class="text-gray-500 mt-2">
              Tu cuenta requiere un passkey para mayor seguridad
            </p>
          </div>

          <Show when={error()}>
            <div class="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <p class="text-red-600 text-sm">{error()}</p>
            </div>
          </Show>

          <Show when={submission.result?.error}>
            <div class="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <p class="text-red-600 text-sm">{submission.result?.error}</p>
            </div>
          </Show>

          <Show
            when={showPasswordForm()}
            fallback={
              <div class="text-center space-y-4">
                <div class="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                  <p class="text-blue-800 text-sm">
                    Vas a crear un passkey que te permitirá acceder de forma segura usando tu dispositivo (huella dactilar, Face ID, etc.).
                  </p>
                </div>
                
                <button
                  onClick={handleEnroll}
                  disabled={loading()}
                  class="w-full px-4 py-3 bg-black text-white rounded font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading() ? "Configurando..." : "Crear Passkey"}
                </button>
                
                <a
                  href="/login"
                  class="inline-block text-sm text-gray-600 hover:text-black underline"
                >
                  Volver al login
                </a>
              </div>
            }
          >
            <form onSubmit={handlePasswordSubmit} class="space-y-4">
              <div class="bg-green-50 border border-green-200 rounded p-4 mb-4">
                <p class="text-green-800 text-sm">
                  Passkey creado exitosamente. Confirma tu contraseña para completar la configuración.
                </p>
              </div>

              <div>
                <label
                  for="password"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Confirma tu contraseña <span class="text-red-600">*</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password()}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <button
                type="submit"
                disabled={submission.pending || !password()}
                class="w-full px-4 py-2 bg-black text-white rounded font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {submission.pending ? "Finalizando..." : "Completar Configuración"}
              </button>
            </form>
          </Show>
        </div>
      </div>
    </div>
  );
}