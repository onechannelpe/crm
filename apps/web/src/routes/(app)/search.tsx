import { createAsync, revalidate, useSearchParams } from "@solidjs/router";
import { createEffect, createMemo, createSignal, Show } from "solid-js";

import { searchDirect } from "~/actions/search/run";
import Search from "~/components/icons/search";
import { AppPage } from "~/components/layout/page";
import {
  inferSearchType,
  type SearchTab,
} from "~/features/search/model/display";
import { createSearchViewModel } from "~/features/search/model/search-view-model";
import { SearchLayout } from "~/features/search/ui/search-layout";
import { PageHeader } from "~/features/settings-shell";
import { useSidePanel } from "~/features/side-panel/state/use-side-panel";
import {
  createSearchCompanyDetailSidePanelPage,
  createSearchPersonDetailSidePanelPage,
} from "~/features/side-panel/types/side-panel-page";
import { mySearchAllowanceQuery } from "~/lib/queries/search";
import { isSearchType, type SearchType } from "~/server/shared/pipeline-types";

import pageStyles from "~/features/search/ui/search-page-shell.module.css";

export default function SearchPage() {
  const searchAllowance = createAsync(() => mySearchAllowanceQuery(), {
    initialValue: null,
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = createSignal("");
  const [searchType, setSearchType] = createSignal<SearchType>("person_name");
  const [tab, setTab] = createSignal<SearchTab>("people");
  const [model, setModel] = createSignal(
    createSearchViewModel({ items: [], raw: [] }),
  );
  const [selectedKey, setSelectedKey] = createSignal<string | null>(null);
  const [searching, setSearching] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const { openPanel, closePanel } = useSidePanel();
  const resultCount = createMemo(() => model().total);

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
      const response = await searchDirect(searchType(), query(), 20);
      setSearchParams({ type: searchType(), query: query(), limit: "20" });
      const nextModel = createSearchViewModel(response);
      setModel(nextModel);
      setSelectedKey(null);
      closePanel();
      await revalidate(mySearchAllowanceQuery.key);
    } catch (searchError) {
      setModel(createSearchViewModel({ items: [], raw: [] }));
      setSelectedKey(null);
      closePanel();
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
    <AppPage width="wide" class={pageStyles.page}>
      <PageHeader
        class={pageStyles.header}
        icon={
          <div class={pageStyles.headerIcon}>
            <Search size={16} />
          </div>
        }
        title={<span class={pageStyles.headerTitle}>Search</span>}
      >
        <div class={pageStyles.allowanceCard}>
          <div class={pageStyles.allowanceLabel}>Allowance</div>
          <div class={pageStyles.allowanceValue}>
            {searchAllowance()?.remaining ?? 0}
          </div>
          <div class={pageStyles.allowanceMeta}>
            {searchAllowance()?.committed ?? 0}/
            {(searchAllowance()?.policy.monthlyLimit ?? 0) +
              (searchAllowance()?.granted ?? 0)}{" "}
            used
          </div>
        </div>
      </PageHeader>

      <p class={pageStyles.intro}>
        Search results are grouped into reusable entity rows. Open a person or
        company to inspect the aggregated context in the side panel.
      </p>

      <div class="space-y-6">
        <SearchLayout
          tab={tab()}
          tabs={["people", "companies"]}
          onTabChange={(nextTab) => {
            setTab(nextTab);
            const inferred = inferSearchType(query(), nextTab);
            setSearchType(inferred);
            setSelectedKey(null);
            closePanel();
          }}
          query={query()}
          onQueryInput={(value) => {
            setQuery(value);
            setSearchType(inferSearchType(value, tab()));
            setSelectedKey(null);
            closePanel();
          }}
          searching={searching()}
          onSearch={(event) => void handleSearch(event)}
          totalCount={resultCount()}
          people={model().people}
          companies={model().companies}
          selectedKey={selectedKey()}
          onOpenPerson={(person) => {
            setSelectedKey(person.key);
            openPanel(
              createSearchPersonDetailSidePanelPage({
                person,
                query: query(),
              }),
            );
          }}
          onOpenCompany={(company) => {
            setSelectedKey(company.key);
            openPanel(
              createSearchCompanyDetailSidePanelPage({
                company,
                query: query(),
              }),
            );
          }}
        />

        <Show when={error()}>
          {(message) => <p class="text-sm text-destructive">{message()}</p>}
        </Show>
      </div>
    </AppPage>
  );
}
