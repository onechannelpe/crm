import { For, Match, Show, Switch, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

import { Button } from "~/components/ui/input/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import type { TableColumn } from "./table-column";

import styles from "./data-table.module.css";

export type DataTableStatus = "pending" | "ready" | "error";

export type DataTableLoadMore = {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void | Promise<void>;
};

type DataTableProps<T> = {
  ariaLabel: string;
  columns: ReadonlyArray<TableColumn<T>>;
  rows: ReadonlyArray<T>;
  status?: DataTableStatus;
  emptyState: JSX.Element;
  errorState?: JSX.Element;
  loadingState?: JSX.Element;
  onRowClick?: (row: T) => void;
  loadMore?: DataTableLoadMore;
};

export function DataTable<T>(props: DataTableProps<T>) {
  const stateCell = (content: JSX.Element) => (
    <TableRow>
      <TableCell
        colSpan={props.columns.length}
        align="center"
        class={styles.stateCell}
      >
        {content}
      </TableCell>
    </TableRow>
  );

  return (
    <Table variant="list" aria-label={props.ariaLabel}>
      <TableHeader>
        <TableRow>
          <For each={props.columns}>
            {(column) => (
              <TableHead
                align={column.align}
                style={
                  column.width ? { width: `${column.width}px` } : undefined
                }
              >
                <span class={styles.headLabel}>
                  <Show when={column.icon}>
                    {(icon) => <Dynamic component={icon()} size={14} />}
                  </Show>
                  {column.label}
                </span>
              </TableHead>
            )}
          </For>
        </TableRow>
      </TableHeader>

      <TableBody>
        <Switch>
          <Match when={props.status === "error"}>
            {stateCell(props.errorState)}
          </Match>
          <Match when={props.rows.length > 0}>
            <For each={props.rows}>
              {(row) => (
                <TableRow
                  clickable={props.onRowClick !== undefined}
                  onClick={() => props.onRowClick?.(row)}
                >
                  <For each={props.columns}>
                    {(column) => (
                      <TableCell align={column.align}>
                        {column.renderCell(row)}
                      </TableCell>
                    )}
                  </For>
                </TableRow>
              )}
            </For>
          </Match>
          <Match when={props.status === "pending"}>
            {stateCell(props.loadingState ?? "Cargando...")}
          </Match>
          <Match when={true}>{stateCell(props.emptyState)}</Match>
        </Switch>
      </TableBody>

      <Show when={props.loadMore}>
        {(loadMore) => (
          <Show when={loadMore().hasMore}>
            <tfoot>
              <tr>
                <td colSpan={props.columns.length} class={styles.loadMoreCell}>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={loadMore().loading}
                    onClick={() => void loadMore().onLoadMore()}
                  >
                    Cargar más
                  </Button>
                </td>
              </tr>
            </tfoot>
          </Show>
        )}
      </Show>
    </Table>
  );
}
