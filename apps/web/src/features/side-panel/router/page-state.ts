import { type Accessor, createMemo } from "solid-js";

import { useSidePanel } from "../state/use-side-panel";
import type {
  SidePanelPageKey,
  SidePanelPageState,
} from "../types/side-panel-page";
import { usePageInstanceId } from "./page-instance-context";

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
      `Side panel page mismatch: expected ${expectedPage}, got ${state.page}`,
    );
  }
}

export function useSidePanelPageState<TPage extends SidePanelPageKey>(
  expectedPage: TPage,
): Accessor<PageStateByKey<TPage>> {
  const pageId = usePageInstanceId();
  const { getPageState } = useSidePanel();

  return createMemo(() => {
    const state = getPageState(pageId());

    if (!state) {
      throw new Error(
        `Side panel page state is not available for page id ${pageId()}`,
      );
    }

    assertExpectedPageState(expectedPage, state);
    return state;
  });
}
