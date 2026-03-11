# extension

The extension runs in the browser during sales calls — it tracks call state, records audio, and syncs events back to the CRM. The interesting part isn't the UI; it's the trust model. The extension is an untrusted third party from the web app's perspective, so before it can sync anything, it has to prove it's talking to the right CRM instance. That authentication handshake shapes the whole architecture.

## The handoff

When an agent logs in via the web app, the web app creates a signed handoff token and sends an `assignment.handoff` message to the extension. The extension verifies the sender's origin and the token signature in [`src/services/external-auth.ts`](src/services/external-auth.ts), then uses the token to claim a real session from the web app. From that point on, the extension has a session it can refresh, and it posts queued events back to the web app through a dedicated API. None of this works unless `CRM_WEB_ORIGIN` is configured correctly — that's what controls which origins the extension trusts and accepts connections from.

## Runtime

The service worker in [`entrypoints/background.ts`](entrypoints/background.ts) is the extension's backbone. All orchestration runs through [`src/background/runtime.ts`](src/background/runtime.ts): it hydrates persisted state on startup, keeps a sync alarm running, processes incoming messages (both internal from the popup/sidepanel and external from the web app), mutates state, and flushes sync jobs when call state transitions require it.

State shape is in [`src/domain/model.ts`](src/domain/model.ts) and the message contracts in [`src/domain/messages.ts`](src/domain/messages.ts) — read those two files first and the rest of the runtime will make sense. Durable state is persisted through [`src/services/storage.ts`](src/services/storage.ts). Recording payloads are large enough to need their own store in [`src/services/journal.ts`](src/services/journal.ts). Queue and sync logic are in [`src/services/queue.ts`](src/services/queue.ts) and [`src/services/sync.ts`](src/services/sync.ts).

The popup and sidepanel are under [`entrypoints/popup/`](entrypoints/popup/) and [`entrypoints/sidepanel/`](entrypoints/sidepanel/) and communicate with the runtime via the message contracts.

## Configuration

`CRM_WEB_ORIGIN` is read by [`wxt.config.ts`](wxt.config.ts) at build time and baked into the extension's host permissions and externally connectable origins. `VITE_CRM_WEB_ORIGIN` is the runtime equivalent, defaulting to `http://localhost:3000` in development. Build artifacts go to `.output/`.

## Running

```sh
bun run dev          # Chrome
bun run dev:firefox
bun run build
bun run zip
```

## Validation

```sh
bun run check
bun run test:integration
bun run test:extension:integration
```
