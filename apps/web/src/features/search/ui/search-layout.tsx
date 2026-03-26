import { For } from "solid-js";

import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import type { SearchTab } from "~/features/search/model/display";

import type { CompanyGroup, PersonGroup } from "../model/grouping";
import { ResultTable } from "./result-table";

import styles from "./search-layout.module.css";

interface SearchLayoutProps {
  tab: SearchTab;
  tabs: readonly SearchTab[];
  onTabChange: (tab: SearchTab) => void;
  query: string;
  onQueryInput: (value: string) => void;
  searching: boolean;
  onSearch: (event?: Event) => void;
  totalCount: number;
  people: PersonGroup[];
  companies: CompanyGroup[];
  selectedKey: string | null;
  onOpenPerson: (person: PersonGroup) => void;
  onOpenCompany: (company: CompanyGroup) => void;
}

export function SearchLayout(props: SearchLayoutProps) {
  return (
    <section class={styles.surface}>
      <form
        class={styles.searchForm}
        onSubmit={(event) => {
          event.preventDefault();
          props.onSearch(event);
        }}
      >
        <div class={styles.searchField}>
          <Input
            label="Search"
            value={props.query}
            onInput={(event) => props.onQueryInput(event.currentTarget.value)}
            required
          />
        </div>
        <Button
          type="submit"
          loading={props.searching}
          disabled={props.searching}
        >
          Search
        </Button>
      </form>

      <div class={styles.toolbarMeta}>
        <div class={styles.tabList} role="tablist" aria-label="Search tabs">
          <For each={props.tabs}>
            {(tab) => (
              <button
                type="button"
                role="tab"
                aria-selected={props.tab === tab}
                class={`${styles.tabButton}${props.tab === tab ? ` ${styles.tabButtonActive}` : ""}`}
                onClick={() => props.onTabChange(tab)}
              >
                {tab === "people" ? "People" : "Companies"}
              </button>
            )}
          </For>
        </div>

        <div class={styles.resultCount}>
          {props.totalCount} grouped{" "}
          {props.tab === "people" ? "people" : "companies"}
        </div>
      </div>

      <div class={styles.layout}>
        <div class={styles.panel}>
          <div class={styles.panelBody}>
            <ResultTable
              tab={props.tab}
              people={props.people}
              companies={props.companies}
              selectedKey={props.selectedKey}
              onOpenPerson={props.onOpenPerson}
              onOpenCompany={props.onOpenCompany}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
