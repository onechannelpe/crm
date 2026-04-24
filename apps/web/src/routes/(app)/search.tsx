import { revalidate, useSearchParams } from "@solidjs/router";
import { createEffect, createMemo, createSignal, Show } from "solid-js";

import { isSearchType, type SearchType } from "~/actions/search/contracts";
import { searchDirect } from "~/actions/search/run";
import Search from "~/components/icons/search";
import { AppPage } from "~/components/layout/page";
import {
  inferSearchType,
  type SearchTab,
} from "~/features/search/model/display";
import { createSearchViewModel } from "~/features/search/model/search-view-model";
import { SearchLayout } from "~/features/search/ui/search-layout";
import { PageHeader } from "~/features/settings-shell/page/page-header";
import { useSidePanel } from "~/features/side-panel/state/use-side-panel";
import {
  createSearchCompanyDetailSidePanelPage,
  createSearchPersonDetailSidePanelPage,
} from "~/features/side-panel/types/side-panel-page";
import { mySearchAllowanceQuery } from "~/lib/queries/search";

import pageStyles from "~/features/search/ui/search-page-shell.module.css";

export default function SearchPage() {
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
    if (typeof searchParams.query === "string" && searchParams.query) {
      setQuery(searchParams.query);
    }

    if (typeof searchParams.type !== "string") {
      return;
    }
    if (!isSearchType(searchParams.type)) {
      return;
    }

    setSearchType(searchParams.type);
    setTab(
      searchParams.type === "company_name" || searchParams.type === "ruc"
        ? "companies"
        : "people",
    );
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
    <AppPage class={pageStyles.page}>
      <PageHeader
        class={pageStyles.header}
        icon={
          <div class={pageStyles.headerIcon}>
            <Search size={16} />
          </div>
        }
        title={<span class={pageStyles.headerTitle}>Search</span>}
      />

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
