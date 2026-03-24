import { For } from "solid-js";

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
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSelect: (iso: string) => void;
}

export function DatePickerCalendar(props: DatePickerCalendarProps) {
  const monthOptions = () => getMonthOptions(props.visibleMonth);
  const cells = () =>
    buildCalendarCells(props.visibleMonth, props.selectedDate, props.minDate);

  return (
    <>
      <div class={styles.header}>
        <select
          class={styles.select}
          value={String(props.visibleMonth.month)}
          onInput={(event) => props.onMonthChange(Number(event.currentTarget.value))}
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
          onInput={(event) => props.onYearChange(Number(event.currentTarget.value))}
        >
          <For each={YEAR_OPTIONS}>
            {(year) => (
              <option value={String(year)} selected={year === props.visibleMonth.year}>
                {year}
              </option>
            )}
          </For>
        </select>
        <button
          type="button"
          class={styles.navButton}
          aria-label="Mes anterior"
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
          {(cell) => <CalendarDayButton cell={cell} onSelect={props.onSelect} />}
        </For>
      </div>
    </>
  );
}

function CalendarDayButton(props: {
  cell: CalendarCell;
  onSelect: (iso: string) => void;
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
      aria-pressed={props.cell.isSelected}
      onClick={() => props.onSelect(props.cell.iso)}
    >
      {props.cell.label}
    </button>
  );
}
