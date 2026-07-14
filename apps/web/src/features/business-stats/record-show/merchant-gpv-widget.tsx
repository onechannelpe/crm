import { createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";

import { merchantStatsByRucQuery } from "~/lib/queries/business-stats";

import { Gauge } from "../charts/gauge";
import { LineChart } from "../charts/line-chart";
import { formatMonth, formatSolesCompact } from "../format";

import styles from "./merchant-gpv-widget.module.css";

// Per-merchant GPV on the record. Gated server-side by business-stats:read, so
// it renders empty for roles without access rather than erroring.
export function MerchantGpvWidget(props: { ruc: string }) {
  const stats = createAsync(() => merchantStatsByRucQuery(props.ruc));

  return (
    <Show when={stats()} keyed>
      {(data) => (
        <Show
          when={data.devices.length > 0}
          fallback={
            <p class={styles.empty}>Sin datos de GPV para este comercio.</p>
          }
        >
          <div class={styles.widget}>
            <Show when={data.monthly.length > 0}>
              <Gauge
                actual={data.monthly.at(-1)?.gpv ?? 0}
                target={data.projectedGpv}
                caption={formatMonth(data.monthly.at(-1)!.month)}
              />
              <div class={styles.chart}>
                <LineChart
                  points={data.monthly}
                  target={data.projectedGpv}
                  height={160}
                />
              </div>
            </Show>

            <div class={styles.devices}>
              <span class={styles.devicesTitle}>
                Dispositivos ({data.devices.length})
              </span>
              <For each={data.devices}>
                {(device) => (
                  <div class={styles.device}>
                    <span class={styles.deviceName}>
                      {device.product}
                      <Show when={device.serialNumber}>
                        <span class={styles.serial}>
                          {" "}
                          · {device.serialNumber}
                        </span>
                      </Show>
                    </span>
                    <span class={styles.deviceGpv}>
                      {device.last15dGpv != null
                        ? formatSolesCompact(device.last15dGpv)
                        : "—"}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>
      )}
    </Show>
  );
}
