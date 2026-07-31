# Diagnostics

Diagnostics cover SSR, hydration, and request tracing. They are separate from
audit and operational logs.

Server channels use `DEBUG_DIAGNOSTICS`. Browser channels use
`VITE_DEBUG_DIAGNOSTICS`. Filters use `DEBUG_DIAGNOSTICS_FILTER` and
`VITE_DEBUG_DIAGNOSTICS_FILTER`.

```sh
DEBUG_DIAGNOSTICS=ssr bun run dev
VITE_DEBUG_DIAGNOSTICS=hydration bun run dev
DEBUG_DIAGNOSTICS=requests bun run dev
DEBUG_DIAGNOSTICS=requests DEBUG_DIAGNOSTICS_REQUESTS=verbose bun run dev
DEBUG_DIAGNOSTICS=requests DEBUG_DIAGNOSTICS_REQUESTS_SLOW_MS=500 bun run dev
```

The available channels are `ssr`, `hydration`, and `requests`.

Request tracing includes document navigations, server functions, API routes,
mutations, slow responses, failures, and aborted requests. Verbose request
diagnostics also include asset traffic.
