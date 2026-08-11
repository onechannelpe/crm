import type { RouteDefinition } from "@solidjs/router";
import { Match, Switch } from "solid-js";

import { AppPage } from "~/components/layout/page";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { ExecutiveGpvProgress } from "~/features/merchant-stats/ui/executive-gpv-progress";
import { SalesManagerCaja1Snapshot } from "~/features/merchant-stats/ui/sales-manager-caja1-snapshot";

export const route = {} satisfies RouteDefinition;

export default function HomePage() {
  const { currentUser } = useAuthenticatedSession();

  return (
    <AppPage width="wide">
      <Switch>
        <Match when={currentUser().role === "sales_manager"}>
          <SalesManagerCaja1Snapshot />
        </Match>
        <Match when={currentUser().role === "executive"}>
          <ExecutiveGpvProgress />
        </Match>
      </Switch>
    </AppPage>
  );
}
