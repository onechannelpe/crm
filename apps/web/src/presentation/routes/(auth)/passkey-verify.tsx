import { Button } from "~/presentation/ui/primitives/button";

export default function PasskeyVerifyPage() {
  return (
    <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div class="w-full max-w-md">
        <div class="bg-white rounded-lg shadow-lg p-8">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-black">Verificar Passkey</h1>
            <p class="text-gray-500 mt-2">
              Usa tu passkey para completar el inicio de sesión
            </p>
          </div>

          <div class="space-y-4">
            <Button class="w-full">
              Verificar con Passkey
            </Button>
            
            <a
              href="/login"
              class="block text-center text-sm text-gray-600 hover:text-black underline"
            >
              Volver al login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
