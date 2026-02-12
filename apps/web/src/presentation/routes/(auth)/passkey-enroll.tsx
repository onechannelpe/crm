import { Button } from "~/presentation/ui/primitives/button";

export default function PasskeyEnrollPage() {
  return (
    <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div class="w-full max-w-md">
        <div class="bg-white rounded-lg shadow-lg p-8">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-black">Configurar Passkey</h1>
            <p class="text-gray-500 mt-2">
              Tu cuenta requiere autenticación adicional
            </p>
          </div>

          <div class="space-y-4">
            <div class="bg-blue-50 border border-blue-200 rounded p-4">
              <p class="text-blue-800 text-sm">
                Configuraremos una passkey para mayor seguridad
              </p>
            </div>

            <Button class="w-full">
              Crear Passkey
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
