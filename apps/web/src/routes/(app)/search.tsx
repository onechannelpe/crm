import { useAction, useSearchParams, useSubmission } from "@solidjs/router";
import { createEffect, createMemo, createSignal, Show } from "solid-js";

import { AppPage } from "~/components/layout/page";
import {
  isSearchIntent,
  type SearchIntent,
} from "~/contracts/search/vocabulary";
import { intentFromTab, tabFromIntent } from "~/features/search/model/display";
import { createSearchViewModel } from "~/features/search/model/search-view-model";
import { SearchLayout } from "~/features/search/ui/search-layout";
import { useSidePanel } from "~/features/side-panel/state/use-side-panel";
import {
  createSearchCompanyDetailSidePanelPage,
  createSearchPersonDetailSidePanelPage,
} from "~/features/side-panel/types/side-panel-page";
import { searchDirectMutation } from "~/lib/mutations/search";
import { actionErrorMessage } from "~/lib/wire-error";

import pageStyles from "~/features/search/ui/search-page-shell.module.css";

const EMPTY_SEARCH_MODEL = createSearchViewModel({ rows: [] });

function searchKey(input: { intent: SearchIntent; query: string }): string {
  return `${input.intent}:${input.query}`;
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = createSignal("");
  const [intent, setIntent] = createSignal<SearchIntent>("people");
  const [result, setResult] = createSignal<{
    key: string;
    model: ReturnType<typeof createSearchViewModel>;
  }>();
  const [selectedKey, setSelectedKey] = createSignal<string | null>(null);
  const executeSearch = useAction(searchDirectMutation);
  const submission = useSubmission(searchDirectMutation);
  const { openPanel, closePanel } = useSidePanel();
  const tab = createMemo(() => tabFromIntent(intent()));
  const committedInput = createMemo(() => {
    const urlQuery =
      typeof searchParams.query === "string" ? searchParams.query : "";
    const urlIntent =
      typeof searchParams.intent === "string" &&
      isSearchIntent(searchParams.intent)
        ? searchParams.intent
        : "people";

    return { intent: urlIntent, query: urlQuery, limit: 20 };
  });
  const committedKey = () => searchKey(committedInput());
  const model = createMemo(() => {
    const current = result();
    return current?.key === committedKey() ? current.model : EMPTY_SEARCH_MODEL;
  });
  const resultCount = createMemo(() => model().total);
  let autoSearchKey: string | null = null;

  createEffect(() => {
    const committed = committedInput();
    setQuery(committed.query);
    setIntent(committed.intent);
  });

  async function runSearch(input: {
    intent: SearchIntent;
    query: string;
    limit: number;
  }): Promise<void> {
    setResult(undefined);
    setSelectedKey(null);
    closePanel();

    const response = await executeSearch(input);
    const key = searchKey(input);
    setResult({ key, model: createSearchViewModel(response) });
    setSearchParams({
      intent: input.intent,
      query: input.query,
      limit: String(input.limit),
    });
  }

  async function handleSearch(event?: Event): Promise<void> {
    event?.preventDefault();
    try {
      await runSearch({
        intent: intent(),
        query: query(),
        limit: 20,
      });
    } catch {
      setSelectedKey(null);
      closePanel();
    }
  }

  createEffect(() => {
    const input = committedInput();
    const key = searchKey(input);
    if (!input.query || result()?.key === key || autoSearchKey === key) {
      return;
    }
    autoSearchKey = key;
    void runSearch(input).catch(() => undefined);
  });

  return (
    <AppPage class={pageStyles.page}>
      <div class={pageStyles.body}>
        <SearchLayout
          tab={tab()}
          tabs={["people", "companies"]}
          onTabChange={(nextTab) => {
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
          searching={Boolean(submission.pending)}
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

        <Show when={submission.error}>
          {(error) => (
            <p class={pageStyles.error}>{actionErrorMessage(error())}</p>
          )}
        </Show>
      </div>
    </AppPage>
  );
}
