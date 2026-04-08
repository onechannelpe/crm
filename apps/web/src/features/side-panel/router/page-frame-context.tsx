import {
  type Accessor,
  type ParentProps,
  createContext,
  createMemo,
  useContext,
} from "solid-js";

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

function assertExpectedPageState<TPage extends SidePanelPageKey>(
  expectedPage: TPage,
  state: SidePanelPageState,
): asserts state is PageStateByKey<TPage> {
  if (state.page !== expectedPage) {
    throw new Error(
      `Side panel frame mismatch: expected ${expectedPage}, got ${state.page}`,
    );
  }
}

export function useSidePanelPageState<TPage extends SidePanelPageKey>(
  expectedPage: TPage,
): Accessor<PageStateByKey<TPage>> {
  const frame = useSidePanelPageFrame();

  return createMemo(() => {
    const state = frame.state;
    assertExpectedPageState(expectedPage, state);
    return state;
  });
}
