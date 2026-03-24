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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Companies</TableHead>
                <TableHead>Phones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={props.people}>
                {(group) => (
                  <TableRow
                    class={
                      props.selectedKey === group.key
                        ? "bg-secondary"
                        : undefined
                    }
                    onClick={() => props.onOpenPerson(group)}
                  >
                    <TableCell>{group.displayName}</TableCell>
                    <TableCell>{group.dni}</TableCell>
                    <TableCell>
                      <ResultPills
                        items={group.companies
                          .map((company) => company.name ?? company.ruc ?? "")
                          .filter((value) => value.length > 0)}
                      />
                    </TableCell>
                    <TableCell>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>RUC</TableHead>
                <TableHead>People</TableHead>
                <TableHead>Phones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={props.companies}>
                {(group) => (
                  <TableRow
                    class={
                      props.selectedKey === group.key
                        ? "bg-secondary"
                        : undefined
                    }
                    onClick={() => props.onOpenCompany(group)}
                  >
                    <TableCell>{group.name ?? "Unknown company"}</TableCell>
                    <TableCell>{group.ruc ?? "-"}</TableCell>
                    <TableCell>
                      <ResultPills
                        items={group.people
                          .map((person) => person.name || person.dni)
                          .filter((value) => value.length > 0)}
                      />
                    </TableCell>
                    <TableCell>
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
