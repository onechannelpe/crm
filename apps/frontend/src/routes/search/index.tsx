import { createResource, createSignal, For, Show } from "solid-js";
import LayoutShell from "~/components/layout-shell";
import ResultRow from "~/components/search/result-row";
import SearchFilters from "~/components/search/search-filters";
import { searchEntities } from "~/server/search-actions";

export default function SearchPage() {
  const [query, setQuery] = createSignal("");
  const [results] = createResource(query, searchEntities);

  return (
    <LayoutShell sidebar={<SearchFilters />}>
      <div class="mb-8">
        <input
          type="text"
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          placeholder="Buscar empresa o persona..."
          class="w-full p-4 border rounded-xl text-lg shadow-sm focus:ring-2 focus:ring-black focus:outline-none"
        />
      </div>

      <div class="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div class="bg-gray-50 p-3 text-xs font-semibold text-gray-500 uppercase flex gap-4">
          <div class="w-4"></div>
          <div class="w-10"></div>
          <div class="flex-1 grid grid-cols-12 gap-4">
            <div class="col-span-5">Nombre / ID</div>
            <div class="col-span-3">Detalles</div>
            <div class="col-span-2 text-right">Estado</div>
            <div class="col-span-2 text-right">Contacto</div>
          </div>
        </div>

        <Show
          when={!results.loading}
          fallback={<div class="p-8 text-center">Cargando...</div>}
        >
          <For
            each={results()}
            fallback={
              <div class="p-8 text-center text-gray-500">Sin resultados</div>
            }
          >
            {(item) => <ResultRow result={item} />}
          </For>
        </Show>
      </div>
    </LayoutShell>
  );
}
