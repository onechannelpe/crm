import type { JSX } from "solid-js";

import { cn } from "~/lib/utils";

export const Table = (props: JSX.HTMLAttributes<HTMLTableElement>) => (
  <div class="relative w-full overflow-auto rounded-3xl border border-border/85 bg-surface shadow-elevation-2">
    <table
      class={cn("w-full caption-bottom text-sm", props.class)}
      {...props}
    />
  </div>
);

export const TableHeader = (
  props: JSX.HTMLAttributes<HTMLTableSectionElement>,
) => (
  <thead class={cn("[&_tr]:border-b bg-muted/55", props.class)} {...props} />
);

export const TableBody = (
  props: JSX.HTMLAttributes<HTMLTableSectionElement>,
) => <tbody class={cn("[&_tr:last-child]:border-0", props.class)} {...props} />;

export const TableFooter = (
  props: JSX.HTMLAttributes<HTMLTableSectionElement>,
) => (
  <tfoot
    class={cn(
      "border-t border-border/85 bg-muted/50 font-medium [&>tr]:last:border-b-0",
      props.class,
    )}
    {...props}
  />
);

export const TableRow = (props: JSX.HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    class={cn(
      "border-b border-border/75 transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      props.class,
    )}
    {...props}
  />
);

export const TableHead = (
  props: JSX.ThHTMLAttributes<HTMLTableCellElement>,
) => (
  <th
    class={cn(
      "h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground [&:has([role=checkbox])]:pr-0",
      props.class,
    )}
    {...props}
  />
);

export const TableCell = (
  props: JSX.TdHTMLAttributes<HTMLTableCellElement>,
) => (
  <td
    class={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", props.class)}
    {...props}
  />
);

export const TableCaption = (
  props: JSX.HTMLAttributes<HTMLTableCaptionElement>,
) => (
  <caption
    class={cn("mt-4 text-sm text-muted-foreground", props.class)}
    {...props}
  />
);
