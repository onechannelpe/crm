import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { login } from "~/actions/auth";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = createSignal("");
    const [password, setPassword] = createSignal("");
    const [error, setError] = createSignal("");
    const [loading, setLoading] = createSignal(false);

    async function handleSubmit(e: Event) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await login(email(), password());
            navigate("/dashboard");
        } catch (err: any) {
            setError(err.message || "Error de autenticación");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div class="w-full max-w-md">
                <div class="bg-white rounded-lg shadow-lg p-8">
                    <div class="text-center mb-8">
                        <h1 class="text-3xl font-bold text-black">CRM</h1>
                        <p class="text-gray-500 mt-2">Inicia sesión para continuar</p>
                    </div>

                    <form onSubmit={handleSubmit} class="space-y-4">
                        <Input
                            type="email"
                            label="Correo electrónico"
                            value={email()}
                            onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                            placeholder="correo@empresa.com"
                            required
                            autocomplete="email"
                        />

                        <Input
                            type="password"
                            label="Contraseña"
                            value={password()}
                            onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                            placeholder="********"
                            required
                            autocomplete="current-password"
                        />

                        <Show when={error()}>
                            <div class="bg-red-50 border border-red-200 rounded p-3">
                                <p class="text-red-600 text-sm">{error()}</p>
                            </div>
                        </Show>

                        <Button
                            type="submit"
                            disabled={loading()}
                            class="w-full"
                        >
                            {loading() ? "Validando..." : "Ingresar"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
