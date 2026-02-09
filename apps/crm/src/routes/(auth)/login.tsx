import { action, redirect, useSubmission } from "@solidjs/router";
import { Show } from "solid-js";
import { setCookie } from "vinxi/http";
import { login } from "~/lib/server/api";

const loginAction = action(async (formData: FormData) => {
  "use server";

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    const result = await login(email, password);

    if (result.sessionCookie) {
      const match = result.sessionCookie.match(/session=([^;]+)/);
      if (match) {
        setCookie("session", match[1], {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30,
          path: "/",
        });
      }
    }

    throw redirect("/search");
  } catch (error: any) {
    return { error: error.message || "Error al iniciar sesión" };
  }
});

export default function Login() {
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
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico <span class="text-red-600">*</span>
              </label>
              <input
                name="email"
                type="email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Contraseña <span class="text-red-600">*</span>
              </label>
              <input
                name="password"
                type="password"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <Show when={submission.result?.error}>
              <div class="bg-red-50 border border-red-200 rounded p-3">
                <p class="text-red-600 text-sm">{submission.result?.error}</p>
              </div>
            </Show>

            <button
              type="submit"
              disabled={submission.pending}
              class="w-full px-4 py-2 bg-black text-white rounded font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {submission.pending ? "Validando..." : "Ingresar"}
            </button>
          </form>

          <div class="mt-6 pt-6 border-t border-gray-200">
            <p class="text-xs text-gray-500 text-center">
              Credenciales de prueba:
              <br />
              <span class="font-mono">exec@crm.com / exec123</span>
              <br />
              <span class="font-mono">backoffice@crm.com / back123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
