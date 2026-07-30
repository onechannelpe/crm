# Cold SSR startup socket failure investigation

Date: 2026-07-30  
Repository: `/home/dubu/git/culqi360`

## Reported failure

The development server logs:

```text
[INFO] [db-client] db_initialization_started {"protocol":"postgres","host":"localhost","port":"5432","database":"crm"}
[Bun.serve]: request timed out after 10 seconds. Pass `idleTimeout` to configure.
[vite] Internal server error: The socket connection was closed unexpectedly.
For more information, pass `verbose: true` in the second argument to fetch()
```

The failure occurs on cold SSR startup. It is not an application `fetch()`
failure. The failing fetch is Nitro/env-runner's internal HTTP proxy request to
its development worker.

## Reproduction

The issue was reproduced with a fresh Vite cache while PostgreSQL was running:

```text
VITE v8.2.0 ready in 3877 ms
[INFO] [db-client] db_initialization_started ...
[Bun.serve]: request timed out after 10 seconds.
[vite] Internal server error: The socket connection was closed unexpectedly.
```

Cold request result:

```text
status=500
total=13.231025 seconds
bytes=1132
```

The returned HTML was Vite's error overlay containing the exact socket-closed
message.

A subsequent warm request returned a redirect in approximately 46 ms. In another
run, repeated warm requests completed in 10-36 ms.

The failure was reproduced again without `NITRO_DEBUG`:

```text
status=500
total=13.255324 seconds
```

This rules out debug logging as the cause.

## Measured startup work

A temporary timing probe around Nitro's two Vite environment entry imports
measured:

```text
[nitro-entry-probe] nitro loaded .../nitro/dist/runtime/internal/vite/dev-entry.mjs in 5441ms
[nitro-entry-probe] ssr loaded .../apps/web/src/entry-server.tsx in 21327ms
```

The cold request failed before the 21.3-second SSR import completed:

```text
cold_request status=500 total=13.384331
```

A separate `NITRO_DEBUG=1` run counted the module-runner activity:

```text
module_fetches=1694
unique_fetch_targets=651
module_executions=622
unique_executed_targets=606
```

Modules reported as taking more than two seconds were cumulative import-chain
parents, including:

```text
apps/web/src/entry-server.tsx
nitro/dist/runtime/internal/vite/dev-entry.mjs
@solidjs/start/dist/server/index.jsx
@solidjs/start/dist/server/StartServer.jsx
apps/web/src/app.tsx
@solidjs/start/dist/router.jsx
@solidjs/start/dist/server/routes.js
solid-start:routes
apps/web/src/routes/(app).tsx?pick=route
apps/web/src/features/auth/data/queries.ts
apps/web/src/actions/auth/invite.ts
apps/web/src/server/platform/action/public-action.ts
apps/web/src/server/platform/action/ports.ts
apps/web/src/server/platform/container/index.ts
apps/web/src/server/merchant-stats/infrastructure/runtime.ts
```

## Timeout path

`apps/web/package.json` starts Vite with Bun:

```json
"dev:server": "bun --env-file=../../.env --bun vite --config vite.config.ts"
```

Nitro uses `env-runner` for its development worker. The relevant installed
implementation is:

```text
node_modules/.bun/env-runner@0.1.16/node_modules/env-runner/
```

`BaseEnvRunner.fetch()` proxies requests with `httpxy.proxyFetch()` to the
worker's local HTTP server:

```text
env-runner/dist/_chunks/common-base-runner.mjs
```

The node-worker creates that local server through srvx:

```text
env-runner/dist/runners/node-worker/worker.mjs
```

srvx imports `node:http` and calls `nodeHTTP.createServer()`:

```text
node_modules/.bun/srvx@0.11.21/node_modules/srvx/dist/adapters/node.mjs
```

Because Vite is running under Bun, this internal Node-compatible HTTP server is
backed by Bun. Bun closes a connection after 10 seconds with no bytes sent by
default. Handler computation does not count as connection activity.

Official Bun documentation states:

```text
https://github.com/oven-sh/bun/blob/main/docs/runtime/http/server.mdx
```

