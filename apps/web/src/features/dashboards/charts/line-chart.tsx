import { createMemo, For, Show } from "solid-js";

import { formatMonth, formatSolesCompact } from "../format";

export interface LinePoint {
  label: string; // ISO month
  value: number;
}

interface LineChartProps {
  points: LinePoint[];
  target?: number | null;
  height?: number;
}

const WIDTH = 640;
const PAD = { top: 16, right: 16, bottom: 28, left: 16 };

// Single-series area + line. Touch-first: the max and latest points carry direct
// value labels so nothing depends on hover. Marks use the app's blue ramp; the
// optional target is a dashed neutral reference (one measure, one axis).
export function LineChart(props: LineChartProps) {
  const height = () => props.height ?? 220;

  const geometry = createMemo(() => {
    const points = props.points;
    const h = height();
    const innerW = WIDTH - PAD.left - PAD.right;
    const innerH = h - PAD.top - PAD.bottom;
    const max = Math.max(props.target ?? 0, ...points.map((p) => p.value), 1);
    const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

    const coords = points.map((point, index) => ({
      ...point,
      x: PAD.left + stepX * index,
      y: PAD.top + innerH - (point.value / max) * innerH,
    }));

    const line = coords
      .map(
        (c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`,
      )
      .join(" ");
    const area =
      coords.length > 0
        ? `${line} L${coords[coords.length - 1].x.toFixed(1)},${(
            PAD.top + innerH
          ).toFixed(1)} L${coords[0].x.toFixed(1)},${(PAD.top + innerH).toFixed(
            1,
          )} Z`
        : "";

    const maxIndex = coords.reduce(
      (best, c, i) => (c.value > coords[best].value ? i : best),
      0,
    );
    const targetY =
      props.target != null
        ? PAD.top + innerH - (props.target / max) * innerH
        : null;

    return { coords, line, area, innerH, maxIndex, targetY };
  });

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height()}`}
      style={{ width: "100%", height: "auto", "font-family": "inherit" }}
      role="img"
      aria-label="GPV realizado por mes"
    >
      <Show when={geometry().targetY != null}>
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={geometry().targetY!}
          y2={geometry().targetY!}
          stroke="var(--muted-foreground)"
          stroke-width="1.5"
          stroke-dasharray="4 4"
          opacity="0.7"
        />
      </Show>

      <path d={geometry().area} fill="var(--color-blue-5)" opacity="0.6" />
      <path
        d={geometry().line}
        fill="none"
        stroke="var(--color-blue-11)"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      />

      <For each={geometry().coords}>
        {(coord, index) => (
          <>
            <circle
              cx={coord.x}
              cy={coord.y}
              r={index() === geometry().maxIndex ? 4 : 3}
              fill="var(--color-blue-11)"
              stroke="var(--background)"
              stroke-width="2"
            />
            <Show
              when={
                index() === geometry().maxIndex ||
                index() === geometry().coords.length - 1
              }
            >
              <text
                x={coord.x}
                y={coord.y - 8}
                text-anchor="middle"
                fill="var(--foreground)"
                font-size="11"
                font-weight="600"
              >
                {formatSolesCompact(coord.value)}
              </text>
            </Show>
            <text
              x={coord.x}
              y={height() - 10}
              text-anchor="middle"
              fill="var(--muted-foreground)"
              font-size="10"
            >
              {formatMonth(coord.label)}
            </text>
          </>
        )}
      </For>
    </svg>
  );
}
