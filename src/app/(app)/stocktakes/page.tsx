import { StocktakeComposer } from "@/components/forms/stocktake-composer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { requireUser } from "@/lib/auth/session";
import {
  getBootstrapData,
  getInventorySnapshotForLocation,
  getStocktakes
} from "@/lib/services/queries";
import { formatDateTime } from "@/lib/utils";

type SearchParams = Promise<{
  locationId?: string;
}>;

export default async function StocktakesPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const filters = await searchParams;
  const bootstrap = await getBootstrapData(user);
  const selectedLocationId =
    filters.locationId ?? user.defaultLocationId ?? bootstrap.locations[0]?.id ?? "";

  const [snapshot, stocktakes] = await Promise.all([
    selectedLocationId ? getInventorySnapshotForLocation(user, selectedLocationId) : Promise.resolve([]),
    getStocktakes(user, selectedLocationId || undefined)
  ]);

  const locationName =
    bootstrap.locations.find((location) => location.id === selectedLocationId)?.name ?? "未选择地点";

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/70 bg-white/60 p-6 shadow-panel">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-tea-700">
          Stocktakes
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900">盘点管理</h1>
        <p className="mt-2 text-sm text-stone-600">
          先读取当前库存快照，再填写实盘数量并一键生成盘点修正。
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>选择盘点地点</CardTitle>
          <CardDescription>当前支持按地点进行一次完整盘点</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4 sm:flex-row">
            <Select className="max-w-xs" defaultValue={selectedLocationId} name="locationId">
              {bootstrap.locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
            <Button type="submit">切换地点</Button>
          </form>
        </CardContent>
      </Card>

      {selectedLocationId ? (
        <StocktakeComposer
          locationId={selectedLocationId}
          locationName={locationName}
          items={snapshot}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>盘点历史</CardTitle>
          <CardDescription>保留所有盘点单和完成状态</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200/70 text-stone-500">
                <th className="pb-3 pr-4 font-medium">盘点单号</th>
                <th className="pb-3 pr-4 font-medium">地点</th>
                <th className="pb-3 pr-4 font-medium">状态</th>
                <th className="pb-3 pr-4 font-medium">明细数</th>
                <th className="pb-3 pr-4 font-medium">创建人</th>
                <th className="pb-3 pr-4 font-medium">创建时间</th>
                <th className="pb-3 font-medium">完成时间</th>
              </tr>
            </thead>
            <tbody>
              {stocktakes.map((stocktake) => (
                <tr key={stocktake.id} className="border-b border-stone-100 text-stone-700">
                  <td className="py-4 pr-4 font-medium">{stocktake.stocktakeNo}</td>
                  <td className="py-4 pr-4">{stocktake.locationName}</td>
                  <td className="py-4 pr-4">
                    <Badge variant={stocktake.status === "COMPLETED" ? "success" : "muted"}>
                      {stocktake.status}
                    </Badge>
                  </td>
                  <td className="py-4 pr-4">{stocktake.lineCount}</td>
                  <td className="py-4 pr-4">{stocktake.createdByName}</td>
                  <td className="py-4 pr-4">{formatDateTime(stocktake.createdAt)}</td>
                  <td className="py-4">{stocktake.completedAt ? formatDateTime(stocktake.completedAt) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

