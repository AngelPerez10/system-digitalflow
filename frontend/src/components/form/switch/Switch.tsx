import { useId, useState } from "react";

interface SwitchProps {
  label: string;
  /** Controlled checked state. If omitted, the switch is uncontrolled. */
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  color?: "blue" | "gray";
  id?: string;
  name?: string;
  hint?: string;
}

export default function Switch({
  label,
  checked,
  defaultChecked = false,
  disabled = false,
  onChange,
  color = "blue",
  id,
  name,
  hint,
}: SwitchProps) {
  const generatedId = useId();
  const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : uncontrolledChecked;

  const handleToggle = () => {
    if (disabled) return;
    const newCheckedState = !isChecked;
    if (!isControlled) setUncontrolledChecked(newCheckedState);
    onChange?.(newCheckedState);
  };

  const switchColors =
    color === "blue"
      ? {
          background: isChecked
            ? "bg-[#ff801f]"
            : "bg-gray-200 dark:bg-white/10",
          knob: isChecked
            ? "translate-x-full bg-white"
            : "translate-x-0 bg-white",
        }
      : {
          background: isChecked
            ? "bg-gray-800 dark:bg-white/10"
            : "bg-gray-200 dark:bg-white/10",
          knob: isChecked
            ? "translate-x-full bg-white"
            : "translate-x-0 bg-white",
        };

  const inputId = id || `switch-${name || generatedId}`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center">
        <input
          type="checkbox"
          id={inputId}
          name={name}
          checked={isChecked}
          onChange={handleToggle}
          disabled={disabled}
          className="sr-only"
          role="switch"
          aria-checked={isChecked}
          aria-describedby={hint ? `${inputId}-hint` : undefined}
        />
        <label
          htmlFor={inputId}
          className={`flex cursor-pointer select-none items-center gap-3 text-sm font-medium ${
            disabled ? "cursor-not-allowed text-gray-400" : "text-gray-700 dark:text-gray-400"
          }`}
        >
          <div className="relative" aria-hidden="true">
            <div
              className={`block h-6 w-11 rounded-full transition duration-150 ease-linear ${
                disabled
                  ? "pointer-events-none bg-gray-100 dark:bg-gray-800"
                  : switchColors.background
              }`}
            />
            <div
              className={`absolute left-0.5 top-0.5 h-5 w-5 transform rounded-full shadow-theme-sm duration-150 ease-linear ${switchColors.knob}`}
            />
          </div>
          {label}
        </label>
      </div>
      {hint ? (
        <p id={`${inputId}-hint`} className="pl-14 text-[11px] leading-relaxed text-[#78716c] dark:text-[#8ea0b8]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
