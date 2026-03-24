import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
} from "solid-js";

import CalendarDays from "~/components/icons/calendar-days";
import { useHotkey } from "~/lib/hotkey/use-hotkey";
import { cn } from "~/lib/utils";

import {
  formatIsoDate,
  getVisibleMonth,
  parseIsoDate,
  todayLocalDate,
  type VisibleMonth,
} from "./date-picker-model";
import { DatePickerPopover } from "./date-picker-popover";

import styles from "./date-picker.module.css";

export interface DatePickerProps {
  label?: string;
  description?: string;
  error?: string;
  value: string;
  min?: string;
  required?: boolean;
  id?: string;
  name?: string;
  disabled?: boolean;
  placeholder?: string;
  onInput: (value: string) => void;
}

export function DatePicker(props: DatePickerProps) {
  const inputId = props.id || createUniqueId();
  const messageId = `${inputId}-message`;
  const [isOpen, setIsOpen] = createSignal(false);
  const selectedDate = createMemo(() => parseIsoDate(props.value));
  const minDate = createMemo(() => parseIsoDate(props.min ?? ""));
  const initialViewDate = createMemo(
    () => selectedDate() ?? minDate() ?? todayLocalDate(),
  );
  const [viewMonth, setViewMonth] = createSignal<VisibleMonth>(
    getVisibleMonth(initialViewDate()),
  );
  let fieldRef: HTMLDivElement | undefined;
  let controlRef: HTMLDivElement | undefined;
  let popoverRef: HTMLDivElement | undefined;

  const closePicker = () => {
    setIsOpen(false);
  };

  createEffect(() => {
    if (typeof document === "undefined") return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!isOpen()) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (fieldRef?.contains(target)) return;
      if (popoverRef?.contains(target)) return;
      closePicker();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    onCleanup(() => {
      document.removeEventListener("pointerdown", handlePointerDown);
    });
  });

  useHotkey("Escape", closePicker, {
    enabled: isOpen,
    allowInInputs: true,
  });

  const describedBy = () => {
    if (!props.description && !props.error) return undefined;
    return messageId;
  };

  const syncViewMonth = () => {
    setViewMonth(getVisibleMonth(initialViewDate()));
  };

  const openPicker = () => {
    syncViewMonth();
    setIsOpen(true);
  };

  createEffect(() => {
    if (isOpen()) return;
    syncViewMonth();
  });

  return (
    <div
      class={styles.field}
      ref={(element) => {
        fieldRef = element;
      }}
    >
      {props.label && (
        <label for={inputId} class={styles.label}>
          {props.label}
          {props.required && (
            <span aria-hidden="true" class={styles.required}>
              *
            </span>
          )}
        </label>
      )}
      <div
        class={cn(
          styles.controlShell,
          props.error ? styles.errorShell : undefined,
          isOpen() ? styles.openShell : undefined,
        )}
        ref={(element) => {
          controlRef = element;
        }}
      >
        <input
          id={inputId}
          name={props.name}
          class={styles.control}
          type="text"
          inputMode="numeric"
          autocomplete="off"
          spellcheck={false}
          placeholder={props.placeholder ?? "AAAA-MM-DD"}
          value={props.value}
          aria-describedby={describedBy()}
          aria-invalid={props.error ? "true" : undefined}
          disabled={props.disabled}
          onFocus={openPicker}
          onInput={(event) => {
            props.onInput(event.currentTarget.value);
            if (!isOpen()) {
              openPicker();
            }
          }}
        />
        <button
          type="button"
          class={styles.iconButton}
          aria-label="Abrir calendario"
          aria-haspopup="dialog"
          aria-expanded={isOpen()}
          disabled={props.disabled}
          onClick={() => {
            if (isOpen()) {
              closePicker();
              return;
            }
            openPicker();
          }}
        >
          <CalendarDays size={16} />
        </button>
      </div>
      {(props.error || props.description) && (
        <p
          id={messageId}
          class={props.error ? styles.errorText : styles.descriptionText}
        >
          {props.error ?? props.description}
        </p>
      )}
      <DatePickerPopover
        isOpen={isOpen}
        anchor={() => controlRef ?? fieldRef}
        selectedDate={selectedDate()}
        minDate={minDate()}
        visibleMonth={viewMonth()}
        onMonthChange={(month) =>
          setViewMonth((current) => ({
            year: current.year,
            month,
          }))
        }
        onYearChange={(year) =>
          setViewMonth((current) => ({
            year,
            month: current.month,
          }))
        }
        onPreviousMonth={() =>
          setViewMonth((current) =>
            getVisibleMonth(new Date(current.year, current.month - 1, 1)),
          )
        }
        onNextMonth={() =>
          setViewMonth((current) =>
            getVisibleMonth(new Date(current.year, current.month + 1, 1)),
          )
        }
        onSelect={(date) => {
          props.onInput(formatIsoDate(date));
          closePicker();
        }}
        onPopoverMount={(element) => {
          popoverRef = element;
        }}
      />
    </div>
  );
}
