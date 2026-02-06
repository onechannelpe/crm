export default function CreateUserForm() {
  return (
    <div class="p-6">
      <div class="mb-6">
        <h3 class="text-base font-semibold text-gray-900 mb-1">
          Agregar usuario
        </h3>
        <p class="text-sm text-gray-500">
          Crea credenciales para acceso a la base de datos.
        </p>
      </div>

      <form class="space-y-4">
        <div class="space-y-1">
          <label class="block text-xs font-medium text-gray-700">
            Nombre completo
          </label>
          <input
            type="text"
            placeholder="Ej. Juan Pérez"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div class="space-y-1">
          <label class="block text-xs font-medium text-gray-700">
            Correo corporativo
          </label>
          <input
            type="email"
            placeholder=""
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div class="space-y-1">
          <label class="block text-xs font-medium text-gray-700">Rol</label>
          <div class="relative">
            <select class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black appearance-none bg-white">
              <option value="searcher">Agente (solo lectura)</option>
              <option value="admin">Admin (acceso total)</option>
            </select>

            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                <path
                  d="M1 1L5 5L9 1"
                  stroke="#6B7280"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="w-full mt-2 flex justify-center py-2 px-4 rounded-lg text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors"
        >
          Crear usuario
        </button>
      </form>
    </div>
  );
}
