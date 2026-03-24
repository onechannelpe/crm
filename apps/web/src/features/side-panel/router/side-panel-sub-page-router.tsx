import { type ParentProps, Show, createContext, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { Dynamic } from "solid-js/web";

import type { SidePanelSubPageKey } from "../config/side-panel-sub-pages-config";
import { SIDE_PANEL_SUB_PAGES_CONFIG } from "../config/side-panel-sub-pages-config";
import { SidePanelSubPageNavigationHeader } from "./side-panel-sub-page-navigation-header";

type SubPageEntry = {
  key: SidePanelSubPageKey;
  instanceId: string;
  title: string;
};

type SubPageState = Record<string, SubPageEntry[]>;

type SidePanelSubPageContextValue = {
  pushSubPage: (pageInstanceId: string, entry: SubPageEntry) => void;
  popSubPage: (pageInstanceId: string) => void;
  getStack: (pageInstanceId: string) => SubPageEntry[];
};

const SidePanelSubPageContext = createContext<SidePanelSubPageContextValue>();

export function useSidePanelSubPage(): SidePanelSubPageContextValue {
  const ctx = useContext(SidePanelSubPageContext);
  if (!ctx) {
    throw new Error(
      "useSidePanelSubPage must be used within SidePanelSubPageRouter",
    );
  }
  return ctx;
}

type SidePanelSubPageRouterProps = ParentProps<{ pageInstanceId: string }>;

export function SidePanelSubPageRouter(props: SidePanelSubPageRouterProps) {
  const [state, setState] = createStore<SubPageState>({});

  const getStack = (id: string): SubPageEntry[] => state[id] ?? [];

  const pushSubPage = (id: string, entry: SubPageEntry) => {
    setState(id, (prev) => [...(prev ?? []), entry]);
  };

  const popSubPage = (id: string) => {
    setState(id, (prev) => (prev ?? []).slice(0, -1));
  };

  const ctx: SidePanelSubPageContextValue = {
    pushSubPage,
    popSubPage,
    getStack,
  };

  const currentStack = () => getStack(props.pageInstanceId);
  const topEntry = () => currentStack().at(-1);

  const SubPageComponent = () => {
    const entry = topEntry();
    if (!entry) {
      throw new Error(
        "SidePanelSubPageRouter: subpage component requested with empty stack",
      );
    }
    const component = SIDE_PANEL_SUB_PAGES_CONFIG.get(entry.key);
    if (component === undefined) {
      throw new Error(
        `SidePanelSubPageRouter: unregistered subpage key "${entry.key}"`,
      );
    }
    return component;
  };

  return (
    <SidePanelSubPageContext.Provider value={ctx}>
      <Show when={topEntry()} fallback={props.children}>
        {(entry) => (
          <>
            <SidePanelSubPageNavigationHeader
              title={entry().title}
              onBack={() => popSubPage(props.pageInstanceId)}
            />
            <Dynamic component={SubPageComponent()} />
          </>
        )}
      </Show>
    </SidePanelSubPageContext.Provider>
  );
}
