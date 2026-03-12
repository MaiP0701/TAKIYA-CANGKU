import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "warning" | "success" | "muted";
};

const badgeClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-tea-100 text-tea-800",
  warning: "bg-rose-100 text-rose-700",
  success: "bg-jade-100 text-jade-800",
  muted: "bg-stone-200 text-stone-700"
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        badgeClasses[variant],
        className
      )}
      {...props}
    />
  );
}

