import {
  createAsync,
  revalidate,
  useAction,
  useSubmission,
} from "@solidjs/router";
import { createEffect, onCleanup, type Accessor } from "solid-js";

import { requestEnrichmentMutation } from "~/lib/mutations/enrichment";
import { enrichmentStatusQuery } from "~/lib/queries/enrichment";
import type { SearchEnrichmentOverlay } from "~/server/client-search/enrichment-service";

export type OverlayChangeHandler = (
  key: string,
  overlay: SearchEnrichmentOverlay | null,
) => void;

const ENRICHMENT_POLL_MS = 3_000;

interface EnrichmentSlotOptions {
  type: "dni" | "ruc";
  key: Accessor<string | null>;
  onOverlayChange?: OverlayChangeHandler;
}

interface EnrichmentSlot {
  status: Accessor<string | null | undefined>;
  overlay: Accessor<SearchEnrichmentOverlay | null>;
  request: () => void;
  pending: Accessor<boolean>;
}

export function createEnrichmentSlot(
  options: EnrichmentSlotOptions,
): EnrichmentSlot {
  const enrichmentStatus = createAsync(
    () => {
      const k = options.key();
      return k ? enrichmentStatusQuery(options.type, k) : Promise.resolve(null);
    },
    { deferStream: true },
  );

  const requestEnrichment = useAction(requestEnrichmentMutation);
  const submission = useSubmission(
    requestEnrichmentMutation,
    (input) => input[0] === options.type && input[1] === options.key(),
  );

  createEffect(() => {
    const k = options.key();
    if (!k) return;
    options.onOverlayChange?.(
      `${options.type}:${k}`,
      enrichmentStatus()?.overlay ?? null,
    );
  });

  createEffect(() => {
    const s = enrichmentStatus()?.status;
    if (s !== "queued" && s !== "running") return;
    const k = options.key();
    if (!k) return;
    const timer = setInterval(
      () => void revalidate(enrichmentStatusQuery.keyFor(options.type, k)),
      ENRICHMENT_POLL_MS,
    );
    onCleanup(() => clearInterval(timer));
  });

  return {
    status: () => (submission.pending ? "running" : enrichmentStatus()?.status),
    overlay: () => enrichmentStatus()?.overlay ?? null,
    request: () => {
      const k = options.key();
      if (k) void requestEnrichment(options.type, k);
    },
    pending: () => submission.pending === true,
  };
}
