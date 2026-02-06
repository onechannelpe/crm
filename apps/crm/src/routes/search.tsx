import { createSignal, For } from "solid-js";
import LayoutShell from "~/components/layout-shell";
import ResultRow, { type SearchResult } from "~/components/search/result-row";
import SearchFilters from "~/components/search/search-filters";

export default function SearchPage() {
  const [query, setQuery] = createSignal("");

  const [results] = createSignal<SearchResult[]>([
    {
      id: "1",
      type: "EMPRESA",
      initials: "IP",
      name: "INVERSIONES PERUANAS S.A.C.",
      identifier: "20556677889",
      roleOrIndustry: "Finanzas y Banca",
      status: "Activo",
      phone: "998-554-112",
      location: "Lima, Perú",
    },
    {
      id: "2",
      type: "PERSONA",
      initials: "JP",
      name: "Juan Alberto Pérez Gómez",
      identifier: "DNI 44556677",
      roleOrIndustry: "Representante Legal",
      status: "Activo",
      phone: "987-654-321",
      location: "Arequipa, Perú",
    },
    {
      id: "3",
      type: "EMPRESA",
      initials: "CL",
      name: "Credicorp Ltd.",
      identifier: "20100055234",
      roleOrIndustry: "Holding",
      status: "Activo",
      phone: "01 313-2000",
      location: "Lima, Perú",
    },
  ]);

  const filteredResults = () => {
    const q = query().toLowerCase();
    if (!q) return results();
    return results().filter(
      (r) => r.name.toLowerCase().includes(q) || r.identifier.includes(q),
    );
  };

  return (
    <LayoutShell sidebar={<SearchFilters />}>
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold text-gray-900">
          {filteredResults().length} registros encontrados
        </h2>
        <button class="md:hidden px-3 py-1.5 border border-gray-300 rounded text-sm font-medium">
          Filtros
        </button>
      </div>

      <div class="mb-8 relative group">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg
            class="h-5 w-5 text-gray-400 group-focus-within:text-black transition-colors"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <input
          type="text"
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          placeholder="Buscar por nombre, RUC, DNI o teléfono..."
          class="block w-full pl-11 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all shadow-sm"
        />
      </div>

      <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div class="flex items-center gap-4 py-3 px-4 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div class="w-4" />
          <div class="w-10" />
          <div class="flex-1 grid grid-cols-12 gap-4">
            <div class="col-span-12 sm:col-span-5">Nombre / ID</div>
            <div class="hidden sm:block sm:col-span-3">Detalles</div>
            <div class="hidden sm:block sm:col-span-2 text-right">Estado</div>
            <div class="hidden sm:block sm:col-span-2 text-right">Contacto</div>
          </div>
        </div>

        <For
          each={filteredResults()}
          fallback={
            <div class="p-12 text-center text-gray-500">
              No se encontraron resultados.
            </div>
          }
        >
          {(item) => <ResultRow result={item} />}
        </For>
      </div>

      <div class="mt-4 text-center">
        <p class="text-sm text-gray-500">
          Mostrando {filteredResults().length} de {results().length} resultados
        </p>
      </div>
    </LayoutShell>
  );
}
