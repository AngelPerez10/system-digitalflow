import { useState } from "react";

interface SwitchProps {
  label: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  color?: "blue" | "gray";
  id?: string;
  name?: string;
}

const Switch: React.FC<SwitchProps> = ({
  label,
  defaultChecked = false,
  disabled = false,
  onChange,
  color = "blue",
  id,
  name,
}) => {
  const [isChecked, setIsChecked] = useState(defaultChecked);

  const handleToggle = () => {
    if (disabled) return;
    const newCheckedState = !isChecked;
    setIsChecked(newCheckedState);
    onChange?.(newCheckedState);
  };

  const switchColors =
    color === "blue"
      ? {
          background: isChecked
            ? "bg-brand-500"
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

  const inputId = id || `switch-${name || Math.random().toString(36).slice(2, 8)}`;

  return (
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
      />
      <label
        htmlFor={inputId}
        className={`flex cursor-pointer select-none items-center gap-3 text-sm font-medium ${
          disabled ? "text-gray-400" : "text-gray-700 dark:text-gray-400"
        }`}
      >
        <div className="relative">
          <div
            className={`block transition duration-150 ease-linear h-6 w-11 rounded-full ${
              disabled
                ? "bg-gray-100 pointer-events-none dark:bg-gray-800"
                : switchColors.background
            }`}
          ></div>
          <div
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full shadow-theme-sm duration-150 ease-linear transform ${switchColors.knob}`}
          ></div>
        </div>
        {label}
      </label>
    </div>
  );
};

export default Switch;
