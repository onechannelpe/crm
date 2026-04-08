import type { SidePanelPageKey } from "../types/side-panel-page";

export function assertExpectedSidePanelPage(
  expectedPage: SidePanelPageKey,
  actualPage: SidePanelPageKey,
) {
  if (actualPage !== expectedPage) {
    throw new Error(
      `Side panel frame mismatch: expected ${expectedPage}, got ${actualPage}`,
    );
  }
}
