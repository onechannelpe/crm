import { For } from "solid-js";

import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import type { SearchTab } from "~/features/search/model/display";

import type { CompanyGroup, PersonGroup } from "../model/grouping";
import { DetailDrawer } from "./detail-drawer";
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
  onSelect: (key: string) => void;
  selectedPerson: PersonGroup | null;
  selectedCompany: CompanyGroup | null;
}

export function SearchLayout(props: SearchLayoutProps) {
  return (
    <div class="space-y-4">
      <form
        class="flex gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          props.onSearch(event);
        }}
      >
        <Input
          label="Search"
          value={props.query}
          onInput={(event) => props.onQueryInput(event.currentTarget.value)}
          required
        />
        <Button type="submit" disabled={props.searching}>
          {props.searching ? "Searching..." : "Search"}
        </Button>
      </form>

      <div class={styles.tabList}>
        <For each={props.tabs}>
          {(tab) => (
            <button
              type="button"
              class={`${styles.tabButton}${props.tab === tab ? ` ${styles.tabButtonActive}` : ""}`}
              onClick={() => props.onTabChange(tab)}
            >
              {tab === "people" ? "People" : "Companies"}
            </button>
          )}
        </For>
      </div>

      <div class="text-sm text-muted-foreground">
        {props.totalCount} results
      </div>

      <div class={styles.layout}>
        <div class={styles.panel}>
          <div class={styles.panelBody}>
            <ResultTable
              tab={props.tab}
              people={props.people}
              companies={props.companies}
              selectedKey={props.selectedKey}
              onSelect={props.onSelect}
            />
          </div>
        </div>
        <DetailDrawer
          tab={props.tab}
          person={props.selectedPerson}
          company={props.selectedCompany}
        />
      </div>
    </div>
  );
}
