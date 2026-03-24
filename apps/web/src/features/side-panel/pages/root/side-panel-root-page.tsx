import { For, Show } from "solid-js";

import { SidePanelGroup } from "../../components/side-panel-group";
import { SidePanelList } from "../../components/side-panel-list";
import { useSidePanel } from "../../state/use-side-panel";
import styles from "./side-panel-root-page.module.css";

type ActionItem = {
  label: string;
  onAction: () => void;
};

type CommandGroup = {
  label: string;
  items: ActionItem[];
};

const COMMAND_GROUPS: CommandGroup[] = [
  {
    label: "Navigation",
    items: [
      { label: "Go to home", onAction: () => {} },
      { label: "Go to settings", onAction: () => {} },
    ],
  },
  {
    label: "Actions",
    items: [
      { label: "Create new record", onAction: () => {} },
      { label: "Search records", onAction: () => {} },
    ],
  },
];

export function SidePanelRootPage() {
  const { searchText } = useSidePanel();

  const filteredGroups = () => {
    const query = searchText().toLowerCase();
    if (!query) return COMMAND_GROUPS;
    return COMMAND_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.label.toLowerCase().includes(query),
      ),
    })).filter((group) => group.items.length > 0);
  };

  const hasResults = () => filteredGroups().some((g) => g.items.length > 0);

  return (
    <SidePanelList>
      <Show
        when={hasResults()}
        fallback={<div class={styles.emptyState}>No results found</div>}
      >
        <For each={filteredGroups()}>
          {(group) => (
            <SidePanelGroup label={group.label}>
              <For each={group.items}>
                {(item, index) => (
                  <button
                    type="button"
                    class={styles.actionItem}
                    data-index={index()}
                    onClick={item.onAction}
                  >
                    {item.label}
                  </button>
                )}
              </For>
            </SidePanelGroup>
          )}
        </For>
      </Show>
    </SidePanelList>
  );
}
