# Benchmarks

Benchmark suites for `apps/web`. Run them with `bun run --cwd apps/web test:perf`. Each row maps a benchmark domain to its action bench files and component bench files.

| Domain                     | Actions                           | Components                                                 |
| -------------------------- | --------------------------------- | ---------------------------------------------------------- |
| `auth/`                    | `authenticatePasswordLogin`       | `buildThrottleKeys`, `hashAuthKey`                         |
| `team-invite/`             | `createInvite`, `acceptInvite`    | `findPendingByTokenHash`                                   |
| `sales-create/`            | `createDraft`                     | `isExpired`, `createAssignment`                            |
| `sales-submit/`            | `submit`                          | `canTransition`, `findActiveLockByChargeNote`              |
| `sales-review/`            | `approve`, `reject`               | `findByIdWithOwner`                                        |
| `pending-review/`          | `getPendingReviewNotesForSession` | `findPendingReviewWithContactsByBranch`                    |
| `leads-request/`           | `requestLeads`                    | `createAssignment`, `canLockOrganization`, `canContactNow` |
| `quota-consume/`           | `consume`                         | `findByUserAndDate`                                        |
| `session-delete/`          | `deleteAllForUser`                | `listForUser`                                              |
| `inventory-release-locks/` | `releaseExpiredLocks`             | `findExpiredLocks`                                         |
