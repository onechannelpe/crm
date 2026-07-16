import { ErrorBoundary, Index, Show, Suspense, type JSX } from "solid-js";

import { WidgetCardShell } from "~/features/widgets/widget-card-shell";
import {
  WidgetGridItem,
  type WidgetSpan,
} from "~/features/widgets/widget-layout";
import { WidgetSkeleton } from "~/features/widgets/widget-skeleton";

export function AsyncTiles(props: {
  spans: WidgetSpan[];
  children: JSX.Element;
}) {
  return (
    <ErrorBoundary fallback={<TilePlaceholders spans={props.spans} failed />}>
      <Suspense fallback={<TilePlaceholders spans={props.spans} />}>
        {props.children}
      </Suspense>
    </ErrorBoundary>
  );
}

function TilePlaceholders(props: { spans: WidgetSpan[]; failed?: boolean }) {
  return (
    <Index each={props.spans}>
      {(span) => (
        <WidgetGridItem span={span()}>
          <Show when={props.failed} fallback={<WidgetSkeleton />}>
            <WidgetCardShell title="" status="error">
              <></>
            </WidgetCardShell>
          </Show>
        </WidgetGridItem>
      )}
    </Index>
  );
}
