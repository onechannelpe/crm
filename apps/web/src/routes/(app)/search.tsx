import { revalidate, useSearchParams } from "@solidjs/router";
import { createEffect, createMemo, createSignal, on, Show } from "solid-js";

import { searchDirect } from "~/actions/search/run";
import Search from "~/components/icons/search";
import { AppPage } from "~/components/layout/page";
import {
  isSearchIntent,
  type SearchIntent,
} from "~/contracts/search/vocabulary";
import {
  intentFromTab,
  tabFromIntent,
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
  const [intent, setIntent] = createSignal<SearchIntent>("people");
  const [tab, setTab] = createSignal<SearchTab>("people");
  const [model, setModel] = createSignal(createSearchViewModel({ rows: [] }));
  const [selectedKey, setSelectedKey] = createSignal<string | null>(null);
  const [searching, setSearching] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const { openPanel, closePanel } = useSidePanel();
  const resultCount = createMemo(() => model().total);

  createEffect(() => {
    if (typeof searchParams.query === "string" && searchParams.query) {
      setQuery(searchParams.query);
    }

    if (
      typeof searchParams.intent !== "string" ||
      !isSearchIntent(searchParams.intent)
    ) {
      return;
    }

    setIntent(searchParams.intent);
    setTab(tabFromIntent(searchParams.intent));
  });

  async function handleSearch(event?: Event) {
    event?.preventDefault();
    setSearching(true);
    setError(null);
    try {
      const response = await searchDirect(intent(), query(), 20);
      setSearchParams({ intent: intent(), query: query(), limit: "20" });
      const nextModel = createSearchViewModel(response);
      setModel(nextModel);
      setSelectedKey(null);
      closePanel();
      await revalidate(mySearchAllowanceQuery.key);
    } catch (searchError) {
      setModel(createSearchViewModel({ rows: [] }));
      setSelectedKey(null);
      closePanel();
      setError(
        searchError instanceof Error ? searchError.message : "Search failed",
      );
    } finally {
      setSearching(false);
    }
  }

  createEffect(
    on(
      () => searchParams.query,
      (urlQuery) => {
        if (!urlQuery || model().total > 0 || error()) return;
        void handleSearch();
      },
    ),
  );

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
            setIntent(intentFromTab(nextTab));
            setSelectedKey(null);
            closePanel();
          }}
          query={query()}
          onQueryInput={(value) => {
            setQuery(value);
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
