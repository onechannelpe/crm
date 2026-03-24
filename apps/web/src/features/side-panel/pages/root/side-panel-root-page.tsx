import { useNavigate } from "@solidjs/router";
import { For, Show, createMemo } from "solid-js";

import { ICON_BY_ROUTE } from "~/components/layout/route-icons";
import { useSession } from "~/components/providers/session-provider";
import { getNavigableRoutes } from "~/lib/nav/nav-policy";

import { SidePanelGroup } from "../../components/side-panel-group";
import { SidePanelList } from "../../components/side-panel-list";
import { useSidePanel } from "../../state/use-side-panel";
import { SidePanelEmptyState } from "../common/side-panel-empty-state";

import styles from "./side-panel-root-page.module.css";

type ActionItem = {
  label: string;
  icon: typeof ICON_BY_ROUTE.dashboard;
  onAction: () => void;
};

type CommandGroup = {
  label: string;
  items: ActionItem[];
};

export function SidePanelRootPage() {
  const navigate = useNavigate();
  const { currentUser } = useSession();
  const { searchText, closePanel } = useSidePanel();

  const commandGroups = createMemo<CommandGroup[]>(() => {
    const grouped = new Map<string, ActionItem[]>();
    const routes = getNavigableRoutes(currentUser().role);

    for (const route of routes) {
      const groupLabel =
        route.section === "primary"
          ? "Accesos rápidos"
          : (route.group ?? "Más");
      const existingItems = grouped.get(groupLabel) ?? [];
      const Icon = ICON_BY_ROUTE[route.icon];

      existingItems.push({
        label: route.navLabel ?? route.label,
        icon: Icon,
        onAction: () => {
          navigate(route.href);
          closePanel();
        },
      });

      grouped.set(groupLabel, existingItems);
    }

    return Array.from(grouped, ([label, items]) => ({
      label,
      items,
    }));
  });

  const filteredGroups = () => {
    const query = searchText().toLowerCase();
    if (!query) return commandGroups();
    return commandGroups()
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.label.toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.items.length > 0);
  };

  const hasResults = () => filteredGroups().some((g) => g.items.length > 0);

  return (
    <SidePanelList>
      <Show
        when={hasResults()}
        fallback={
          <SidePanelEmptyState>
            No se encontraron resultados
          </SidePanelEmptyState>
        }
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
                    <item.icon size={14} />
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
