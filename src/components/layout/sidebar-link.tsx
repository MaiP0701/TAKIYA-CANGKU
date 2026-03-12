"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type SidebarLinkProps = {
  href: string;
  label: string;
};

export function SidebarLink({ href, label }: SidebarLinkProps) {
  const pathname = usePathname();
  const active =
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-medium transition",
        active
          ? "bg-tea-500 text-white shadow-lg shadow-tea-100"
          : "text-stone-700 hover:bg-white/70"
      )}
    >
      {label}
    </Link>
  );
}
