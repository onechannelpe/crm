import { For, Match, Show, Switch } from "solid-js";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { OverflowingText } from "~/components/ui/overflow-tooltip/overflow-tooltip";
import {
  RecordChipList,
  type ChipShape,
} from "~/components/ui/record-chip/record-chip";
import type { SearchTab } from "~/features/search/model/display";
import type {
  CompanyGroup,
  PersonGroup,
} from "~/features/search/model/grouping";

import styles from "./search-layout.module.css";

interface ResultTableProps {
  tab: SearchTab;
  people: PersonGroup[];
  companies: CompanyGroup[];
  selectedKey: string | null;
  onOpenPerson: (person: PersonGroup) => void;
  onOpenCompany: (company: CompanyGroup) => void;
}

function rowClass(selected: boolean) {
  return `${styles.resultRow}${selected ? ` ${styles.resultRowSelected}` : ""}`;
}

function PrimaryCell(props: {
  name: string;
  secondary: string;
  shape: ChipShape;
}) {
  const hue = () => nameToHue(props.name);

  return (
    <TableCell class={styles.primaryCell}>
      <div class={styles.primaryCellInner}>
        <span
          class={`${styles.rowAvatar} ${props.shape === "round" ? styles.rowAvatarRound : styles.rowAvatarSquare}`}
          style={{
            "background-color": `hsl(${hue()} 60% 88%)`,
            color: `hsl(${hue()} 50% 32%)`,
          }}
          aria-hidden="true"
        >
          {initials(props.name)}
        </span>
        <div class={styles.primaryText}>
          <OverflowingText class={styles.primaryValue} text={props.name} />
          <OverflowingText
            class={styles.secondaryValue}
            text={props.secondary}
          />
        </div>
      </div>
    </TableCell>
  );
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
                <TableHead class={styles.headerCell}>Document</TableHead>
                <TableHead class={styles.headerCell}>Companies</TableHead>
                <TableHead class={styles.headerCell}>Phones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={props.people}>
                {(group) => (
                  <TableRow
                    tabIndex={0}
                    class={rowClass(props.selectedKey === group.key)}
                    onClick={() => props.onOpenPerson(group)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        props.onOpenPerson(group);
                      }
                    }}
                  >
                    <PrimaryCell
                      name={group.displayName}
                      secondary={
                        group.aliases.find(
                          (alias) => alias !== group.displayName,
                        ) ?? `${group.companies.length} linked companies`
                      }
                      shape="round"
                    />
                    <TableCell class={styles.codeCell}>
                      {group.doc_type} {group.doc_number}
                    </TableCell>
                    <TableCell class={styles.dataCell}>
                      <RecordChipList
                        items={group.companies
                          .map((c) => c.name ?? c.ruc ?? "")
                          .filter((v) => v.length > 0)}
                        shape="square"
                      />
                    </TableCell>
                    <TableCell class={styles.dataCell}>
                      <RecordChipList items={group.phones} shape="square" />
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
                <TableHead class={styles.headerCell}>Phones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={props.companies}>
                {(group) => (
                  <TableRow
                    tabIndex={0}
                    class={rowClass(props.selectedKey === group.key)}
                    onClick={() => props.onOpenCompany(group)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        props.onOpenCompany(group);
                      }
                    }}
                  >
                    <PrimaryCell
                      name={group.name ?? "Unknown company"}
                      secondary={group.ruc ?? "No RUC"}
                      shape="square"
                    />
                    <TableCell class={styles.codeCell}>
                      {group.ruc ?? "—"}
                    </TableCell>
                    <TableCell class={styles.dataCell}>
                      <RecordChipList items={group.phones} shape="square" />
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

// helpers

function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? "?").toUpperCase();
  return (
    (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
  ).toUpperCase();
}
