import { A, useNavigate, useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, For, onMount, Show } from "solid-js";

import { searchClients } from "~/actions/client-search";
import { EmptyState } from "~/components/feedback/empty-state";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { groupCompaniesByRuc } from "~/features/client-search/grouping";
import { getErrorMessage } from "~/lib/errors";
import type { SearchResult, SearchType } from "~/server/shared/engine/types";

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

function isCompanySearchType(
  value: string,
): value is (typeof COMPANY_SEARCH_TYPES)[number] {
  return COMPANY_SEARCH_TYPES.some((type) => type === value);
}

function getFirstParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

export default function ClientSearchCompaniesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [searchType, setSearchType] =
    createSignal<(typeof COMPANY_SEARCH_TYPES)[number]>("ruc");
  const [query, setQuery] = createSignal("");
  const [limit, setLimit] = createSignal("20");
  const [searching, setSearching] = createSignal(false);
  const [searched, setSearched] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [results, setResults] = createSignal<SearchResult[]>([]);

  const grouped = createMemo(() => groupCompaniesByRuc(results()));

  const runSearch = async (
    type: SearchType,
    value: string,
    limitValue: number,
  ) => {
    setSearching(true);
    setError(null);
    try {
      const response = await searchClients(type, value, limitValue);
      setResults(response.results);
      setSearched(true);
    } catch (searchError: unknown) {
      setResults([]);
      setSearched(true);
      setError(
        getErrorMessage(searchError, "No se pudo completar la búsqueda"),
      );
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (event: SubmitEvent) => {
    event.preventDefault();
    const parsedLimit = Number.parseInt(limit(), 10);
    void runSearch(searchType(), query(), parsedLimit);
  };

  onMount(() => {
    const nextType = getFirstParam(searchParams.type);
    const nextQuery = getFirstParam(searchParams.query);
    const nextLimit = getFirstParam(searchParams.limit);
    if (!nextType || !nextQuery) return;
    if (!isCompanySearchType(nextType)) return;
    setSearchType(nextType);
    setQuery(nextQuery);
    if (nextLimit) setLimit(nextLimit);
    void runSearch(nextType, nextQuery, Number.parseInt(nextLimit ?? "20", 10));
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
              Empresas
            </h1>
            <p class="mt-2 max-w-[760px] text-sm text-muted-foreground md:text-base">
              Se agrupa por RUC. Incluye representante y números asociados por
              empresa.
            </p>
          </div>
          <div class="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigate("/client-search/people");
              }}
            >
              Personas
            </Button>
            <Button
              variant="secondary"
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
              value={searchType()}
              onInput={(event) => {
                const nextType = event.currentTarget.value;
                if (!isCompanySearchType(nextType)) return;
                setSearchType(nextType);
              }}
            >
              <For each={COMPANY_SEARCH_TYPES}>
                {(type) => <option value={type}>{SEARCH_LABELS[type]}</option>}
              </For>
            </Select>

            <Input
              label="Valor"
              placeholder="Ingresa valor de búsqueda"
              value={query()}
              onInput={(event) => setQuery(event.currentTarget.value)}
              required
            />

            <Input
              label="Límite"
              type="number"
              min="1"
              max="100"
              value={limit()}
              onInput={(event) => setLimit(event.currentTarget.value)}
              required
            />

            <Button type="submit" class="w-full" disabled={searching()}>
              <Show when={searching()} fallback="Buscar empresas">
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
                  when={searched()}
                  fallback="Define filtros y ejecuta una búsqueda."
                >
                  {grouped().length} empresas encontradas
                </Show>
              </p>
              <Show when={searched()}>
                <Badge variant="outline">{grouped().length}</Badge>
              </Show>
            </div>
          </div>

          <Show when={error()}>
            {(message) => (
              <div class="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {message()}
              </div>
            )}
          </Show>

          <Show when={searched() && !error() && grouped().length === 0}>
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
                      Representante legal
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
                        <button
                          type="button"
                          class="rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground hover:bg-secondary/80"
                          onClick={() => {
                            const href = `/client-search/people?type=dni&query=${encodeURIComponent(representative().dni)}`;
                            navigate(href);
                          }}
                        >
                          {representative().name || representative().dni}
                        </button>
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
                          <button
                            type="button"
                            class="rounded-full border border-border/80 px-2.5 py-1 text-xs text-foreground hover:bg-secondary/60"
                            onClick={() => {
                              const href = `/client-search/people?type=dni&query=${encodeURIComponent(person.dni)}`;
                              navigate(href);
                            }}
                          >
                            {person.name || person.dni}
                          </button>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </article>
            )}
          </For>

          <Show when={!searched()}>
            <div class="rounded-2xl border border-border/70 bg-white/70 px-4 py-3 text-sm text-muted-foreground">
              Ir a <A href="/client-search/people">personas</A>.
            </div>
          </Show>
        </section>
      </div>
    </div>
  );
}
