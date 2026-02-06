import { useNavigate } from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import { login } from "~/server/auth-actions";

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      await login(formData);
      navigate("/search", { replace: true });
    } catch (err) {
      setError("Correo o contraseña incorrectos");
      setLoading(false);
    }
  };

  return (
    <div class="min-h-screen bg-[#F9FAFB] flex flex-col items-center pt-24 sm:justify-center sm:pt-0">
      <div class="w-full max-w-100 p-4">
        <h1 class="text-3xl font-semibold text-center text-gray-900 mb-8">
          Iniciar sesión
        </h1>
        <div class="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <form class="space-y-4" onSubmit={handleSubmit}>
            <input
              name="email"
              type="email"
              placeholder="Correo"
              required
              class="w-full p-2 border rounded"
            />
            <input
              name="password"
              type="password"
              placeholder="Contraseña"
              required
              class="w-full p-2 border rounded"
            />
            <Show when={error()}>
              <p class="text-red-500 text-sm text-center">{error()}</p>
            </Show>
            <button
              type="submit"
              disabled={loading()}
              class="w-full py-2 bg-black text-white rounded font-medium disabled:opacity-50"
            >
              {loading() ? "Validando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
