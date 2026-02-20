import { A, useNavigate, useSearchParams } from "@solidjs/router";
import { createMemo, For, onMount, Show } from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state";
import { AppPage } from "~/components/layout/page";
import { Badge } from "~/components/ui/display/badge";
import { Button } from "~/components/ui/input/button";
import { createClientSearchController } from "~/features/client-search/controller";
import { groupCompaniesByRuc } from "~/features/client-search/grouping";
import {
  ClientSearchError,
  ClientSearchFiltersForm,
  ClientSearchHeader,
  ClientSearchHint,
  ClientSearchStatus,
} from "~/features/client-search/ui";

const COMPANY_SEARCH_TYPES = [
  "ruc",
  "company_name",
  "phone",
  "phone_enriched",
] as const;

const SEARCH_LABELS = {
  ruc: "RUC",
  company_name: "Nombre de empresa",
  phone: "Teléfono",
  phone_enriched: "Teléfono enriquecido",
} as const satisfies Record<(typeof COMPANY_SEARCH_TYPES)[number], string>;

export default function ClientSearchCompaniesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const controller = createClientSearchController({
    defaultType: "ruc",
    allowedTypes: COMPANY_SEARCH_TYPES,
    searchParams,
    errorFallback: "No se pudo completar la búsqueda",
  });

  const grouped = createMemo(() => groupCompaniesByRuc(controller.results()));

  onMount(() => {
    void controller.initializeFromParams();
  });

  return (
    <AppPage>
      <ClientSearchHeader
        current="companies"
        title="Empresas"
        description="Se agrupa por RUC. Incluye personas y números asociados por empresa."
      />

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
        <ClientSearchFiltersForm
          searchType={controller.searchType()}
          allowedTypes={COMPANY_SEARCH_TYPES}
          labels={SEARCH_LABELS}
          query={controller.query()}
          limit={controller.limit()}
          searching={controller.searching()}
          submitLabel="Buscar empresas"
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
              description="No se encontraron empresas con los filtros indicados."
            />
          </Show>

          <For each={grouped()}>
            {(company) => (
              <article class="crm-surface rounded-3xl px-4 py-4 md:px-5">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p class="text-base font-semibold text-foreground">
                      {company.name ?? "Empresa sin nombre"}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {company.ruc ? `RUC ${company.ruc}` : "Sin RUC"}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {company.rows.length} registros fuente
                  </Badge>
                </div>

                <div class="mt-3 grid gap-3 md:grid-cols-2">
                  <div class="space-y-1">
                    <p class="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                      Persona de referencia
                    </p>
                    <Show
                      when={company.people[0]}
                      fallback={
                        <p class="text-sm text-muted-foreground">
                          No disponible
                        </p>
                      }
                    >
                      {(representative) => (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          class="h-7 px-2.5 text-xs"
                          onClick={() => {
                            const href = `/client-search/people?type=dni&query=${encodeURIComponent(representative().dni)}`;
                            navigate(href);
                          }}
                        >
                          {representative().name || representative().dni}
                        </Button>
                      )}
                    </Show>
                  </div>

                  <div class="space-y-1">
                    <p class="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                      Números asociados
                    </p>
                    <Show
                      when={company.phones.length > 0}
                      fallback={
                        <p class="text-sm text-muted-foreground">
                          Sin números asociados
                        </p>
                      }
                    >
                      <div class="flex flex-wrap gap-2">
                        <For each={company.phones}>
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

                <Show when={company.people.length > 1}>
                  <div class="mt-3 border-t border-border/60 pt-3">
                    <p class="mb-1 text-xs uppercase tracking-[0.1em] text-muted-foreground">
                      Personas asociadas
                    </p>
                    <div class="flex flex-wrap gap-2">
                      <For each={company.people.slice(1)}>
                        {(person) => (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            class="h-7 px-2.5 text-xs"
                            onClick={() => {
                              const href = `/client-search/people?type=dni&query=${encodeURIComponent(person.dni)}`;
                              navigate(href);
                            }}
                          >
                            {person.name || person.dni}
                          </Button>
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
              Ir a <A href="/client-search/people">personas</A>.
            </ClientSearchHint>
          </Show>
        </section>
      </div>
    </AppPage>
  );
}
