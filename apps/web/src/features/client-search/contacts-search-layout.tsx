import { A } from "@solidjs/router";
import type { JSX } from "solid-js";
import { For, Show } from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import type { createClientSearchController } from "~/features/client-search/controller";
import { cn } from "~/lib/utils";

import styles from "./contacts-search-layout.module.css";

interface ContactsSearchLayoutProps {
  activeTab: "people" | "companies";
  placeholder: string;
  controller: ReturnType<typeof createClientSearchController>;
  inferType: (query: string) => string;
  columns: Array<{ label: string }>;
  rows: () => JSX.Element;
  footerLeft: () => JSX.Element;
  footerRight: () => JSX.Element;
  resultCount: () => number;
}

export function ContactsSearchLayout(props: ContactsSearchLayoutProps) {
  return (
    <AppPage>
      <div class={styles.searchPanel}>
        <div class={styles.tabBar}>
          <A
            href="/search"
            class={cn(
              styles.tab,
              props.activeTab === "people" && styles.tabActive,
            )}
          >
            Personas
          </A>
          <A
            href="/search"
            class={cn(
              styles.tab,
              props.activeTab === "companies" && styles.tabActive,
            )}
          >
            Empresas
          </A>
        </div>

        <form
          class={styles.searchBar}
          onSubmit={(event) => {
            event.preventDefault();
            const inferred = props.inferType(props.controller.query());
            if (props.controller.isAllowedType(inferred)) {
              props.controller.setSearchType(inferred);
            }
            void props.controller.runCurrentSearch();
          }}
        >
          <input
            class={styles.searchInput}
            placeholder={props.placeholder}
            value={props.controller.query()}
            onInput={(e) => props.controller.setQuery(e.currentTarget.value)}
            required
          />
          <Button type="submit" disabled={props.controller.searching()}>
            {props.controller.searching() ? "Buscando..." : "Buscar"}
          </Button>
        </form>
      </div>

      <Show when={props.controller.error()}>
        {(message) => <div class={styles.errorBar}>{message()}</div>}
      </Show>

      <Show when={props.controller.searched()}>
        <div class={styles.statusBar}>
          <span>{props.resultCount()} resultados</span>
        </div>
      </Show>

      <div class={styles.contentWrap}>
        <div class={styles.mainPane}>
          <Show
            when={props.resultCount() > 0}
            fallback={
              <Show when={props.controller.searched()}>
                <EmptyState
                  title="Sin resultados"
                  description="Prueba con otro término de búsqueda"
                />
              </Show>
            }
          >
            <Table
              class={cn(
                styles.resultsTable,
                props.activeTab === "people" && styles.resultsTablePeople,
                props.activeTab === "companies" && styles.resultsTableCompanies,
              )}
            >
              <TableHeader>
                <TableRow>
                  <For each={props.columns}>
                    {(col) => <TableHead>{col.label}</TableHead>}
                  </For>
                </TableRow>
              </TableHeader>
              <TableBody>{props.rows()}</TableBody>
            </Table>
          </Show>

          <Show when={props.resultCount() > 0}>
            <div class={styles.footer}>
              <div>{props.footerLeft()}</div>
              <div>{props.footerRight()}</div>
            </div>
          </Show>
        </div>
      </div>
    </AppPage>
  );
}