The approximately 13.3-second public request time consists of internal runner
readiness/polling plus the worker connection reaching Bun's 10-second idle
timeout.

The `verbose: true` suggestion applies to the internal Bun fetch performed by
env-runner/httpxy. Adding it to application fetch calls would not instrument
this boundary.

## Custom Nitro patch

The repository declares:

```json
"patchedDependencies": {
  "nitro@3.0.260610-beta": "patches/nitro@3.0.260610-beta.patch"
}
```

The patch changes Nitro's `ViteEnvRunner.fetch()` startup behavior.

Unpatched Nitro polls for an entry for at most 3.1 seconds:

```js
for (let i = 0; i < 5 && !(this.entry || this.entryError); i++) {
  await new Promise((r) => setTimeout(r, 100 * Math.pow(2, i)));
}
```

The repository patch replaces that polling with:

```js
await this.entryPromise;
```

File:

```text
patches/nitro@3.0.260610-beta.patch
```

This makes the internal HTTP request remain open for the complete SSR entry
import. The measured SSR import was 21.3 seconds, longer than Bun's 10-second
idle timeout.

### Installed patched file mismatch

The installed Nitro file did not match the result of applying the committed
patch. It contained a malformed combination:

```js
for (let i = 0; i < 5 && !(this.entry || this.entryError); i++) {
  await new Promise((r) => setTimeout(r, 100 * Math.pow(2, i)));
await this.entryPromise;
}
if (!this.entry) {
```

The installed file retained the old loop, inserted `await this.entryPromise`
inside it, and lost the `entryError` check.

Installed path:

```text
apps/web/node_modules/nitro/dist/runtime/internal/vite/dev-worker.mjs
```

Resolved Bun package path during the investigation:

```text
node_modules/.bun/nitro@3.0.260610-beta+98683c497d7390ad/node_modules/nitro/dist/runtime/internal/vite/dev-worker.mjs
```

The committed patch was checked against the pristine npm tarball for
`nitro@3.0.260610-beta`. `git apply --check` succeeded, and applying it produced
the expected code:

```js
async fetch(req, init) {
  await this.entryPromise;
  if (this.entryError) {
    throw this.entryError;
  }
  if (!this.entry) {
    // ...
  }
}
```

Therefore:

- The committed patch applies cleanly to the pristine Nitro package.
- The installed patched dependency was not the clean result of that patch.
- The malformed installed file has a separate error-propagation problem.
- Both the malformed installed version and the intended patch wait on the SSR
  entry promise long enough to encounter the internal Bun timeout.

## Application module fan-out

The application contains:

```text
65 route TypeScript/TSX files
63 action TypeScript files
1410 TypeScript/TSX files under apps/web/src
```

SolidStart generates route and server-function manifests during SSR startup. The
cold debug run executed 606 unique module targets.

The first authenticated layout preload starts at:

```text
apps/web/src/routes/(app).tsx
```

It imports `meQuery`:

```ts
import { meQuery } from "~/features/auth/data/queries";

export const route = {
  preload: () => meQuery(),
};
```

The shared auth query module imports several unrelated action boundaries:

```text
apps/web/src/features/auth/data/queries.ts
```

```ts
import { getInviteActivationView } from "~/actions/auth/invite";
import { getRecoveryCodesStatus } from "~/actions/auth/recovery-codes";
import { getLoginFlow, getMe } from "~/actions/auth/session";
```

Loading `meQuery` therefore also discovers invite activation, recovery codes,
and login-flow action graphs.

The session action imports:

```text
apps/web/src/actions/auth/session/index.ts
```

```ts
import { getServerRuntime } from "~/server/platform/container";
```

The global container statically imports all subsystem runtime factories:

```text
apps/web/src/server/platform/container/index.ts
```

Imports include:

```text
engine
merchant stats
record import realtime
admin
auth
avatar
capacity
client search
contact assignments
event logs
extension
files
integrations
notifications
observability
search
security
team
users
workflow
```

The files under `apps/web/src/server/platform/container` total approximately
1009 lines and import large service/repository graphs.

