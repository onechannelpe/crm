import { A } from "@solidjs/router";
import { createMemo, createSignal, For, Show } from "solid-js";

import Search from "~/components/icons/search";
import { Button } from "~/components/ui/button";
import { type Role } from "~/lib/auth/access/rbac";
import { getSearchRoutes } from "~/lib/auth/access/route-policy";

interface HeaderSearchPanelProps {
  role?: Role;
}

export function HeaderSearchPanel(props: HeaderSearchPanelProps) {
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const visibleItems = createMemo(() => {
    const text = query().trim().toLowerCase();
    return getSearchRoutes(props.role).filter((it) => {
      if (!text) return true;
      return it.label.toLowerCase().includes(text) || it.href.includes(text);
    });
  });

  return (
    <div class="relative">
      <Button
        variant="ghost"
        size="icon"
        class="text-muted-foreground rounded-full"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Search class="w-4 h-4" />
      </Button>
      <Show when={open()}>
        <div class="crm-surface absolute right-0 z-20 mt-2 w-80 rounded-2xl p-2.5">
          <input
            class="w-full rounded-xl border border-border/80 bg-white/70 px-3 py-2 text-sm"
            placeholder="Buscar modulo o ruta"
            value={query()}
            onInput={(event) => setQuery(event.currentTarget.value)}
          />
          <div class="mt-2 max-h-72 space-y-1 overflow-auto">
            <For each={visibleItems()}>
              {(item) => (
                <A
                  href={item.href}
                  class="block rounded-xl px-2.5 py-2 text-sm hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </A>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
