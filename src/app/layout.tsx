import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";

export const metadata: Metadata = {
  title: "TAKIYA库存管理系统",
  description: "门店与仓库协同的库存管理系统",
  manifest: "/manifest.webmanifest",
  applicationName: "TAKIYA库存管理",
  appleWebApp: {
    capable: true,
    title: "TAKIYA库存管理",
    statusBarStyle: "default"
  },
  icons: {
    icon: "/icon-192.svg",
    apple: "/apple-touch-icon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <RegisterServiceWorker />
        {children}
<Analytics />
<SpeedInsights />
      </body>
    </html>
  );
}

