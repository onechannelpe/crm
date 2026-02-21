import type { JSX } from "solid-js";

import { cn } from "~/lib/utils";

import styles from "./table.module.css";

export const Table = (props: JSX.HTMLAttributes<HTMLTableElement>) => (
  <div class={styles.wrapper}>
    <table class={cn(styles.table, props.class)} {...props} />
  </div>
);

export const TableHeader = (
  props: JSX.HTMLAttributes<HTMLTableSectionElement>,
) => <thead {...props} />;

export const TableBody = (
  props: JSX.HTMLAttributes<HTMLTableSectionElement>,
) => <tbody {...props} />;

export const TableFooter = (
  props: JSX.HTMLAttributes<HTMLTableSectionElement>,
) => <tfoot {...props} />;

export const TableRow = (props: JSX.HTMLAttributes<HTMLTableRowElement>) => (
  <tr class={cn(styles.row, props.class)} {...props} />
);

export const TableHead = (
  props: JSX.ThHTMLAttributes<HTMLTableCellElement>,
) => <th class={cn(styles.head, props.class)} {...props} />;

export const TableCell = (
  props: JSX.TdHTMLAttributes<HTMLTableCellElement>,
) => <td class={cn(styles.cell, props.class)} {...props} />;

export const TableCaption = (
  props: JSX.HTMLAttributes<HTMLTableCaptionElement>,
) => <caption class={cn(styles.caption, props.class)} {...props} />;
