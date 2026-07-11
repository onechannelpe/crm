import { splitProps, type JSX } from "solid-js";

import { cn } from "~/lib/utils";

import styles from "./table-grid.module.css";

export const Table = (props: JSX.HTMLAttributes<HTMLDivElement>) => {
  const [local, others] = splitProps(props, ["class"]);
  return <div class={cn(styles.table, local.class)} {...others} />;
};

type TableRowProps = JSX.HTMLAttributes<HTMLDivElement> & {
  gridTemplateColumns?: string;
  clickable?: boolean;
};

export const TableRow = (props: TableRowProps) => {
  const [local, others] = splitProps(props, [
    "class",
    "gridTemplateColumns",
    "clickable",
    "style",
  ]);
  return (
    <div
      data-table-row
      data-clickable={local.clickable ? "true" : undefined}
      class={cn(styles.row, local.class)}
      style={{
        ...(typeof local.style === "object" ? local.style : {}),
        "grid-template-columns": local.gridTemplateColumns ?? "none",
      }}
      {...others}
    />
  );
};

type TableHeaderProps = JSX.HTMLAttributes<HTMLDivElement> & {
  align?: "left" | "center" | "right";
};

export const TableHeader = (props: TableHeaderProps) => {
  const [local, others] = splitProps(props, ["class", "align"]);
  return (
    <div
      data-table-header
      data-align={local.align ?? "left"}
      class={cn(styles.header, local.class)}
      {...others}
    />
  );
};

type TableCellProps = JSX.HTMLAttributes<HTMLDivElement> & {
  align?: "left" | "center" | "right";
  ellipsis?: boolean;
};

export const TableCell = (props: TableCellProps) => {
  const [local, others] = splitProps(props, ["class", "align", "ellipsis"]);
  return (
    <div
      data-align={local.align ?? "left"}
      class={cn(styles.cell, local.ellipsis && styles.ellipsis, local.class)}
      {...others}
    />
  );
};
