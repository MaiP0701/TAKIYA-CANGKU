import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-2xl border border-[color:var(--border)] bg-white/90 px-4 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-tea-400 focus:ring-2 focus:ring-tea-200",
        className
      )}
      {...props}
    />
  );
}

