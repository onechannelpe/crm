import { useAction, useSubmission } from "@solidjs/router";
import { For, Match, Show, Switch, createMemo, createSignal } from "solid-js";

import { useHotkey } from "~/browser/hotkey/use-hotkey";
import { Avatar } from "~/components/ui/display/avatar";
import { useIsMobile } from "~/components/ui/layout/responsive/use-is-mobile";
import { MenuItem } from "~/components/ui/navigation/menu-item";
import { AnchoredPopover } from "~/components/ui/overlay/anchored-popover";
import { actionErrorMessage } from "~/contracts/errors";
import { searchDirectMutation } from "~/features/search/data/mutations";
import {
  toSearchResultItems,
  type SearchResultItem,
} from "~/features/search/model/search-results";
import { createSearchViewModel } from "~/features/search/model/search-view-model";

import { PanelGroup } from "../../components/group";
import { SidePanelPage } from "../../components/page";
import { SelectableList } from "../../components/selectable-list";
import { useSidePanel } from "../../state/use-side-panel";
import {
  createSearchCompanyDetailSidePanelPage,
  createSearchPersonDetailSidePanelPage,
} from "../../types/side-panel-page";
import { EmptyState } from "../common/empty-state";
import { ListPageSkeleton } from "../common/skeletons/list-page-skeleton";
import { SearchPreviewCard } from "./preview-card";

import styles from "./page.module.css";

const SEARCH_LIMIT = 20;

// The engine rejects anything shorter, so the list stays empty rather than
// sending a request that can only fail.
const MIN_QUERY_LENGTH = 2;

export function SearchRecordsPage() {
  const { searchText, navigateTo } = useSidePanel();
  const isMobile = useIsMobile();

  const executeSearch = useAction(searchDirectMutation);
  const submission = useSubmission(searchDirectMutation);

  /*
    Results are pinned to the query that produced them. Every search spends a
    unit of the user's metered engine allowance, so this page searches on Enter
    instead of on each keystroke, and the pinned query is what tells a stale
    result list from a current one.
  */
  const [results, setResults] = createSignal<{
    query: string;
    items: SearchResultItem[];
  }>();
  const [selectedId, setSelectedId] = createSignal<string | null>(null);
  const [anchors, setAnchors] = createSignal<Record<string, HTMLElement>>({});

  const query = () => searchText().trim();
  const isResultListCurrent = () => results()?.query === query();
  const items = () => (isResultListCurrent() ? (results()?.items ?? []) : []);
  const itemIds = createMemo(() => items().map((item) => item.id));

  const selectedItem = () =>
    items().find((item) => item.id === selectedId()) ?? null;

  const selectedAnchor = () => {
    const id = selectedId();

    return id === null ? undefined : anchors()[id];
  };

  async function runSearch() {
    if (query().length < MIN_QUERY_LENGTH) {
      return;
    }

    const response = await executeSearch({
      intent: "mixed",
      query: query(),
      limit: SEARCH_LIMIT,
    });

    setSelectedId(null);
    setResults({
      query: query(),
      items: toSearchResultItems(createSearchViewModel(response)),
    });
  }

  function openItem(item: SearchResultItem) {
    navigateTo(
      item.source.kind === "person"
        ? createSearchPersonDetailSidePanelPage({
            person: item.source.person,
            query: query(),
          })
        : createSearchCompanyDetailSidePanelPage({
            company: item.source.company,
            query: query(),
          }),
    );
  }

  /*
    Enter means "search" until the list matches what is typed, then "open the
    selected row". That keeps one key for the whole flow: type, Enter to search,
    Enter again to open the first hit.
  */
  useHotkey(
    "Enter",
    () => {
      const item = selectedItem();

      if (isResultListCurrent() && item) {
        openItem(item);
        return;
      }

      void runSearch();
    },
    { allowInInputs: true },
  );

  return (
    <SidePanelPage>
      <div class={styles.content}>
        <Switch>
          <Match when={submission.pending}>
            <ListPageSkeleton />
          </Match>

          <Match when={query().length < MIN_QUERY_LENGTH}>
            <EmptyState>Busca personas y empresas</EmptyState>
          </Match>

          <Match when={submission.error}>
            {(error) => (
              <p class={styles.error}>{actionErrorMessage(error())}</p>
            )}
          </Match>

          <Match when={!isResultListCurrent()}>
            <EmptyState>Presiona Enter para buscar "{query()}"</EmptyState>
          </Match>

          <Match when={items().length === 0}>
            <EmptyState>No se encontraron resultados</EmptyState>
          </Match>

          <Match when={items().length > 0}>
            <SelectableList
              itemIds={itemIds()}
              selectedId={selectedId()}
              onSelect={setSelectedId}
            >
              <PanelGroup label="Resultados">
                <For each={items()}>
                  {(item) => (
                    <div
                      ref={(element) =>
                        setAnchors((current) => ({
                          ...current,
                          [item.id]: element,
                        }))
                      }
                    >
                      <MenuItem
                        text={item.label}
                        contextualText={item.objectLabel}
                        focused={selectedId() === item.id}
                        onClick={() => openItem(item)}
                        onHighlight={() => setSelectedId(item.id)}
                        leftComponent={
                          <Avatar
                            imageUrl={null}
                            fallback={item.label.charAt(0).toUpperCase()}
                            placeholderColorSeed={item.id}
                            size="md"
                            type={item.avatarType}
                          />
                        }
                      />
                    </div>
                  )}
                </For>
              </PanelGroup>
            </SelectableList>
          </Match>
        </Switch>
      </div>

      {/*
        The card sits beside the panel rather than inside it, so a result stays
        readable without giving up the list. There is no room for that on a
        phone, where the row itself has to be the whole preview.
      */}
      <Show when={!isMobile() && selectedItem()}>
        {(item) => (
          <Show when={selectedAnchor()}>
            {(anchor) => (
              <AnchoredPopover
                anchor={anchor()}
                placement="left-start"
                offset={16}
                dismissible={false}
                variant="positioner"
              >
                <SearchPreviewCard item={item()} />
              </AnchoredPopover>
            )}
          </Show>
        )}
      </Show>
    </SidePanelPage>
  );
}