The container memoizes runtime construction:

```ts
const merchantStats = memo(() => createMerchantStatsRuntime(...));
```

This does not defer ESM module loading. All top-level static imports in
`container/index.ts` and the imported runtime modules are resolved and evaluated
before a getter is called.

The observed cold import chain included:

```text
(app).tsx
  -> features/auth/data/queries.ts
  -> auth action modules
  -> server/platform/container/index.ts
  -> all subsystem runtime factory imports
  -> repositories, services, queues, integrations, and supporting modules
```

## Database findings

PostgreSQL was running and accepting connections during reproduction. Migrations
completed successfully:

```text
[INFO] [db-migrate-cli] migration_complete
```

Seed initialization completed or reported that the database was already
initialized.

The logged function is:

```text
apps/web/src/server/platform/database/client.ts
```

```ts
export function createDb(connectionString: string): Kysely<DatabaseSchema> {
  logger.info("db_initialization_started", connectionTarget(connectionString));

  const pool = new Pool({ connectionString, types: createPoolTypes() });

  return new Kysely<DatabaseSchema>({
    dialect: new PostgresDialect({ pool }),
  });
}
```

This constructs a node-postgres pool and Kysely instance. It does not execute a
database query at that point. The log appears while the SSR module graph is
evaluating because the global server container imports database infrastructure.

No evidence showed a database connection or query blocking for 10 seconds.

## Controlled comparisons

### Vite 8.1.4

The application was started with the already installed Vite 8.1.4 CLI and a
fresh cache:

```text
VITE v8.1.4 ready in 2382 ms
[Bun.serve]: request timed out after 10 seconds.
[vite] Internal server error: The socket connection was closed unexpectedly.
status=500
total=13.255766 seconds
```

The same failure occurs with Vite 8.1.4 and Vite 8.2.0 under the current
application and dependency graph.

### Sentry server initialization

`apps/web/src/entry-server.tsx` imports:

```ts
import "~/instrument.server";
```

`apps/web/src/instrument.server.ts` imports and initializes `@sentry/bun`.
Current Sentry documentation and installed types show that the Bun/Node SDK
registers default integrations and ESM loader hooks unless configured otherwise.

A temporary Vite probe replaced `~/instrument.server` with a no-op while
preserving the rest of the application and using a fresh cache.

Result:

```text
status=500
total=13.255324 seconds
module_fetches=1694
unique_fetch_targets=651
module_executions=622
unique_executed_targets=606
```

The control run with Sentry enabled produced:

```text
status=500
total=13.294018 seconds
module_fetches=1694
unique_fetch_targets=651
module_executions=622
unique_executed_targets=606
```

Server-side Sentry initialization did not materially change the failing request
duration or module-runner counts in this probe.

## Items another agent can check

- Compare the installed Nitro `dev-worker.mjs` with the committed patch output.
- Reinstall dependencies in a controlled environment and check whether the
  installed patched Nitro file is still malformed.
- Run with `NITRO_DEBUG=1` and confirm the module-runner fetch/execution counts.
- Add temporary timing around `ViteEnvRunner.reload()` for the `nitro` and `ssr`
  environments and compare with the recorded 5.4-second and 21.3-second values.
- Trace `apps/web/src/routes/(app).tsx?pick=route` through
  `features/auth/data/queries.ts` into the action and container imports.
- Inspect the generated `solid-start:routes` and
  `solid-start:server-fn-manifest` virtual modules during a cold run.
- Count which modules become reachable solely through
  `server/platform/container/index.ts`.
- Confirm that the inner timeout originates from env-runner's srvx worker server
  rather than Vite's public HTTP server.
- Check the timing relationship among worker address readiness, `proxyFetch()`,
  Bun's 10-second idle timeout, and the approximately 13.3-second public
  request.
- Confirm that `db_initialization_started` is emitted during module evaluation
  and that no database query begins at that log point.

## Investigation cleanup

Temporary Vite probe configuration and Nitro timing logs were removed after the
measurements. Diagnostic Vite and PostgreSQL processes were stopped. No tracked
source changes from the probes remained before this report was created.
