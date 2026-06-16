# Action runtime

Every action is an RPC trust boundary. The authenticated runtime uses a fixed
fail-fast pipeline:

```text
parse -> authenticate -> authorize/step-up -> execute
```

Payload parsing happens before identity resolution. Malformed input and missing
sessions fail before an actor exists, so those failures are returned without an
actor-keyed telemetry row. Once authentication succeeds, authorization,
step-up, and business failures are recorded because the denied attempt can be
attributed to a known actor.

`fault-boundary.ts` is the shared internal-to-wire boundary. Expected domain
failures project directly to `WireError`; internal and external faults are
reported and then folded to `internal`. `Response` remains framework control
flow and must pass through untouched.

`public-action.ts` is for auth and login endpoints that create the actor
`runAction` normally requires. These endpoints skip identity and actor telemetry,
but still share the same fault projection rules. Domain auth events and auth
analytics remain owned by the auth flow itself.

The wire error shape carries no internal data. It contains only the kind, the
optional granular code, the render-ready message, and optional retry metadata.
The server authors user-facing copy; clients render `message` and branch only on
`kind` or `code`.
