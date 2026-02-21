import { useNavigate } from "@solidjs/router";
import { For, Show, type JSX } from "solid-js";

import { AppPageHeader } from "~/components/layout/page";
import { Badge } from "~/components/ui/display/badge";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { Select } from "~/components/ui/input/select";
import type { SearchType } from "~/server/shared/engine/types";

interface SearchPageHeaderProps {
  title: string;
  description: string;
  current: "people" | "companies";
}

interface SearchFiltersFormProps {
  searchType: SearchType;
  allowedTypes: readonly SearchType[];
  labels: Partial<Record<SearchType, string>>;
  query: string;
  limit: string;
  searching: boolean;
  submitLabel: string;
  onSearchTypeChange: (value: SearchType) => void;
  onQueryChange: (value: string) => void;
  onLimitChange: (value: string) => void;
  onSubmit: (event: SubmitEvent) => void;
}

interface SearchStatusProps {
  searched: boolean;
  count: number;
}

interface SearchErrorProps {
  message: string | null;
}

export function ClientSearchHeader(props: SearchPageHeaderProps) {
  const navigate = useNavigate();

  return (
    <AppPageHeader
      eyebrow="Search"
      title={props.title}
      description={props.description}
      actions={
        <>
          <Button
            variant={props.current === "people" ? "secondary" : "outline"}
            onClick={() => {
              navigate("/client-search/people");
            }}
          >
            People
          </Button>
          <Button
            variant={props.current === "companies" ? "secondary" : "outline"}
            onClick={() => {
              navigate("/client-search/companies");
            }}
          >
            Companies
          </Button>
        </>
      }
    />
  );
}

export function ClientSearchFiltersForm(props: SearchFiltersFormProps) {
  return (
    <section class="tw-record-index-panel p-4 md:p-5">
      <form class="space-y-4" onSubmit={props.onSubmit}>
        <Select
          label="Search type"
          value={props.searchType}
          onInput={(event) => {
            const nextType = event.currentTarget.value;
            const allowedType = props.allowedTypes.find(
              (type) => type === nextType,
            );
            if (!allowedType) return;
            props.onSearchTypeChange(allowedType);
          }}
        >
          <For each={props.allowedTypes}>
            {(type) => (
              <option value={type}>{props.labels[type] ?? type}</option>
            )}
          </For>
        </Select>

        <Input
          label="Value"
          placeholder="Enter search value"
          value={props.query}
          onInput={(event) => props.onQueryChange(event.currentTarget.value)}
          required
        />

        <Input
          label="Limit"
          type="number"
          min="1"
          max="100"
          value={props.limit}
          onInput={(event) => props.onLimitChange(event.currentTarget.value)}
          required
        />

        <Button type="submit" class="w-full" disabled={props.searching}>
          <Show when={props.searching} fallback={props.submitLabel}>
            Searching...
          </Show>
        </Button>
      </form>
    </section>
  );
}

export function ClientSearchStatus(props: SearchStatusProps) {
  return (
    <section class="tw-record-index-panel p-4 md:p-5">
      <div class="flex items-center justify-between">
        <p class="text-sm text-muted-foreground">
          <Show when={props.searched} fallback="Set filters and run a search.">
            {props.count} results found
          </Show>
        </p>
        <Show when={props.searched}>
          <Badge variant="outline">{props.count}</Badge>
        </Show>
      </div>
    </section>
  );
}

export function ClientSearchError(props: SearchErrorProps) {
  return (
    <Show when={props.message}>
      {(message) => (
        <div class="rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {message()}
        </div>
      )}
    </Show>
  );
}

export function ClientSearchHint(props: { children: JSX.Element }) {
  return (
    <div class="border border-border px-4 py-3 text-sm text-muted-foreground">
      {props.children}
    </div>
  );
}
