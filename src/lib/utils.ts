import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const DISPLAY_TIME_ZONE = "Asia/Tokyo";
export const DISPLAY_LOCALE = "zh-CN";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(DISPLAY_LOCALE, {
    maximumFractionDigits: 3
  }).format(value);
}

type DateTimeFormatVariant = "display" | "compact";

function formatDateTimeWithTimeZone(
  value: string | Date,
  variant: DateTimeFormatVariant = "display"
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const formatter =
    variant === "compact"
      ? new Intl.DateTimeFormat(DISPLAY_LOCALE, {
          timeZone: DISPLAY_TIME_ZONE,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        })
      : new Intl.DateTimeFormat(DISPLAY_LOCALE, {
          timeZone: DISPLAY_TIME_ZONE,
          dateStyle: "medium",
          timeStyle: "short",
          hour12: false
        });

  return formatter.format(date);
}

export function formatDateTime(value: string | Date) {
  return formatDateTimeWithTimeZone(value, "display");
}

export function formatDateTimeCompact(value: string | Date) {
  return formatDateTimeWithTimeZone(value, "compact");
}

export function parseDecimal(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }

  return NaN;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function createCode(prefix: string, sequence: number) {
  return `${prefix}-${String(sequence).padStart(6, "0")}`;
}
