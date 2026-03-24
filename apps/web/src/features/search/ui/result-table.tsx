import { For, Match, Show, Switch } from "solid-js";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import type { SearchTab } from "~/features/search/model/display";
import type {
  CompanyGroup,
  PersonGroup,
} from "~/features/search/model/grouping";

import { ResultPills } from "./result-pills";
import styles from "./search-layout.module.css";

interface ResultTableProps {
  tab: SearchTab;
  people: PersonGroup[];
  companies: CompanyGroup[];
  selectedKey: string | null;
  onOpenPerson: (person: PersonGroup) => void;
  onOpenCompany: (company: CompanyGroup) => void;
}

export function ResultTable(props: ResultTableProps) {
  return (
    <Switch>
      <Match when={props.tab === "people"}>
        <Show
          when={props.people.length > 0}
          fallback={
            <p class="text-sm text-muted-foreground">No people found.</p>
          }
        >
          <Table class={styles.resultsTable}>
            <TableHeader>
              <TableRow>
                <TableHead class={styles.headerCell}>Person</TableHead>
                <TableHead class={styles.headerCell}>DNI</TableHead>
                <TableHead class={styles.headerCell}>Companies</TableHead>
                <TableHead class={styles.headerCell}>Phones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={props.people}>
                {(group) => (
                  <TableRow
                    tabIndex={0}
                    class={
                      `${styles.resultRow}${props.selectedKey === group.key ? ` ${styles.resultRowSelected}` : ""}`
                    }
                    onClick={() => props.onOpenPerson(group)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        props.onOpenPerson(group);
                      }
                    }}
                  >
                    <TableCell class={styles.primaryCell}>
                      <div class={styles.primaryValue}>{group.displayName}</div>
                      <div class={styles.secondaryValue}>
                        {group.aliases.find(
                          (alias) => alias !== group.displayName,
                        ) ?? `${group.companies.length} linked companies`}
                      </div>
                    </TableCell>
                    <TableCell class={styles.codeCell}>{group.dni}</TableCell>
                    <TableCell class={styles.dataCell}>
                      <ResultPills
                        items={group.companies
                          .map((company) => company.name ?? company.ruc ?? "")
                          .filter((value) => value.length > 0)}
                      />
                    </TableCell>
                    <TableCell class={styles.dataCell}>
                      <ResultPills items={group.phones} />
                    </TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </Show>
      </Match>
      <Match when={props.tab === "companies"}>
        <Show
          when={props.companies.length > 0}
          fallback={
            <p class="text-sm text-muted-foreground">No companies found.</p>
          }
        >
          <Table class={styles.resultsTable}>
            <TableHeader>
              <TableRow>
                <TableHead class={styles.headerCell}>Company</TableHead>
                <TableHead class={styles.headerCell}>RUC</TableHead>
                <TableHead class={styles.headerCell}>People</TableHead>
                <TableHead class={styles.headerCell}>Phones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={props.companies}>
                {(group) => (
                  <TableRow
                    tabIndex={0}
                    class={
                      `${styles.resultRow}${props.selectedKey === group.key ? ` ${styles.resultRowSelected}` : ""}`
                    }
                    onClick={() => props.onOpenCompany(group)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        props.onOpenCompany(group);
                      }
                    }}
                  >
                    <TableCell class={styles.primaryCell}>
                      <div class={styles.primaryValue}>
                        {group.name ?? "Unknown company"}
                      </div>
                      <div class={styles.secondaryValue}>
                        {group.people.length} linked people
                      </div>
                    </TableCell>
                    <TableCell class={styles.codeCell}>{group.ruc ?? "-"}</TableCell>
                    <TableCell class={styles.dataCell}>
                      <ResultPills
                        items={group.people
                          .map((person) => person.name || person.dni)
                          .filter((value) => value.length > 0)}
                      />
                    </TableCell>
                    <TableCell class={styles.dataCell}>
                      <ResultPills items={group.phones} />
                    </TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </Show>
      </Match>
    </Switch>
  );
}
