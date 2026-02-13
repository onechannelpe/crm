import type { JSX } from "solid-js";
import { cn } from "~/lib/utils";

const Table = (props: JSX.HTMLAttributes<HTMLTableElement>) => (
    <div class="relative w-full overflow-auto rounded-lg border bg-white shadow-sm">
        <table class={cn("w-full caption-bottom text-sm", props.class)} {...props} />
    </div>
);

const TableHeader = (props: JSX.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead class={cn("[&_tr]:border-b bg-muted/40", props.class)} {...props} />
);

const TableBody = (props: JSX.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody class={cn("[&_tr:last-child]:border-0", props.class)} {...props} />
);

const TableFooter = (props: JSX.HTMLAttributes<HTMLTableSectionElement>) => (
    <tfoot class={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", props.class)} {...props} />
);

const TableRow = (props: JSX.HTMLAttributes<HTMLTableRowElement>) => (
    <tr
        class={cn(
            "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
            props.class
        )}
        {...props}
    />
);

const TableHead = (props: JSX.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th
        class={cn(
            "h-10 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
            props.class
        )}
        {...props}
    />
);

const TableCell = (props: JSX.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td
        class={cn(
            "p-4 align-middle [&:has([role=checkbox])]:pr-0",
            props.class
        )}
        {...props}
    />
);

const TableCaption = (props: JSX.HTMLAttributes<HTMLTableCaptionElement>) => (
    <caption class={cn("mt-4 text-sm text-muted-foreground", props.class)} {...props} />
);

export {
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableHead,
    TableRow,
    TableCell,
    TableCaption,
};
