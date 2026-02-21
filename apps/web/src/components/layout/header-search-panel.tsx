import { A, useNavigate } from "@solidjs/router";
import { createMemo, createSignal, For, Show } from "solid-js";

import Search from "~/components/icons/search";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { DS_Z_INDEX } from "~/components/ui/theme/design-system";
import { useDismissibleLayer } from "~/components/ui/utilities/use-dismissible-layer";
import { type Role } from "~/lib/auth/access/rbac";
import { getSearchRoutes } from "~/lib/auth/access/route-policy";

interface HeaderSearchPanelProps {
  role?: Role;
}

export function HeaderSearchPanel(props: HeaderSearchPanelProps) {
  const navigate = useNavigate();
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal("");
  let containerRef: HTMLDivElement | undefined;

  useDismissibleLayer({
    enabled: open,
    onDismiss: () => setOpen(false),
    getContainer: () => containerRef,
  });

  const visibleItems = createMemo(() => {
    const text = query().trim().toLowerCase();
    return getSearchRoutes(props.role).filter((it) => {
      if (!text) return true;
      return it.label.toLowerCase().includes(text) || it.href.includes(text);
    });
  });

  return (
    <div
      class="relative"
      ref={(element) => {
        containerRef = element;
      }}
    >
      <Button
        variant="ghost"
        size="icon"
        class="text-muted-foreground"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Search class="w-4 h-4" />
      </Button>
      <Show when={open()}>
        <div
          class="crm-overlay-panel absolute right-0 mt-2 w-80 rounded-sm p-2"
          style={{ "z-index": DS_Z_INDEX.overlay }}
        >
          <Input
            class="h-8"
            placeholder="Search page"
            value={query()}
            onInput={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              const firstMatch = visibleItems()[0];
              if (!firstMatch) return;
              event.preventDefault();
              navigate(firstMatch.href);
              setOpen(false);
            }}
          />
          <div class="mt-2 max-h-72 space-y-1 overflow-auto">
            <For each={visibleItems()}>
              {(item) => (
                <A
                  href={item.href}
                  class="block rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
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
