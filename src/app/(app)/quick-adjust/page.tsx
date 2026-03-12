import { QuickAdjustPanel } from "@/components/forms/quick-adjust-panel";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getAccessibleLocations, getQuickAdjustCatalog } from "@/lib/services/queries";

export default async function QuickAdjustPage() {
  const user = await requireUser();
  const locations = await getAccessibleLocations(user, { activeOnly: true });
  const catalog = await getQuickAdjustCatalog(
    user,
    locations.map((location) => location.id)
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/70 bg-gradient-to-br from-white/70 via-tea-50/70 to-white/60 p-6 shadow-panel sm:p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-tea-700">
          Quick Adjust
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900 sm:text-4xl">快速出入库</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600 sm:text-base">
          面向门店与仓库日常高频操作。先选地点、分类和物料，几秒内完成一次入库、出库、报损或其他调整。
        </p>
      </section>

      {locations.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-stone-600">
            当前账号没有可操作的启用地点。请先到地点管理中启用地点，或检查当前用户默认地点配置。
          </CardContent>
        </Card>
      ) : (
        <QuickAdjustPanel
          locations={locations.map((location) => ({
            id: location.id,
            name: location.name,
            typeLabel:
              location.type === "STORE" ? "门店" : location.type === "WAREHOUSE" ? "仓库" : "其他"
          }))}
          categories={catalog.categories}
          items={catalog.items}
          defaultLocationId={user.defaultLocationId}
        />
      )}
    </div>
  );
}
