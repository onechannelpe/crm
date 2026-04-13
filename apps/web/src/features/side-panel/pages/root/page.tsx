import { useNavigate } from "@solidjs/router";
import { For, Show, createMemo } from "solid-js";

import { ICON_BY_ROUTE } from "~/components/layout/route-icons";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { getNavigableRoutes } from "~/lib/nav/nav-policy";

import { PanelGroup } from "../../components/group";
import { PanelList } from "../../components/list";
import { useSidePanel } from "../../state/use-side-panel";
import { EmptyState } from "../common/empty-state";

import styles from "./page.module.css";

type ActionItem = {
  label: string;
  icon: typeof ICON_BY_ROUTE.dashboard;
  onAction: () => void;
};

type CommandGroup = {
  label: string;
  items: ActionItem[];
};

export function RootPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuthenticatedSession();
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
      .map((group) =>
        Object.assign({}, group, {
          items: group.items.filter((item) =>
            item.label.toLowerCase().includes(query),
          ),
        }),
      )
      .filter((group) => group.items.length > 0);
  };

  const hasResults = () => filteredGroups().some((g) => g.items.length > 0);

  return (
    <PanelList>
      <Show
        when={hasResults()}
        fallback={<EmptyState>No se encontraron resultados</EmptyState>}
      >
        <For each={filteredGroups()}>
          {(group) => (
            <PanelGroup label={group.label}>
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
            </PanelGroup>
          )}
        </For>
      </Show>
    </PanelList>
  );
}
