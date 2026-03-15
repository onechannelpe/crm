import { createAsync, useSearchParams } from "@solidjs/router";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";

import { runDirectSearch } from "~/actions/search/use";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { mySearchAllowanceQuery } from "~/lib/queries/search";
import type { SearchResult, SearchType } from "~/server/shared/engine/types";

const SEARCH_OPTIONS: Array<{ label: string; value: SearchType }> = [
  { label: "DNI", value: "dni" },
  { label: "RUC", value: "ruc" },
  { label: "Nombre", value: "person_name" },
  { label: "Empresa", value: "company_name" },
  { label: "Teléfono", value: "phone" },
];

function isSearchType(value: string): value is SearchType {
  return SEARCH_OPTIONS.some((option) => option.value === value);
}

export default function SearchPage() {
  const searchAllowance = createAsync(() => mySearchAllowanceQuery(), {
    initialValue: null,
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = createSignal("");
  const [searchType, setSearchType] = createSignal<SearchType>("person_name");
  const [results, setResults] = createSignal<SearchResult[]>([]);
  const [searching, setSearching] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [localSearchConsumes, setLocalSearchConsumes] = createSignal(0);
  const resultCount = createMemo(() => results().length);

  createEffect(() => {
    const paramQuery =
      typeof searchParams.query === "string" ? searchParams.query : "";
    const paramType =
      typeof searchParams.type === "string" ? searchParams.type : "";
    if (paramQuery) {
      setQuery(paramQuery);
    }
    if (isSearchType(paramType)) {
      setSearchType(paramType);
    }
  });

  async function handleSearch(event?: Event) {
    event?.preventDefault();
    setSearching(true);
    setError(null);
    try {
      const response = await runDirectSearch(searchType(), query(), 20);
      setSearchParams({ type: searchType(), query: query(), limit: "20" });
      setResults(response.results);
      setLocalSearchConsumes((value) => value + 1);
    } catch (searchError) {
      setResults([]);
      setError(
        searchError instanceof Error ? searchError.message : "Search failed",
      );
    } finally {
      setSearching(false);
    }
  }

  createEffect(() => {
    if (!query()) return;
    if (results().length > 0) return;
    if (error()) return;
    if (!searchParams.query) return;
    void handleSearch();
  });

  return (
    <AppPage width="full">
      <div class="space-y-6">
        <div class="flex items-end justify-between gap-4">
          <div>
            <h2 class="text-2xl font-semibold">Buscar contactos</h2>
            <p class="text-sm text-muted-foreground">
              El consumo se descuenta de tu allowance mensual.
            </p>
          </div>
          <div class="rounded border px-4 py-3 text-sm">
            <div class="font-medium">Allowance</div>
            <div>
              {(searchAllowance()?.usedAmount ?? 0) + localSearchConsumes()}/
              {(searchAllowance()?.monthlySearchLimit ?? 0) +
                (searchAllowance()?.extraGranted ?? 0)}
            </div>
            <div class="text-muted-foreground">
              {Math.max(
                0,
                (searchAllowance()?.remaining ?? 0) - localSearchConsumes(),
              )}{" "}
              restantes
            </div>
          </div>
        </div>

        <form class="flex gap-3" onSubmit={(event) => void handleSearch(event)}>
          <select
            class="rounded border px-3 py-2"
            value={searchType()}
            onInput={(event) =>
              setSearchType(event.currentTarget.value as SearchType)
            }
          >
            <For each={SEARCH_OPTIONS}>
              {(option) => <option value={option.value}>{option.label}</option>}
            </For>
          </select>
          <Input
            label="Consulta"
            value={query()}
            onInput={(event) => setQuery(event.currentTarget.value)}
            required
          />
          <Button type="submit" disabled={searching()}>
            {searching() ? "Buscando..." : "Buscar"}
          </Button>
        </form>

        <Show when={error()}>
          {(message) => <p class="text-sm text-destructive">{message()}</p>}
        </Show>

        <Show when={resultCount() > 0}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>RUC</TableHead>
                <TableHead>Teléfono</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={results()}>
                {(result) => (
                  <TableRow>
                    <TableCell>{result.person.name ?? "Sin nombre"}</TableCell>
                    <TableCell>{result.person.dni}</TableCell>
                    <TableCell>{result.org?.name ?? "Sin empresa"}</TableCell>
                    <TableCell>{result.org?.ruc ?? "-"}</TableCell>
                    <TableCell>{result.phones.primary ?? "-"}</TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </Show>
      </div>
    </AppPage>
  );
}
