import { Show } from "solid-js";

import { SidePanelList } from "../../components/side-panel-list";
import type { SearchResultsSidePanelPage } from "../../types/side-panel-page";
import { SidePanelEmptyState } from "../common/side-panel-empty-state";

type SidePanelSearchResultsPageProps = {
  page: SearchResultsSidePanelPage;
};

export function SidePanelSearchResultsPage(
  props: SidePanelSearchResultsPageProps,
) {
  return (
    <SidePanelList>
      <SidePanelEmptyState>
        <Show
          when={props.page.query.trim()}
          fallback={"Todavía no hay una búsqueda activa"}
        >
          {`Los resultados para "${props.page.query}" se renderizarán aquí en un próximo PR.`}
        </Show>
      </SidePanelEmptyState>
    </SidePanelList>
  );
}
