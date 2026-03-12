import { navigationItems } from "@/lib/constants/navigation";
import type { SessionUser } from "@/types/domain";
import { SidebarLink } from "@/components/layout/sidebar-link";
import { LogoutButton } from "@/components/layout/logout-button";
import { isAdmin } from "@/lib/auth/access";

type AppShellProps = {
  user: SessionUser;
  children: React.ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  const visibleNavigation = navigationItems.filter(
    (item) => !item.adminOnly || isAdmin(user)
  );

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="panel sticky top-4 hidden h-[calc(100vh-2rem)] w-72 shrink-0 overflow-hidden rounded-[32px] border border-white/70 p-5 shadow-panel lg:flex lg:flex-col">
          <div className="mb-8 shrink-0">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-tea-700">
              TAKIYA Stock Management
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-stone-900">
              TAKIYA库存管理
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              多门店与仓库协同运营
            </p>
          </div>

          <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {visibleNavigation.map((item) => (
              <SidebarLink key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>

          <div className="mt-6 shrink-0 rounded-[24px] bg-gradient-to-br from-tea-500 via-tea-600 to-stone-900 p-5 text-white">
            <p className="text-sm text-white/70">当前登录</p>
            <p className="mt-2 text-lg font-semibold">{user.displayName}</p>
            <p className="text-sm text-white/80">
              {user.roleName}
              {user.defaultLocationName ? ` · ${user.defaultLocationName}` : ""}
            </p>
            <div className="mt-4">
              <LogoutButton />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="panel mb-6 flex flex-col gap-4 rounded-[28px] border border-white/70 px-5 py-4 shadow-panel sm:flex-row sm:items-center sm:justify-between lg:hidden">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-tea-700">
                库存管理
              </div>
              <div className="mt-1 text-lg font-semibold text-stone-900">
                {user.displayName}
              </div>
              <div className="text-sm text-stone-500">
                {user.roleName}
                {user.defaultLocationName ? ` · ${user.defaultLocationName}` : ""}
              </div>
            </div>
            <LogoutButton />
          </header>

          {children}
        </main>
      </div>

      <nav className="panel fixed inset-x-4 bottom-4 z-20 flex items-center gap-2 overflow-x-auto rounded-[24px] border border-white/70 px-3 py-2 shadow-panel lg:hidden">
        {visibleNavigation.map((item) => (
          <SidebarLink key={item.href} href={item.href} label={item.label} />
        ))}
      </nav>
    </div>
  );
}
