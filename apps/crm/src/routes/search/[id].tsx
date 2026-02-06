import { A, useParams } from "@solidjs/router";
import { createResource, Show } from "solid-js";
import LayoutShell from "~/components/layout-shell";
import SearchFilters from "~/components/search/search-filters";
import { getEntityById } from "~/server/search-actions";

export default function DetailPage() {
  const params = useParams();
  const [entity] = createResource(() => Number(params.id), getEntityById);

  return (
    <LayoutShell sidebar={<SearchFilters />}>
      <div class="mb-6">
        <A href="/search" class="text-sm text-gray-500 hover:text-black">
          ← Volver
        </A>
      </div>

      <Show when={entity()} fallback={<div>Cargando...</div>}>
        <div class="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div class="p-8 bg-gray-50 border-b">
            <div class="flex gap-6 items-center">
              <div class="h-20 w-20 bg-white border rounded-full flex items-center justify-center text-2xl font-bold">
                {entity().initials}
              </div>
              <div>
                <h1 class="text-2xl font-bold">{entity().name}</h1>
                <div class="flex gap-2 mt-2">
                  <span class="px-2 py-0.5 bg-gray-200 rounded text-xs font-mono">
                    {entity().identifier}
                  </span>
                  <span class="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-bold uppercase">
                    {entity().status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="grid md:grid-cols-2 gap-px bg-gray-200">
            <div class="bg-white p-8">
              <h3 class="text-sm font-bold uppercase mb-4 text-gray-500">
                Información general
              </h3>
              <p class="text-sm">
                <span class="text-gray-500 block">Industria:</span>{" "}
                {entity().role_or_industry}
              </p>
              <p class="text-sm mt-4">
                <span class="text-gray-500 block">Ubicación:</span>{" "}
                {entity().location}
              </p>
            </div>
            <div class="bg-white p-8">
              <h3 class="text-sm font-bold uppercase mb-4 text-gray-500">
                Contacto
              </h3>
              <p class="text-sm">
                <span class="text-gray-500 block">Teléfono:</span>{" "}
                {entity().phone}
              </p>
            </div>
          </div>
        </div>
      </Show>
    </LayoutShell>
  );
}
