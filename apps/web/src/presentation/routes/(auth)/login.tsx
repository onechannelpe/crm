import { useSubmission } from "@solidjs/router";
import { Show } from "solid-js";
import { Button } from "~/presentation/ui/primitives/button";
import { Input } from "~/presentation/ui/primitives/input";
import { loginAction } from "~/presentation/actions/auth";

export default function LoginPage() {
  const submission = useSubmission(loginAction);

  return (
    <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div class="w-full max-w-md">
        <div class="bg-white rounded-lg shadow-lg p-8">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-black">CRM</h1>
            <p class="text-gray-500 mt-2">Inicia sesión para continuar</p>
          </div>

          <form action={loginAction} method="post" class="space-y-4">
            <Input
              name="email"
              type="email"
              label="Correo electrónico"
              required
            />

            <Input
              name="password"
              type="password"
              label="Contraseña"
              required
            />

            <Show when={submission.result?.error}>
              <div class="bg-red-50 border border-red-200 rounded p-3">
                <p class="text-red-600 text-sm">{submission.result?.error}</p>
              </div>
            </Show>

            <Button
              type="submit"
              disabled={submission.pending}
              class="w-full"
            >
              {submission.pending ? "Validando..." : "Ingresar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
