import { createAsync, revalidate, useSearchParams } from "@solidjs/router";
import { createEffect, createMemo, createSignal, Show } from "solid-js";

import { runDirectSearch } from "~/actions/search/use";
import { AppPage } from "~/components/layout/page";
import {
  inferSearchType,
  type SearchTab,
} from "~/features/search/model/display";
import { createSearchViewModel } from "~/features/search/model/search-view-model";
import { SearchLayout } from "~/features/search/ui/search-layout";
import { mySearchAllowanceQuery } from "~/lib/queries/search";
import { isSearchType, type SearchType } from "~/server/shared/engine/types";

export default function SearchPage() {
  const searchAllowance = createAsync(() => mySearchAllowanceQuery(), {
    initialValue: null,
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = createSignal("");
  const [searchType, setSearchType] = createSignal<SearchType>("person_name");
  const [tab, setTab] = createSignal<SearchTab>("people");
  const [model, setModel] = createSignal(
    createSearchViewModel({ results: [], count: 0 }),
  );
  const [selectedKey, setSelectedKey] = createSignal<string | null>(null);
  const [searching, setSearching] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const resultCount = createMemo(() => model().total);

  const selectedPerson = createMemo(
    () => model().people.find((person) => person.key === selectedKey()) ?? null,
  );
  const selectedCompany = createMemo(
    () =>
      model().companies.find((company) => company.key === selectedKey()) ??
      null,
  );

  function syncSelection(nextTab: SearchTab) {
    if (nextTab === "people") {
      setSelectedKey(model().people[0]?.key ?? null);
      return;
    }
    setSelectedKey(model().companies[0]?.key ?? null);
  }

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
      if (paramType === "company_name" || paramType === "ruc") {
        setTab("companies");
      }
    }
  });

  async function handleSearch(event?: Event) {
    event?.preventDefault();
    setSearching(true);
    setError(null);
    try {
      const response = await runDirectSearch(searchType(), query(), 20);
      setSearchParams({ type: searchType(), query: query(), limit: "20" });
      const nextModel = createSearchViewModel(response);
      setModel(nextModel);
      if (tab() === "people") {
        setSelectedKey(nextModel.people[0]?.key ?? null);
      } else {
        setSelectedKey(nextModel.companies[0]?.key ?? null);
      }
      await revalidate(mySearchAllowanceQuery.key);
    } catch (searchError) {
      setModel(createSearchViewModel({ results: [], count: 0 }));
      setSelectedKey(null);
      setError(
        searchError instanceof Error ? searchError.message : "Search failed",
      );
    } finally {
      setSearching(false);
    }
  }

  createEffect(() => {
    if (!query()) return;
    if (model().total > 0) return;
    if (error()) return;
    if (!searchParams.query) return;
    void handleSearch();
  });

  return (
    <AppPage width="wide">
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
              {searchAllowance()?.usedAmount ?? 0}/
              {(searchAllowance()?.monthlySearchLimit ?? 0) +
                (searchAllowance()?.extraGranted ?? 0)}
            </div>
            <div class="text-muted-foreground">
              {searchAllowance()?.remaining ?? 0} restantes
            </div>
          </div>
        </div>

        <SearchLayout
          tab={tab()}
          tabs={["people", "companies"]}
          onTabChange={(nextTab) => {
            setTab(nextTab);
            const inferred = inferSearchType(query(), nextTab);
            setSearchType(inferred);
            syncSelection(nextTab);
          }}
          query={query()}
          onQueryInput={(value) => {
            setQuery(value);
            setSearchType(inferSearchType(value, tab()));
          }}
          searching={searching()}
          onSearch={(event) => void handleSearch(event)}
          totalCount={resultCount()}
          people={model().people}
          companies={model().companies}
          selectedKey={selectedKey()}
          onSelect={setSelectedKey}
          selectedPerson={selectedPerson()}
          selectedCompany={selectedCompany()}
        />

        <Show when={error()}>
          {(message) => <p class="text-sm text-destructive">{message()}</p>}
        </Show>
      </div>
    </AppPage>
  );
}
