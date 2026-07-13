import { splitProps, type JSX } from "solid-js";

import { cn } from "~/lib/utils";

import styles from "./table.module.css";

type TableProps = JSX.HTMLAttributes<HTMLTableElement> & {
  variant?: "default" | "list";
};

export const Table = (props: TableProps) => {
  const [local, tableProps] = splitProps(props, ["class", "variant"]);
  return (
    <div class={styles.wrapper}>
      <table
        class={cn(
          styles.table,
          local.variant === "list" && styles.list,
          local.class,
        )}
        {...tableProps}
      />
    </div>
  );
};

export const TableHeader = (
  props: JSX.HTMLAttributes<HTMLTableSectionElement>,
) => <thead {...props} />;

export const TableBody = (
  props: JSX.HTMLAttributes<HTMLTableSectionElement>,
) => <tbody {...props} />;

type TableRowProps = JSX.HTMLAttributes<HTMLTableRowElement> & {
  clickable?: boolean;
};

export const TableRow = (props: TableRowProps) => {
  const [local, rowProps] = splitProps(props, ["class", "clickable"]);
  return (
    <tr
      class={cn(styles.row, local.class)}
      data-clickable={local.clickable ? "true" : undefined}
      {...rowProps}
    />
  );
};

type TableHeadProps = JSX.ThHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "center" | "right";
};

export const TableHead = (props: TableHeadProps) => {
  const [local, headProps] = splitProps(props, ["align", "class"]);
  return (
    <th
      class={cn(styles.head, local.class)}
      data-align={local.align ?? "left"}
      {...headProps}
    />
  );
};

type TableCellProps = JSX.TdHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "center" | "right";
  ellipsis?: boolean;
};

export const TableCell = (props: TableCellProps) => {
  const [local, cellProps] = splitProps(props, ["align", "class", "ellipsis"]);
  return (
    <td
      class={cn(styles.cell, local.ellipsis && styles.ellipsis, local.class)}
      data-align={local.align ?? "left"}
      {...cellProps}
    />
  );
};
