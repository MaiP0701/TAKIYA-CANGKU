import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { requireUser } from "@/lib/auth/session";
import { getAlertList, getBootstrapData } from "@/lib/services/queries";
import { formatNumber } from "@/lib/utils";

type SearchParams = Promise<{
  locationId?: string;
}>;

export default async function AlertsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const filters = await searchParams;
  const [bootstrap, alerts] = await Promise.all([
    getBootstrapData(user),
    getAlertList(user, filters.locationId)
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/70 bg-white/60 p-6 shadow-panel">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-tea-700">
          Alerts
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900">低库存预警</h1>
        <p className="mt-2 text-sm text-stone-600">
          高亮显示缺货风险，方便快速补货或调拨。
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>筛选地点</CardTitle>
          <CardDescription>默认展示当前权限范围内全部预警</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4 sm:flex-row">
            <Select className="max-w-xs" defaultValue={filters.locationId ?? ""} name="locationId">
              <option value="">全部地点</option>
              {bootstrap.locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
            <Button type="submit">应用筛选</Button>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        {alerts.length === 0 ? (
          <Card className="lg:col-span-2">
            <CardContent className="p-6 text-sm text-stone-600">
              当前筛选范围内没有低库存预警。
            </CardContent>
          </Card>
        ) : (
          alerts.map((row) => (
            <Card key={row.id} className="border-rose-100 bg-rose-50/70">
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-stone-900">{row.itemName}</div>
                    <div className="text-sm text-stone-500">
                      {row.locationName} · {row.categoryName}
                    </div>
                  </div>
                  <Badge variant="warning">低库存</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/70 px-4 py-3">
                    <div className="text-xs text-stone-500">当前库存</div>
                    <div className="mt-1 text-xl font-semibold text-stone-900">
                      {formatNumber(row.quantity)} {row.unitName}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/70 px-4 py-3">
                    <div className="text-xs text-stone-500">安全库存</div>
                    <div className="mt-1 text-xl font-semibold text-stone-900">
                      {formatNumber(row.safetyStock)} {row.unitName}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/70 px-4 py-3">
                    <div className="text-xs text-stone-500">缺口</div>
                    <div className="mt-1 text-xl font-semibold text-rose-700">
                      {formatNumber(row.safetyStock - row.quantity)} {row.unitName}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
