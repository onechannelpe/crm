import { Show, type Accessor, type JSX } from "solid-js";

interface PresentProps<T> {
  when: T | null | undefined;
  fallback?: JSX.Element;
  children: (value: Accessor<T>) => JSX.Element;
}

// <Show> narrows to NonNullable<T> in its types but checks truthiness at
// runtime. For a number that is a trap: 0 is present, and `<Show when={gpv}>`
// renders the fallback for a merchant that simply billed nothing.
//
// Present keys on `!= null` instead. The value is boxed so the underlying Show
// always sees a truthy object, which is what lets 0, "" and false through.
export function Present<T>(props: PresentProps<T>): JSX.Element {
  return (
    <Show
      when={props.when == null ? null : { value: props.when }}
      fallback={props.fallback}
    >
      {(box) => props.children(() => box().value)}
    </Show>
  );
}
