# extension

Browser extension runtime for call state, recording sync, popup UI, and sidepanel UI.

The service worker entrypoint is [`entrypoints/background.ts`](entrypoints/background.ts). Runtime orchestration is in [`src/background/runtime.ts`](src/background/runtime.ts). That runtime hydrates persisted state on startup, ensures the sync alarm exists, accepts internal and external messages, mutates state, appends queue jobs, and flushes jobs when transitions require sync. Popup and sidepanel entrypoints are under [`entrypoints/popup/`](entrypoints/popup/) and [`entrypoints/sidepanel/`](entrypoints/sidepanel/). Message contracts are in [`src/domain/messages.ts`](src/domain/messages.ts). State shape is in [`src/domain/model.ts`](src/domain/model.ts).

`CRM_WEB_ORIGIN` is read by [`wxt.config.ts`](wxt.config.ts) and converted into host permissions and externally connectable origins. `VITE_CRM_WEB_ORIGIN` is read by the client runtime and defaults to `http://localhost:3000`. Durable state is stored through [`src/services/storage.ts`](src/services/storage.ts). Large recording payloads are stored through [`src/services/journal.ts`](src/services/journal.ts). Queue and sync helpers are in [`src/services/queue.ts`](src/services/queue.ts) and [`src/services/sync.ts`](src/services/sync.ts).

Run from `apps/extension/`:

```sh
bun run dev
bun run dev:firefox
bun run build
bun run zip
```

The web handoff path starts in the web app. The web app creates a signed handoff token through [`../web/src/routes/api/extension/handoff-token.ts`](../web/src/routes/api/extension/handoff-token.ts) and sends `assignment.handoff` through [`../web/src/lib/extension/runtime.ts`](../web/src/lib/extension/runtime.ts). The extension verifies sender origin and token signature in [`src/services/external-auth.ts`](src/services/external-auth.ts), then claims a session through [`../web/src/routes/api/extension/session/claim.ts`](../web/src/routes/api/extension/session/claim.ts). Queued extension events are posted to [`../web/src/routes/api/extension/events.ts`](../web/src/routes/api/extension/events.ts). Session refresh uses [`../web/src/routes/api/extension/session/refresh.ts`](../web/src/routes/api/extension/session/refresh.ts). Server-side extension persistence and ingest live in [`../web/src/server/extension/service.ts`](../web/src/server/extension/service.ts), [`../web/src/server/extension/repos.ts`](../web/src/server/extension/repos.ts), and [`../web/src/lib/db/schema/06-extensions.ts`](../web/src/lib/db/schema/06-extensions.ts).

Build artifacts are written under `.output/`. Host permissions include the configured CRM web origin plus localhost fallbacks.

Validation commands:

```sh
bun run test:extension:integration
bun run check
bun run test:integration
```

A practical first read order is [`src/background/runtime.ts`](src/background/runtime.ts), [`src/domain/model.ts`](src/domain/model.ts), [`src/domain/messages.ts`](src/domain/messages.ts), [`src/services/external-auth.ts`](src/services/external-auth.ts), [`src/services/sync.ts`](src/services/sync.ts), and [`../web/src/server/extension/service.ts`](../web/src/server/extension/service.ts).
