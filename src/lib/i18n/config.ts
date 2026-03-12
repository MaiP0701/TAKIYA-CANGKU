export const defaultLocale = "zh-CN";

export const supportedLocales = ["zh-CN", "ja-JP"] as const;

export type AppLocale = (typeof supportedLocales)[number];

export const localeLabels: Record<AppLocale, string> = {
  "zh-CN": "中文",
  "ja-JP": "日本語"
};

