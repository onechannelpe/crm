import type { JSX } from "solid-js";

import { cn } from "~/lib/utils";

export const Table = (props: JSX.HTMLAttributes<HTMLTableElement>) => (
  <div class="relative w-full overflow-auto">
    <table
      class={cn("w-full caption-bottom text-[13px]", props.class)}
      {...props}
    />
  </div>
);

export const TableHeader = (
  props: JSX.HTMLAttributes<HTMLTableSectionElement>,
) => (
  <thead class={cn("[&_tr]:border-b border-border bg-surface", props.class)} {...props} />
);

export const TableBody = (
  props: JSX.HTMLAttributes<HTMLTableSectionElement>,
) => <tbody class={cn("[&_tr:last-child]:border-0", props.class)} {...props} />;

export const TableFooter = (
  props: JSX.HTMLAttributes<HTMLTableSectionElement>,
) => (
  <tfoot
    class={cn(
      "border-t border-border bg-surface font-medium [&>tr]:last:border-b-0",
      props.class,
    )}
    {...props}
  />
);

export const TableRow = (props: JSX.HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    class={cn(
      "h-8 border-b border-border transition-colors hover:bg-muted/35 data-[state=selected]:bg-muted/40",
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
      "h-8 border-r border-border px-2 text-left align-middle text-[13px] font-medium text-muted-foreground last:border-r-0 [&:has([role=checkbox])]:pr-0",
      props.class,
    )}
    {...props}
  />
);

export const TableCell = (
  props: JSX.TdHTMLAttributes<HTMLTableCellElement>,
) => (
  <td
    class={cn(
      "h-8 border-r border-border px-2 align-middle last:border-r-0 [&:has([role=checkbox])]:pr-0",
      props.class,
    )}
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
