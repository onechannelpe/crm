import {
  type Accessor,
  type ParentProps,
  createContext,
  createMemo,
  useContext,
} from "solid-js";

import { assertExpectedSidePanelPage } from "../core/invariants";
import type {
  SidePanelPageDefinition,
  SidePanelPageKey,
  SidePanelPageState,
} from "../types/side-panel-page";

const SidePanelPageFrameContext = createContext<SidePanelPageDefinition>();

type PageFrameProviderProps = ParentProps<{
  frame: SidePanelPageDefinition;
}>;

export function PageFrameProvider(props: PageFrameProviderProps) {
  return (
    <SidePanelPageFrameContext.Provider value={props.frame}>
      {props.children}
    </SidePanelPageFrameContext.Provider>
  );
}

export function useSidePanelPageFrame(): SidePanelPageDefinition {
  const frame = useContext(SidePanelPageFrameContext);

  if (!frame) {
    throw new Error(
      "useSidePanelPageFrame must be used inside side panel frame",
    );
  }

  return frame;
}

type PageStateByKey<TPage extends SidePanelPageKey> = Extract<
  SidePanelPageState,
  { page: TPage }
>;

export function useSidePanelPageState<TPage extends SidePanelPageKey>(
  expectedPage: TPage,
): Accessor<PageStateByKey<TPage>> {
  const frame = useSidePanelPageFrame();

  return createMemo(() => {
    const state = frame.state;
    assertExpectedSidePanelPage(expectedPage, state.page);

    return state as PageStateByKey<TPage>;
  });
}
