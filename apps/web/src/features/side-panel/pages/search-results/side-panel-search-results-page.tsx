import { Show } from "solid-js";

import { SidePanelList } from "../../components/side-panel-list";
import type { SearchResultsSidePanelPage } from "../../types/side-panel-page";

import styles from "../root/side-panel-root-page.module.css";

type SidePanelSearchResultsPageProps = {
  page: SearchResultsSidePanelPage;
};

export function SidePanelSearchResultsPage(
  props: SidePanelSearchResultsPageProps,
) {
  return (
    <SidePanelList>
      <div class={styles.emptyState}>
        <Show when={props.page.query.trim()} fallback={"Todavía no hay una búsqueda activa"}>
          {`Los resultados para "${props.page.query}" se renderizarán aquí en un próximo PR.`}
        </Show>
      </div>
    </SidePanelList>
  );
}
