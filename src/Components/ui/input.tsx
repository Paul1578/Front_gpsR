"use client";

import * as React from "react";
import { cn } from "./utils"; // ajusta según tu estructura

function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // estilos base
        "flex h-9 w-full min-w-0 rounded-md border border-input bg-input-background px-3 py-1 " +
          "text-base md:text-sm outline-none transition-[color,box-shadow] " +
          "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground " +
          "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium " +
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 " +
          "dark:bg-input/30",

        // focus y error states
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 " +
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",

        className
      )}
      {...props}
    />
  );
}

export { Input };
