import { A, useNavigate, useSearchParams } from "@solidjs/router";
import { createMemo, For, onMount, Show } from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state";
import { AppPage } from "~/components/layout/page";
import { Badge } from "~/components/ui/badge";
import { createClientSearchController } from "~/features/client-search/controller";
import { groupPeopleByDni } from "~/features/client-search/grouping";
import {
  ClientSearchError,
  ClientSearchFiltersForm,
  ClientSearchHeader,
  ClientSearchHint,
  ClientSearchStatus,
} from "~/features/client-search/ui";

const PEOPLE_SEARCH_TYPES = [
  "dni",
  "person_name",
  "phone",
  "phone_enriched",
] as const;

const SEARCH_LABELS = {
  dni: "DNI",
  person_name: "Nombre de persona",
  phone: "Teléfono",
  phone_enriched: "Teléfono enriquecido",
} as const satisfies Record<(typeof PEOPLE_SEARCH_TYPES)[number], string>;

export default function ClientSearchPeoplePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const controller = createClientSearchController({
    defaultType: "dni",
    allowedTypes: PEOPLE_SEARCH_TYPES,
    searchParams,
    errorFallback: "No se pudo completar la búsqueda",
  });

  const grouped = createMemo(() => groupPeopleByDni(controller.results()));

  onMount(() => {
    void controller.initializeFromParams();
  });

  return (
    <AppPage>
      <ClientSearchHeader
        current="people"
        title="Personas"
        description="Se agrupa por DNI. Múltiples filas con el mismo DNI se muestran como una sola persona."
      />

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
        <ClientSearchFiltersForm
          searchType={controller.searchType()}
          allowedTypes={PEOPLE_SEARCH_TYPES}
          labels={SEARCH_LABELS}
          query={controller.query()}
          limit={controller.limit()}
          searching={controller.searching()}
          submitLabel="Buscar personas"
          onSearchTypeChange={(value) => controller.setSearchType(value)}
          onQueryChange={(value) => controller.setQuery(value)}
          onLimitChange={(value) => controller.setLimit(value)}
          onSubmit={(event) => {
            event.preventDefault();
            void controller.runCurrentSearch();
          }}
        />

        <section class="space-y-3">
          <ClientSearchStatus
            searched={controller.searched()}
            count={grouped().length}
          />

          <ClientSearchError message={controller.error()} />

          <Show
            when={
              controller.searched() &&
              !controller.error() &&
              grouped().length === 0
            }
          >
            <EmptyState
              title="Sin resultados"
              description="No se encontraron personas con los filtros indicados."
            />
          </Show>

          <For each={grouped()}>
            {(person) => (
              <article class="crm-surface rounded-3xl px-4 py-4 md:px-5">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p class="text-base font-semibold text-foreground">
                      {person.displayName || `Persona ${person.dni}`}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      DNI {person.dni}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {person.rows.length} registros fuente
                  </Badge>
                </div>

                <div class="mt-3 grid gap-3 md:grid-cols-2">
                  <div class="space-y-1">
                    <p class="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                      Empresas asociadas
                    </p>
                    <Show
                      when={person.companies.length > 0}
                      fallback={
                        <p class="text-sm text-muted-foreground">
                          Sin empresas asociadas
                        </p>
                      }
                    >
                      <div class="flex flex-wrap gap-2">
                        <For each={person.companies}>
                          {(company) => (
                            <button
                              type="button"
                              class="rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground hover:bg-secondary/80"
                              onClick={() => {
                                const href = company.ruc
                                  ? `/client-search/companies?type=ruc&query=${encodeURIComponent(company.ruc)}`
                                  : `/client-search/companies?type=company_name&query=${encodeURIComponent(company.name ?? "")}`;
                                navigate(href);
                              }}
                            >
                              {company.name ?? "Empresa sin nombre"}
                              <Show when={company.ruc}> ({company.ruc})</Show>
                            </button>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>

                  <div class="space-y-1">
                    <p class="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                      Números asociados
                    </p>
                    <Show
                      when={person.phones.length > 0}
                      fallback={
                        <p class="text-sm text-muted-foreground">
                          Sin números asociados
                        </p>
                      }
                    >
                      <div class="flex flex-wrap gap-2">
                        <For each={person.phones}>
                          {(phone) => (
                            <span class="rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground">
                              {phone}
                            </span>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                </div>

                <Show when={person.aliases.length > 1}>
                  <div class="mt-3 border-t border-border/60 pt-3">
                    <p class="mb-1 text-xs uppercase tracking-[0.1em] text-muted-foreground">
                      Nombres observados
                    </p>
                    <div class="flex flex-wrap gap-2">
                      <For each={person.aliases.slice(1)}>
                        {(alias) => (
                          <span class="rounded-full border border-border/80 px-2.5 py-1 text-xs text-foreground">
                            {alias}
                          </span>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </article>
            )}
          </For>

          <Show when={!controller.searched()}>
            <ClientSearchHint>
              Ir a <A href="/client-search/companies">empresas</A>.
            </ClientSearchHint>
          </Show>
        </section>
      </div>
    </AppPage>
  );
}
