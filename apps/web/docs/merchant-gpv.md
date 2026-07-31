# Merchant statistics

Merchant statistics imports complete Culqi report snapshots and shows GPV by
merchant RUC, realized month, and CRM executive. GPV remains the user-facing
term; `merchant-stats` is the source capability that owns imports, validation,
attribution, targets, and read models.

`m0` is the GPV realized during the sale month, `m1` is the next calendar month,
and so on. A target belongs to a RUC and is effective-dated: it is the monthly
GPV the RUC should approach, not a total across the executive portfolio.

## Snapshot lifecycle

```mermaid
flowchart LR
    Upload[Upload XLSX] --> Queue[Create snapshot and job]
    Queue --> Stage[Parse and stage immutable rows]
    Stage --> Validate[Compare with the active snapshot]
    Validate -->|No blocking issue| Activate[Activate snapshot]
    Validate -->|Blocking issue| Review[Human review]
    Review --> Activate
```

[`uploadMerchantReport`](../src/rpc/merchant-stats/imports.action.ts) stores the
file and creates a queued snapshot. The maintenance worker uses the
merchant-stats runtime to process its job. Parsing is isolated in
[`intake/`](../src/server/merchant-stats/intake/); staging, validation, and
activation live in [`snapshot/`](../src/server/merchant-stats/snapshot/).

Snapshots are complete cuts. A newer cut never silently rewrites a prior cut:
the validator records blocking differences such as a missing placement, changed
RUC, or changed sale month. A human resolves those issues before activation.
Warnings, such as a RUC or owner missing from CRM, remain visible without
blocking publication.

Only one snapshot is active. Activation serializes on the dataset row,
supersedes the prior active snapshot, and freezes uncredited merchant months
against the snapshot that first made them available.

## Ownership, attribution, and targets

CRM ownership is the source of truth for an executive. Culqi's seller code is
report context, not the internal executive identity. An executive can read a RUC
only when they are its current CRM owner; managers can read the team view.

Monthly merchant credit is frozen when a snapshot first exposes the month. Later
ownership reassignment therefore does not rewrite historical progress. Managers
can record an explicit monthly credit correction through
[`adjustMonthCredit`](../src/rpc/merchant-stats/attribution.action.ts).

Targets are effective-dated per RUC. Updating the same RUC and effective month
replaces that target; adding a later effective month preserves earlier periods.

## Access

| Permission            | Access                                                           |
| --------------------- | ---------------------------------------------------------------- |
| `dashboards:read`     | Team dashboards and GPV quality views.                           |
| `dashboards:read:own` | The caller's currently owned RUCs and progress.                  |
| `dashboards:manage`   | Imports, issue resolution, targets, credits, and quality review. |

## Realtime and storage

Import progress is published through PostgreSQL notifications and streamed to
the import page with server-sent events. The stream reconciles from the durable
job row after reconnecting, so a missed browser event cannot change job state.

Uploaded workbooks and exported GPV files use the shared file service. The
snapshot references its file asset; application code does not encode a report
path or manage storage directly.

## Schema and demo data

Merchant-statistics tables are defined in
[`merchant-stats.ts`](../src/server/platform/database/schema/modules/merchant-stats.ts)
and their matching types file. Core tables include `gpv_snapshots`,
`gpv_snapshot_jobs`, `gpv_snapshot_placements`, `gpv_snapshot_observations`,
`gpv_snapshot_issues`, `merchant_month_credits`, and `merchant_gpv_targets`.

Demo data lives under
[`seeds/demo/merchant-stats/`](../src/server/platform/database/seeds/demo/merchant-stats/).
See [Database development](database.md) when changing the disposable schema.
