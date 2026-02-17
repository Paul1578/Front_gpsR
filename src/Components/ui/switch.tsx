"use client";

import * as React from "react";
import { cn } from "./utils";

type SwitchProps = {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

function Switch({ checked = false, onCheckedChange, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onCheckedChange?.(!checked);
      }}
      className={cn(
        "peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "bg-primary"
          : "bg-switch-background dark:bg-input/80",
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none block size-4 rounded-full ring-0 transition-transform",
          checked
            ? "translate-x-[calc(100%-2px)] bg-primary-foreground"
            : "translate-x-0 bg-card dark:bg-card-foreground"
        )}
      />
    </button>
  );
}

export { Switch };
