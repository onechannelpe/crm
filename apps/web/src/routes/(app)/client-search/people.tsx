import { A, useNavigate, useSearchParams } from "@solidjs/router";
import { createMemo, For, onMount, Show } from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { createClientSearchController } from "~/features/client-search/controller";
import { groupPeopleByDni } from "~/features/client-search/grouping";

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

  const handleSearch = (event: SubmitEvent) => {
    event.preventDefault();
    void controller.runCurrentSearch();
  };

  onMount(() => {
    void controller.initializeFromParams();
  });

  return (
    <div class="space-y-6 pb-8">
      <div class="crm-surface rounded-3xl p-6 md:p-7">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Búsqueda
            </p>
            <h1 class="mt-1 text-3xl font-semibold text-foreground md:text-4xl">
              Personas
            </h1>
            <p class="mt-2 max-w-[760px] text-sm text-muted-foreground md:text-base">
              Se agrupa por DNI. Múltiples filas con el mismo DNI se muestran
              como una sola persona.
            </p>
          </div>
          <div class="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                navigate("/client-search/people");
              }}
            >
              Personas
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                navigate("/client-search/companies");
              }}
            >
              Empresas
            </Button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
        <aside class="crm-surface rounded-3xl p-4 md:p-5">
          <form class="space-y-4" onSubmit={handleSearch}>
            <Select
              label="Tipo de búsqueda"
              value={controller.searchType()}
              onInput={(event) => {
                const nextType = event.currentTarget.value;
                if (!controller.isAllowedType(nextType)) return;
                controller.setSearchType(nextType);
              }}
            >
              <For each={PEOPLE_SEARCH_TYPES}>
                {(type) => <option value={type}>{SEARCH_LABELS[type]}</option>}
              </For>
            </Select>

            <Input
              label="Valor"
              placeholder="Ingresa valor de búsqueda"
              value={controller.query()}
              onInput={(event) =>
                controller.setQuery(event.currentTarget.value)
              }
              required
            />

            <Input
              label="Límite"
              type="number"
              min="1"
              max="100"
              value={controller.limit()}
              onInput={(event) =>
                controller.setLimit(event.currentTarget.value)
              }
              required
            />

            <Button
              type="submit"
              class="w-full"
              disabled={controller.searching()}
            >
              <Show when={controller.searching()} fallback="Buscar personas">
                Buscando...
              </Show>
            </Button>
          </form>
        </aside>

        <section class="space-y-3">
          <div class="crm-surface rounded-3xl p-4 md:p-5">
            <div class="flex items-center justify-between">
              <p class="text-sm text-muted-foreground">
                <Show
                  when={controller.searched()}
                  fallback="Define filtros y ejecuta una búsqueda."
                >
                  {grouped().length} personas encontradas
                </Show>
              </p>
              <Show when={controller.searched()}>
                <Badge variant="outline">{grouped().length}</Badge>
              </Show>
            </div>
          </div>

          <Show when={controller.error()}>
            {(message) => (
              <div class="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {message()}
              </div>
            )}
          </Show>

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
            <div class="rounded-2xl border border-border/70 bg-white/70 px-4 py-3 text-sm text-muted-foreground">
              Ir a <A href="/client-search/companies">empresas</A>.
            </div>
          </Show>
        </section>
      </div>
    </div>
  );
}
