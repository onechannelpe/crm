import { useNavigate } from "@solidjs/router";
import { For, Show, type JSX } from "solid-js";

import { AppPageHeader, AppPageSection } from "~/components/layout/page";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
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
      eyebrow="Búsqueda"
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
            Personas
          </Button>
          <Button
            variant={props.current === "companies" ? "secondary" : "outline"}
            onClick={() => {
              navigate("/client-search/companies");
            }}
          >
            Empresas
          </Button>
        </>
      }
    />
  );
}

export function ClientSearchFiltersForm(props: SearchFiltersFormProps) {
  return (
    <AppPageSection class="p-4 md:p-5">
      <form class="space-y-4" onSubmit={props.onSubmit}>
        <Select
          label="Tipo de búsqueda"
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
          label="Valor"
          placeholder="Ingresa valor de búsqueda"
          value={props.query}
          onInput={(event) => props.onQueryChange(event.currentTarget.value)}
          required
        />

        <Input
          label="Límite"
          type="number"
          min="1"
          max="100"
          value={props.limit}
          onInput={(event) => props.onLimitChange(event.currentTarget.value)}
          required
        />

        <Button type="submit" class="w-full" disabled={props.searching}>
          <Show when={props.searching} fallback={props.submitLabel}>
            Buscando...
          </Show>
        </Button>
      </form>
    </AppPageSection>
  );
}

export function ClientSearchStatus(props: SearchStatusProps) {
  return (
    <AppPageSection class="p-4 md:p-5">
      <div class="flex items-center justify-between">
        <p class="text-sm text-muted-foreground">
          <Show
            when={props.searched}
            fallback="Define filtros y ejecuta una búsqueda."
          >
            {props.count} resultados encontrados
          </Show>
        </p>
        <Show when={props.searched}>
          <Badge variant="outline">{props.count}</Badge>
        </Show>
      </div>
    </AppPageSection>
  );
}

export function ClientSearchError(props: SearchErrorProps) {
  return (
    <Show when={props.message}>
      {(message) => (
        <div class="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {message()}
        </div>
      )}
    </Show>
  );
}

export function ClientSearchHint(props: { children: JSX.Element }) {
  return (
    <div class="rounded-2xl border border-border/70 bg-white/70 px-4 py-3 text-sm text-muted-foreground">
      {props.children}
    </div>
  );
}
