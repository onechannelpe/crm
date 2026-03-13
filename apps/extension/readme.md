# The extension

Runs in the browser during calls. It tracks call state, records audio, and syncs events back to the web application.

The service worker entrypoint is [`entrypoints/background.ts`](entrypoints/background.ts). Runtime orchestration is in [`src/background/runtime.ts`](src/background/runtime.ts). That runtime hydrates persisted state on startup, ensures the sync alarm exists, accepts internal and external messages, mutates state, appends queue jobs, and flushes jobs when transitions require sync. Popup and sidepanel entrypoints are under [`entrypoints/popup/`](entrypoints/popup/) and [`entrypoints/sidepanel/`](entrypoints/sidepanel/). Message contracts are in [`src/domain/messages.ts`](src/domain/messages.ts). State shape is in [`src/domain/model.ts`](src/domain/model.ts).

The handoff starts in the web application. The web application creates a signed handoff token through [`handoff-token.ts (web)`](../web/src/routes/api/extension/handoff-token.ts) and sends `assignment.handoff` through [`runtime.ts (web extension)`](../web/src/lib/extension/runtime.ts). The extension verifies sender origin and token signature in [`src/services/external-auth.ts`](src/services/external-auth.ts), then claims a session through [`claim.ts (web)`](../web/src/routes/api/extension/session/claim.ts). Queued extension events are posted to [`events.ts (web)`](../web/src/routes/api/extension/events.ts). Session refresh uses [`refresh.ts (web)`](../web/src/routes/api/extension/session/refresh.ts).

`CRM_WEB_ORIGIN` is read by [`wxt.config.ts`](wxt.config.ts) and converted into host permissions and externally connectable origins. `VITE_CRM_WEB_ORIGIN` is read by the client runtime and defaults to `http://localhost:3000`. Durable state is stored through [`src/services/storage.ts`](src/services/storage.ts). Large recording payloads are stored through [`src/services/journal.ts`](src/services/journal.ts). Queue and sync helpers are in [`src/services/queue.ts`](src/services/queue.ts) and [`src/services/sync.ts`](src/services/sync.ts).

## Running

Run from `apps/extension/`:

```sh
bun run dev
bun run dev:firefox
bun run build
bun run zip
```

## Validation

Validation commands:

```sh
bun run check
bun run test:integration
```

## First reads

Start with [`src/background/runtime.ts`](src/background/runtime.ts), [`src/domain/model.ts`](src/domain/model.ts), and [`src/domain/messages.ts`](src/domain/messages.ts). Then read [`src/services/external-auth.ts`](src/services/external-auth.ts), [`src/services/sync.ts`](src/services/sync.ts), and [`extension service (web)`](../web/src/server/extension/service.ts).
