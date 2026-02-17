import { createSignal, For, Show } from "solid-js";

import { searchClients } from "~/actions/client-search";
import { EmptyState } from "~/components/feedback/empty-state";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { getErrorMessage } from "~/lib/errors";
import {
  SEARCH_TYPES,
  type SearchResult,
  type SearchType,
} from "~/server/shared/engine/types";

const SEARCH_LABELS = {
  dni: "DNI",
  ruc: "RUC",
  phone: "Teléfono",
  person_name: "Nombre de persona",
  company_name: "Nombre de empresa",
  phone_enriched: "Teléfono enriquecido",
} as const satisfies Record<SearchType, string>;

function isSearchType(value: string): value is SearchType {
  return SEARCH_TYPES.some((type) => type === value);
}

export default function ClientSearchPage() {
  const [searchType, setSearchType] = createSignal<SearchType>("dni");
  const [query, setQuery] = createSignal("");
  const [limit, setLimit] = createSignal("20");
  const [searching, setSearching] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [results, setResults] = createSignal<SearchResult[]>([]);
  const [resultCount, setResultCount] = createSignal(0);
  const [searched, setSearched] = createSignal(false);

  const runSearch = async (event: SubmitEvent) => {
    event.preventDefault();
    setSearching(true);
    setError(null);

    try {
      const response = await searchClients(
        searchType(),
        query(),
        Number.parseInt(limit(), 10),
      );
      setResults(response.results);
      setResultCount(response.count);
      setSearched(true);
    } catch (searchError: unknown) {
      setResults([]);
      setResultCount(0);
      setSearched(true);
      setError(
        getErrorMessage(searchError, "No se pudo completar la búsqueda"),
      );
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (event: SubmitEvent) => {
    void runSearch(event);
  };

  return (
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Búsqueda de clientes</h1>
        <p class="text-sm text-gray-500 mt-1">
          Busca información por DNI, RUC, teléfono o nombre.
        </p>
      </div>

      <form
        class="rounded-md border bg-white p-4 space-y-4"
        onSubmit={handleSearch}
      >
        <div class="grid gap-4 md:grid-cols-3">
          <Select
            label="Tipo de búsqueda"
            value={searchType()}
            onInput={(event) => {
              const nextType = event.currentTarget.value;
              if (!isSearchType(nextType)) return;
              setSearchType(nextType);
            }}
          >
            <For each={SEARCH_TYPES}>
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
        </div>
        <div class="flex justify-end">
          <Button type="submit" disabled={searching()}>
            <Show when={searching()} fallback="Buscar">
              Buscando...
            </Show>
          </Button>
        </div>
      </form>

      <Show when={error()}>
        {(message) => (
          <div class="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {message()}
          </div>
        )}
      </Show>

      <Show when={searched() && !error() && resultCount() === 0}>
        <EmptyState
          title="Sin resultados"
          description="No se encontraron clientes con los filtros indicados."
        />
      </Show>

      <Show when={results().length > 0}>
        <div class="space-y-2">
          <p class="text-sm text-muted-foreground">
            {resultCount()} resultados encontrados
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DNI</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>RUC</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Teléfono primario</TableHead>
                <TableHead>Teléfono secundario</TableHead>
                <TableHead>Teléfonos relacionados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={results()}>
                {(item) => (
                  <TableRow>
                    <TableCell class="font-medium">{item.dni}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.org_ruc ?? "—"}</TableCell>
                    <TableCell>{item.org_name ?? "—"}</TableCell>
                    <TableCell>{item.phone_primary ?? "—"}</TableCell>
                    <TableCell>{item.phone_secondary ?? "—"}</TableCell>
                    <TableCell>
                      {item.sibling_phones?.join(", ") ?? "—"}
                    </TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </div>
      </Show>
    </div>
  );
}
