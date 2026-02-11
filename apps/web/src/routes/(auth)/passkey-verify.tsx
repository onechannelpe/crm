import { action, useSubmission } from "@solidjs/router";
import { Show, createSignal } from "solid-js";
import { verifyPasskeyAuthentication } from "~/server/auth/passkey";
import { requireAuth } from "~/server/auth/session";
import { db } from "~/server/db/client";
import { usePasskeyAuthentication } from "~/lib/shared/passkey-hooks";

const passkeyVerifyAction = action(async (formData: FormData) => {
  "use server";

  const { userId } = await requireAuth();
  const response = formData.get("response") as string;

  if (!response) {
    return { error: "Passkey verification failed" };
  }

  try {
    const user = await db
      .selectFrom("users")
      .select(["email"])
      .where("id", "=", userId)
      .executeTakeFirstOrThrow();

    const authResponse = JSON.parse(response);
    await verifyPasskeyAuthentication(user.email, authResponse);
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Verification failed" };
  }
}, "passkey-verify");

export default function PasskeyVerify() {
  const submission = useSubmission(passkeyVerifyAction);
  const { authenticate, loading, error, setError } = usePasskeyAuthentication();
  const [isReady, setIsReady] = createSignal(true);

  const handleVerify = async () => {
    try {
      const credential = await authenticate();
      const form = new FormData();
      form.append("response", JSON.stringify(credential));
      
      const result = await passkeyVerifyAction(form);
      if (result?.success) {
        window.location.href = "/search";
      } else {
        setError(result?.error || "Verification failed");
      }
    } catch {
      // Error already handled by hook
    }
  };

  return (
    <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div class="w-full max-w-md">
        <div class="bg-white rounded-lg shadow-lg p-8">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-black">Verificación de Passkey</h1>
            <p class="text-gray-500 mt-2">Usa tu passkey para completar el inicio de sesión</p>
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

          <div class="text-center space-y-4">
            <Show
              when={isReady()}
              fallback={<div class="text-gray-500">Error al cargar</div>}
            >
              <button
                onClick={handleVerify}
                disabled={loading() || submission.pending}
                class="w-full px-4 py-3 bg-black text-white rounded font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading() || submission.pending ? "Verificando..." : "Verificar con Passkey"}
              </button>
            </Show>
            
            <a
              href="/login"
              class="inline-block text-sm text-gray-600 hover:text-black underline"
            >
              Volver al login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}