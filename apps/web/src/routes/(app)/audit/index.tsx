import { createSignal, For } from "solid-js";

import {
  canManageAuditPolicies,
  getAuditPolicySnapshot,
  getAuditReaderSnapshot,
  getObservabilitySnapshot,
  upsertAuditPolicy,
} from "~/actions/admin";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Checkbox } from "~/components/ui/input/checkbox";
import { Input } from "~/components/ui/input/input";
import { Select } from "~/components/ui/input/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { createAppQuery } from "~/lib/ui/create-app-query";

import styles from "./audit-page.module.css";

const WINDOW_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 60, label: "1 hour" },
  { value: 240, label: "4 hours" },
  { value: 1440, label: "24 hours" },
] as const;

const AUDIT_WINDOW_OPTIONS = [
  { value: 240, label: "4 hours" },
  { value: 1440, label: "24 hours" },
  { value: 10080, label: "7 days" },
  { value: 43200, label: "30 days" },
] as const;

function parseStatus(value: string): "all" | "ok" | "error" {
  if (value === "ok" || value === "error") {
    return value;
  }
  return "all";
}

function parseActorUserId(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function parseRiskLevel(value: string): "high" | "medium" | "low" {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  return "medium";
}

export default function AuditObservabilityPage() {
  const [windowMinutes, setWindowMinutes] = createSignal(60);
  const [status, setStatus] = createSignal<"all" | "ok" | "error">("all");
  const [auditWindowMinutes, setAuditWindowMinutes] = createSignal(1440);
  const [onlyHighRisk, setOnlyHighRisk] = createSignal(true);
  const [actionFilter, setActionFilter] = createSignal("");
  const [entityTypeFilter, setEntityTypeFilter] = createSignal("");
  const [actorUserIdFilter, setActorUserIdFilter] = createSignal("");
  const [policyAction, setPolicyAction] = createSignal("");
  const [policyRiskLevel, setPolicyRiskLevel] = createSignal<
    "high" | "medium" | "low"
  >("medium");
  const [policyIsActive, setPolicyIsActive] = createSignal(true);
  const [policyError, setPolicyError] = createSignal<string | null>(null);
  const [snapshot, { refetch }] = createAppQuery(
    async () =>
      getObservabilitySnapshot({
        windowMinutes: windowMinutes(),
        status: status() === "all" ? undefined : status(),
        limit: 80,
      }),
    {
      windowMinutes: 60,
      summary: [],
      recent: [],
    },
  );
  const [auditSnapshot, { refetch: refetchAuditSnapshot }] = createAppQuery(
    async () =>
      getAuditReaderSnapshot({
        windowMinutes: auditWindowMinutes(),
        limit: 80,
        onlyHighRisk: onlyHighRisk(),
        action: actionFilter().trim() || undefined,
        entityType: entityTypeFilter().trim() || undefined,
        actorUserId: parseActorUserId(actorUserIdFilter()),
      }),
    {
      windowMinutes: 1440,
      events: [],
    },
  );
  const [policySnapshot, { refetch: refetchPolicySnapshot }] = createAppQuery(
    () => getAuditPolicySnapshot(),
    {
      items: [],
    },
  );
  const [canManagePolicies] = createAppQuery(
    () => canManageAuditPolicies(),
    false,
  );

  async function savePolicy(): Promise<void> {
    setPolicyError(null);
    try {
      await upsertAuditPolicy({
        action: policyAction(),
        riskLevel: policyRiskLevel(),
        isActive: policyIsActive(),
      });
      await Promise.all([refetchPolicySnapshot(), refetchAuditSnapshot()]);
    } catch {
      setPolicyError("Failed to save policy. Check values and permissions.");
    }
  }

  return (
    <AppPage>
      <div class={styles.auditGrid}>
        <div>
          <div class={styles.filterRow}>
            <div class={styles.fieldW44}>
              <Select
                label="Window"
                value={windowMinutes()}
                onInput={(event) =>
                  setWindowMinutes(Number(event.currentTarget.value))
                }
              >
                <For each={WINDOW_OPTIONS}>
                  {(option) => (
                    <option value={option.value}>{option.label}</option>
                  )}
                </For>
              </Select>
            </div>
            <div class={styles.fieldW40}>
              <Select
                label="Status"
                value={status()}
                onInput={(event) =>
                  setStatus(parseStatus(event.currentTarget.value))
                }
              >
                <option value="all">All</option>
                <option value="ok">OK</option>
                <option value="error">Errors</option>
              </Select>
            </div>
            <Button
              onClick={() => {
                void refetch();
              }}
            >
              Refresh
            </Button>
          </div>
        </div>

        <div>
          <div class={styles.filterRow}>
            <div class={styles.fieldW44}>
              <Select
                label="Audit window"
                value={auditWindowMinutes()}
                onInput={(event) =>
                  setAuditWindowMinutes(Number(event.currentTarget.value))
                }
              >
                <For each={AUDIT_WINDOW_OPTIONS}>
                  {(option) => (
                    <option value={option.value}>{option.label}</option>
                  )}
                </For>
              </Select>
            </div>
            <div class={styles.fieldW52}>
              <Input
                label="Action"
                value={actionFilter()}
                onInput={(event) => setActionFilter(event.currentTarget.value)}
                placeholder="charge_note_approved"
              />
            </div>
            <div class={styles.fieldW44}>
              <Input
                label="Entity"
                value={entityTypeFilter()}
                onInput={(event) =>
                  setEntityTypeFilter(event.currentTarget.value)
                }
                placeholder="charge_note"
              />
            </div>
            <div class={styles.fieldW28}>
              <Input
                label="Actor #"
                value={actorUserIdFilter()}
                onInput={(event) =>
                  setActorUserIdFilter(event.currentTarget.value)
                }
                placeholder="5"
              />
            </div>
            <Checkbox
              label="High risk only"
              checked={onlyHighRisk()}
              onInput={(event) => setOnlyHighRisk(event.currentTarget.checked)}
            />
            <Button
              onClick={() => {
                void refetchAuditSnapshot();
              }}
            >
              Refresh audit
            </Button>
          </div>
        </div>

        <section class={styles.section}>
          <h2 class={styles.title}>Summary by action</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Executions</TableHead>
                <TableHead>Errors</TableHead>
                <TableHead>Average (ms)</TableHead>
                <TableHead>Max (ms)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={snapshot().summary}>
                {(row) => (
                  <TableRow>
                    <TableCell class={styles.strong}>
                      {row.actionName}
                    </TableCell>
                    <TableCell>{row.count}</TableCell>
                    <TableCell>{row.errorCount}</TableCell>
                    <TableCell>{Math.round(row.avgDurationMs)}</TableCell>
                    <TableCell>{Math.round(row.maxDurationMs)}</TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </section>

        <section class={styles.section}>
          <h2 class={styles.title}>Recent events</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={snapshot().recent}>
                {(row) => (
                  <TableRow>
                    <TableCell>
                      {new Date(row.createdAt).toLocaleTimeString("en-US")}
                    </TableCell>
                    <TableCell class={styles.strong}>
                      {row.actionName}
                    </TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.durationMs}ms</TableCell>
                    <TableCell>
                      {row.actorUserId ? `#${row.actorUserId}` : "N/A"}
                    </TableCell>
                    <TableCell>{row.errorCategory}</TableCell>
                    <TableCell>
                      {row.publicError ?? row.errorCode ?? "-"}
                    </TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </section>

        <section class={styles.section}>
          <h2 class={styles.title}>Audit transitions</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={auditSnapshot().events}>
                {(row) => (
                  <TableRow>
                    <TableCell>
                      {new Date(row.createdAt).toLocaleTimeString("es-PE")}
                    </TableCell>
                    <TableCell class={styles.strong}>{row.action}</TableCell>
                    <TableCell>
                      {row.entityType}#{row.entityId}
                    </TableCell>
                    <TableCell>#{row.userId}</TableCell>
                    <TableCell>{row.changes ?? "-"}</TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </section>

        <section class={styles.section}>
          <h2 class={styles.title}>Audit risk policies</h2>
          <div class={styles.filterRow}>
            <div class={styles.fieldW52}>
              <Input
                label="Action"
                value={policyAction()}
                onInput={(event) => setPolicyAction(event.currentTarget.value)}
                placeholder="leads_requested"
              />
            </div>
            <div class={styles.fieldW36}>
              <Select
                label="Risk level"
                value={policyRiskLevel()}
                onInput={(event) =>
                  setPolicyRiskLevel(parseRiskLevel(event.currentTarget.value))
                }
              >
                <option value="high">high</option>
                <option value="medium">medium</option>
                <option value="low">low</option>
              </Select>
            </div>
            <Checkbox
              label="Active"
              checked={policyIsActive()}
              onInput={(event) =>
                setPolicyIsActive(event.currentTarget.checked)
              }
            />
            <Button
              disabled={!canManagePolicies()}
              onClick={() => {
                void savePolicy();
              }}
            >
              Save policy
            </Button>
          </div>
          <p class={styles.helperText}>
            Actions without an explicit policy are treated as high risk to avoid
            hiding critical events.
          </p>
          <p class={styles.helperText}>
            Only admin and superuser can edit policies.
          </p>
          <p class={styles.errorText}>{policyError() ?? ""}</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Protected</TableHead>
                <TableHead>Actualizada por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={policySnapshot().items}>
                {(item) => (
                  <TableRow>
                    <TableCell class={styles.strong}>{item.action}</TableCell>
                    <TableCell>{item.riskLevel}</TableCell>
                    <TableCell>{item.isActive ? "yes" : "no"}</TableCell>
                    <TableCell>{item.isProtected ? "yes" : "no"}</TableCell>
                    <TableCell>
                      {item.updatedByUserId ? `#${item.updatedByUserId}` : "-"}
                    </TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </section>
      </div>
    </AppPage>
  );
}
