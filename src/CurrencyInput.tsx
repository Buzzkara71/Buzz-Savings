import { useId, useLayoutEffect, useRef, useState } from "react";
import { formatAmount, parseAmount, money } from "./domain";

type Props = {
  name: string;
  label: string;
  defaultValue?: number;
  min?: number;
  max?: number;
  autoFocus?: boolean;
  placeholder?: string;
};

export default function CurrencyInput({
  name,
  label,
  defaultValue,
  min = 0,
  max = 1e12,
  autoFocus,
  placeholder = "0",
}: Props) {
  const [value, setValue] = useState(
    defaultValue === undefined ? "" : formatAmount(defaultValue),
  );
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);
  const hintId = useId();
  const inputId = useId();
  const amount = parseAmount(value);
  const error = !value
    ? "Enter an amount."
    : amount === null
      ? "Use whole rupiah, for example 1.250.000 (up to 1.000.000.000.000)."
      : amount < min || amount > max
        ? `Enter an amount between ${money(min)} and ${money(max)}.`
        : "";

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.setCustomValidity(error);
    if (caretRef.current !== null) {
      input.setSelectionRange(caretRef.current, caretRef.current);
      caretRef.current = null;
    }
  });

  function edit(raw: string, caret: number, normalize = true) {
    let next = raw;
    let position = caret;
    if (normalize && /^[\d.]*$/.test(raw)) {
      const digits = raw.replaceAll(".", "");
      // Group as a string so a large invalid entry never loses precision.
      next = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      const before = raw.slice(0, caret).replaceAll(".", "").length;
      position = 0;
      let seen = 0;
      while (position < next.length && seen < before) {
        if (next[position] !== ".") seen++;
        position++;
      }
    }
    caretRef.current = position;
    setValue(next);
    setTouched(true);
    // React can skip rendering if typing a separator leaves the value unchanged.
    if (next === value && inputRef.current) {
      inputRef.current.value = next;
      inputRef.current.setSelectionRange(position, position);
    }
  }

  return (
    <span className="currency-field">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        ref={inputRef}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        value={value}
        placeholder={placeholder}
        required
        autoFocus={autoFocus}
        aria-describedby={hintId}
        aria-invalid={touched && !!error}
        onBlur={() => {
          setTouched(true);
          if (amount !== null) setValue(formatAmount(amount));
        }}
        onInvalid={() => setTouched(true)}
        onChange={(e) =>
          edit(e.target.value, e.target.selectionStart ?? e.target.value.length)
        }
        onPaste={(e) => {
          e.preventDefault();
          const input = e.currentTarget;
          const pasted = e.clipboardData.getData("text").trim();
          const start = input.selectionStart ?? 0;
          const end = input.selectionEnd ?? start;
          const valid = parseAmount(pasted) !== null;
          const inserted = valid ? pasted.replaceAll(".", "") : pasted;
          edit(
            value.slice(0, start) + inserted + value.slice(end),
            start + inserted.length,
            valid,
          );
        }}
        onKeyDown={(e) => {
          const input = e.currentTarget;
          const caret = input.selectionStart ?? 0;
          if (caret !== input.selectionEnd) return;
          if (e.key === "Backspace" && value[caret - 1] === ".")
            input.setSelectionRange(caret - 1, caret - 1);
          if (e.key === "Delete" && value[caret] === ".")
            input.setSelectionRange(caret + 1, caret + 1);
        }}
      />
      <span
        id={hintId}
        className={
          touched && error ? "currency-hint field-error" : "currency-hint"
        }
      >
        {touched && error ? error : "Whole rupiah · dots separate thousands"}
      </span>
    </span>
  );
}
