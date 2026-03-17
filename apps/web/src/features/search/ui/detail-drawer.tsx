import { For, Match, Switch } from "solid-js";

import type { SearchTab } from "~/features/search/model/display";
import type {
  CompanyGroup,
  PersonGroup,
} from "~/features/search/model/grouping";

import { ResultPills } from "./result-pills";

import styles from "./search-layout.module.css";

interface DetailDrawerProps {
  tab: SearchTab;
  person: PersonGroup | null;
  company: CompanyGroup | null;
}

export function DetailDrawer(props: DetailDrawerProps) {
  return (
    <div class={styles.panel}>
      <div class={styles.panelHeader}>
        <div>
          <div class={styles.detailTitle}>Detail</div>
          <div class={styles.detailSubtitle}>Selected search entity</div>
        </div>
      </div>
      <div class={styles.panelBody}>
        <Switch>
          <Match when={props.tab === "people" && props.person}>
            {(person) => (
              <>
                <div class={styles.detailTitle}>{person().displayName}</div>
                <div class={styles.detailSubtitle}>DNI {person().dni}</div>

                <section class={styles.detailSection}>
                  <div class={styles.detailTitle}>Aliases</div>
                  <ResultPills items={person().aliases} />
                </section>

                <section class={styles.detailSection}>
                  <div class={styles.detailTitle}>Phones</div>
                  <ResultPills items={person().phones} />
                </section>

                <section class={styles.detailSection}>
                  <div class={styles.detailTitle}>Companies</div>
                  <div class={styles.detailList}>
                    <For each={person().companies}>
                      {(company) => (
                        <div>
                          <div class={styles.detailRowMain}>
                            {company.name ?? "Unknown company"}
                          </div>
                          <div class={styles.detailRowMeta}>
                            {company.ruc ?? "-"}
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </section>
              </>
            )}
          </Match>

          <Match when={props.tab === "companies" && props.company}>
            {(company) => (
              <>
                <div class={styles.detailTitle}>
                  {company().name ?? "Unknown company"}
                </div>
                <div class={styles.detailSubtitle}>
                  RUC {company().ruc ?? "-"}
                </div>

                <section class={styles.detailSection}>
                  <div class={styles.detailTitle}>People</div>
                  <div class={styles.detailList}>
                    <For each={company().people}>
                      {(person) => (
                        <div>
                          <div class={styles.detailRowMain}>{person.name}</div>
                          <div class={styles.detailRowMeta}>{person.dni}</div>
                        </div>
                      )}
                    </For>
                  </div>
                </section>

                <section class={styles.detailSection}>
                  <div class={styles.detailTitle}>Phones</div>
                  <ResultPills items={company().phones} />
                </section>

                <section class={styles.detailSection}>
                  <div class={styles.detailTitle}>Emails</div>
                  <ResultPills items={company().emails} />
                </section>
              </>
            )}
          </Match>

          <Match when={true}>
            <p class="text-sm text-muted-foreground">
              Select a row to inspect the full entity context.
            </p>
          </Match>
        </Switch>
      </div>
    </div>
  );
}
