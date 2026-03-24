import { For, createEffect } from "solid-js";

import ChevronLeft from "~/components/icons/chevron-left";
import ChevronRight from "~/components/icons/chevron-right";
import { cn } from "~/lib/utils";

import {
  DAY_NAMES,
  buildCalendarCells,
  getMonthOptions,
  type CalendarCell,
  type VisibleMonth,
} from "./date-picker-model";

import styles from "./date-picker.module.css";

const YEAR_OPTIONS = Array.from(
  { length: 200 },
  (_, index) => new Date().getFullYear() + 50 - index,
);

interface DatePickerCalendarProps {
  visibleMonth: VisibleMonth;
  selectedDate: Date | null;
  minDate: Date | null;
  isPreviousMonthDisabled: boolean;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  focusedIso: string;
  onFocusDate: (iso: string) => void;
  onFocusMoveByDays: (dayDelta: number) => void;
  onFocusMonthBoundary: (kind: "start" | "end") => void;
  onSelect: (iso: string) => void;
}

export function DatePickerCalendar(props: DatePickerCalendarProps) {
  const monthOptions = () => getMonthOptions(props.visibleMonth);
  const cells = () =>
    buildCalendarCells(props.visibleMonth, props.selectedDate, props.minDate);
  const dayRefs = new Map<string, HTMLButtonElement>();

  createEffect(() => {
    const activeButton = dayRefs.get(props.focusedIso);
    activeButton?.focus();
  });

  return (
    <>
      <div class={styles.header}>
        <select
          class={styles.select}
          value={String(props.visibleMonth.month)}
          onInput={(event) =>
            props.onMonthChange(Number(event.currentTarget.value))
          }
        >
          <For each={monthOptions()}>
            {(option) => (
              <option
                value={String(option.value)}
                selected={option.value === props.visibleMonth.month}
              >
                {option.label}
              </option>
            )}
          </For>
        </select>
        <select
          class={styles.select}
          value={String(props.visibleMonth.year)}
          onInput={(event) =>
            props.onYearChange(Number(event.currentTarget.value))
          }
        >
          <For each={YEAR_OPTIONS}>
            {(year) => (
              <option
                value={String(year)}
                selected={year === props.visibleMonth.year}
              >
                {year}
              </option>
            )}
          </For>
        </select>
        <button
          type="button"
          class={styles.navButton}
          aria-label="Mes anterior"
          disabled={props.isPreviousMonthDisabled}
          onClick={props.onPreviousMonth}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          class={styles.navButton}
          aria-label="Mes siguiente"
          onClick={props.onNextMonth}
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div class={styles.dayNames}>
        <For each={DAY_NAMES}>
          {(dayName) => <span class={styles.dayName}>{dayName}</span>}
        </For>
      </div>
      <div class={styles.daysGrid}>
        <For each={cells()}>
          {(cell) => (
            <CalendarDayButton
              cell={cell}
              isFocused={cell.iso === props.focusedIso}
              onFocusDate={props.onFocusDate}
              onFocusMoveByDays={props.onFocusMoveByDays}
              onFocusMonthBoundary={props.onFocusMonthBoundary}
              onSelect={props.onSelect}
              ref={(element) => {
                if (element) {
                  dayRefs.set(cell.iso, element);
                } else {
                  dayRefs.delete(cell.iso);
                }
              }}
            />
          )}
        </For>
      </div>
    </>
  );
}

function CalendarDayButton(props: {
  cell: CalendarCell;
  isFocused: boolean;
  onFocusDate: (iso: string) => void;
  onFocusMoveByDays: (dayDelta: number) => void;
  onFocusMonthBoundary: (kind: "start" | "end") => void;
  onSelect: (iso: string) => void;
  ref: (element: HTMLButtonElement | undefined) => void;
}) {
  return (
    <button
      type="button"
      class={cn(
        styles.dayButton,
        !props.cell.isCurrentMonth ? styles.dayOutsideMonth : undefined,
        props.cell.isSelected ? styles.daySelected : undefined,
      )}
      disabled={props.cell.isDisabled}
      tabIndex={props.isFocused ? 0 : -1}
      aria-pressed={props.cell.isSelected}
      ref={props.ref}
      onFocus={() => props.onFocusDate(props.cell.iso)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          props.onFocusMoveByDays(-1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          props.onFocusMoveByDays(1);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          props.onFocusMoveByDays(-7);
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          props.onFocusMoveByDays(7);
        } else if (event.key === "Home") {
          event.preventDefault();
          props.onFocusMonthBoundary("start");
        } else if (event.key === "End") {
          event.preventDefault();
          props.onFocusMonthBoundary("end");
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (!props.cell.isDisabled) {
            props.onSelect(props.cell.iso);
          }
        }
      }}
      onClick={() => props.onSelect(props.cell.iso)}
    >
      {props.cell.label}
    </button>
  );
}
