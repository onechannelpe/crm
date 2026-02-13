import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { login } from "~/actions/auth";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { getErrorMessage } from "~/lib/errors";

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
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Credenciales inválidas"));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div class="min-h-screen grid items-center justify-center bg-gray-50/50 px-4">
            <div class="w-full max-w-[400px] space-y-8">
                {/* Logo Section */}
                <div class="flex flex-col items-center space-y-4 text-center">
                    <div class="bg-black text-white p-3 rounded-xl">
                        {/* Simple Logo Placeholder */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-8">
                            <title>OneChannel logo</title>
                            <path fill-rule="evenodd" d="M3 6a3 3 0 0 1 3-3h2.25a3 3 0 0 1 3 3v2.25a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Zm9.75 0a3 3 0 0 1 3-3H18a3 3 0 0 1 3 3v2.25a3 3 0 0 1-3 3h-2.25a3 3 0 0 1-3-3V6ZM3 15.75a3 3 0 0 1 3-3h2.25a3 3 0 0 1 3 3V18a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2.25Zm9.75 0a3 3 0 0 1 3-3H18a3 3 0 0 1 3 3V18a3 3 0 0 1-3 3h-2.25a3 3 0 0 1-3-3v-2.25Z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
                        Sign in
                    </h1>
                </div>

                {/* Login Form */}
                <Card class="border-0 shadow-none sm:border sm:shadow-sm bg-transparent sm:bg-white">
                    <CardHeader class="pb-0" /> {/* Spacer */}
                    <CardContent class="space-y-6">
                        <form onSubmit={handleSubmit} class="space-y-4">
                            <div class="space-y-2">
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Email address"
                                    value={email()}
                                    onInput={(e) => setEmail(e.currentTarget.value)}
                                    required
                                    class="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all"
                                />
                            </div>
                            <div class="space-y-2">
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Password"
                                    value={password()}
                                    onInput={(e) => setPassword(e.currentTarget.value)}
                                    required
                                    class="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all"
                                />
                            </div>

                            <Show when={error()}>
                                <div class="text-sm text-destructive font-medium text-center">
                                    {error()}
                                </div>
                            </Show>

                            <Button
                                type="submit"
                                class="w-full h-11 text-base bg-blue-600 hover:bg-blue-700 shadow-sm"
                                disabled={loading()}
                            >
                                {loading() ? "Signing in..." : "Sign in"}
                            </Button>
                        </form>

                        <div class="text-center">
                            <a href="mailto:support@onechannel.local" class="text-sm text-muted-foreground hover:text-primary transition-colors">
                                Forgot your password?
                            </a>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer / Create Account */}
                <div class="text-center space-y-4">
                    <p class="text-sm text-muted-foreground">
                        Don't have a Column account?
                    </p>
                    <Button variant="outline" class="w-full h-11 bg-white hover:bg-gray-50 border-gray-200 shadow-sm">
                        Create New Account
                    </Button>
                </div>

                {/* Disclaimer */}
                <p class="text-xs text-center text-gray-400 px-8">
                    This site is protected by reCAPTCHA and the Google
                    <a href="https://policies.google.com/privacy" class="hover:underline mx-1">Privacy Policy</a>
                    and
                    <a href="https://policies.google.com/terms" class="hover:underline mx-1">Terms of Service</a>
                    apply.
                </p>
            </div>
        </div>
    );
}
