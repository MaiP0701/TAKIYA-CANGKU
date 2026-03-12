import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireUser } from "@/lib/auth/session";
import { getBootstrapData, getStoreReport } from "@/lib/services/queries";
import { formatDateTime, formatNumber } from "@/lib/utils";

type SearchParams = Promise<{
  locationId?: string;
  categoryId?: string;
  lowStock?: string;
  sort?: string;
}>;

function createExportLink(filters: Record<string, string | undefined>) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  return `/api/reports/inventory.csv?${params.toString()}`;
}

export default async function ReportsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const filters = await searchParams;
  const [bootstrap, report] = await Promise.all([
    getBootstrapData(user),
    getStoreReport(user, filters)
  ]);

  const exportLink = createExportLink({
    locationId: filters.locationId,
    categoryId: filters.categoryId,
    lowStock: filters.lowStock,
    sort: filters.sort
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/70 bg-white/60 p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-tea-700">
              Reports
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-stone-900">门店库存报表</h1>
            <p className="mt-2 text-sm text-stone-600">
              以运营视角查看地点库存、分类分布、低库存风险和最近变化，并支持导出 CSV。
            </p>
          </div>
          <Button asChild variant="secondary">
  <a href={exportLink}>导出 CSV</a>
</Button>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
          <CardDescription>按地点、分类、低库存和排序方式查看库存报表</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Select defaultValue={filters.locationId ?? ""} name="locationId">
              <option value="">全部地点</option>
              {bootstrap.locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
            <Select defaultValue={filters.categoryId ?? ""} name="categoryId">
              <option value="">全部分类</option>
              {bootstrap.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Select defaultValue={filters.lowStock ?? ""} name="lowStock">
              <option value="">全部状态</option>
              <option value="true">仅低库存</option>
            </Select>
            <Select defaultValue={filters.sort ?? ""} name="sort">
              <option value="">按物料名称</option>
              <option value="quantity_asc">库存从低到高</option>
              <option value="quantity_desc">库存从高到低</option>
              <option value="low_stock_first">低库存优先</option>
            </Select>
            <Button type="submit">应用筛选</Button>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-stone-500">库存记录数</div>
            <div className="mt-3 text-3xl font-semibold text-stone-900">
              {report.stats.inventoryRowCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-stone-500">低库存数量</div>
            <div className="mt-3 text-3xl font-semibold text-stone-900">
              {report.stats.lowStockCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-stone-500">地点数</div>
            <div className="mt-3 text-3xl font-semibold text-stone-900">
              {report.stats.locationCount}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>按地点概览</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.locationSummary.map((row) => (
              <div key={row.locationId} className="rounded-[24px] border border-white/70 bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-stone-900">{row.locationName}</div>
                    <div className="text-sm text-stone-500">库存记录 {row.itemCount}</div>
                  </div>
                  <Badge variant={row.lowStockCount > 0 ? "warning" : "success"}>
                    低库存 {row.lowStockCount}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>按分类概览</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.categorySummary.map((row) => (
              <div key={row.categoryName} className="rounded-[24px] border border-white/70 bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-stone-900">{row.categoryName}</div>
                    <div className="text-sm text-stone-500">物料数 {row.itemCount}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-stone-500">低库存 {row.lowStockCount}</div>
                    <div className="font-semibold text-stone-900">
                      总库存 {formatNumber(row.totalQuantity)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>库存明细</CardTitle>
            <CardDescription>按当前筛选条件展示可导出的库存快照</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200/70 text-stone-500">
                  <th className="pb-3 pr-4 font-medium">地点</th>
                  <th className="pb-3 pr-4 font-medium">物料</th>
                  <th className="pb-3 pr-4 font-medium">分类</th>
                  <th className="pb-3 pr-4 font-medium">库存</th>
                  <th className="pb-3 pr-4 font-medium">阈值</th>
                  <th className="pb-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {report.inventoryRows.length === 0 ? (
                  <tr>
                    <td className="py-8 text-center text-stone-500" colSpan={6}>
                      当前筛选条件下没有库存记录。
                    </td>
                  </tr>
                ) : (
                  report.inventoryRows.map((row) => (
                    <tr key={row.id} className="border-b border-stone-100 text-stone-700">
                      <td className="py-4 pr-4">{row.locationName}</td>
                      <td className="py-4 pr-4 font-medium">{row.itemName}</td>
                      <td className="py-4 pr-4">{row.categoryName}</td>
                      <td className="py-4 pr-4">
                        {formatNumber(row.quantity)} {row.unitSymbol ?? row.unitName}
                      </td>
                      <td className="py-4 pr-4">
                        {formatNumber(row.safetyStock)} {row.unitSymbol ?? row.unitName}
                      </td>
                      <td className="py-4">
                        <Badge variant={row.isLowStock ? "warning" : "success"}>
                          {row.isLowStock ? "低库存" : "正常"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>补货优先项</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.replenishmentList.length === 0 ? (
                <div className="rounded-[24px] bg-jade-50 px-4 py-5 text-sm text-jade-800">
                  当前没有低库存项。
                </div>
              ) : (
                report.replenishmentList.map((row) => (
                  <div key={row.id} className="rounded-[24px] border border-rose-100 bg-rose-50/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-stone-900">{row.itemName}</div>
                        <div className="text-sm text-stone-500">
                          {row.locationName} · {row.categoryName}
                        </div>
                      </div>
                      <Badge variant="warning">待补货</Badge>
                    </div>
                    <div className="mt-3 text-sm text-stone-700">
                      当前 {formatNumber(row.quantity)} / 阈值 {formatNumber(row.safetyStock)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>最近库存变化</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.recentLogs.map((log) => (
                <div key={log.id} className="rounded-[24px] border border-white/70 bg-white/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-stone-900">{log.itemName}</div>
                      <div className="text-sm text-stone-500">
                        {log.locationName} · {log.operatorName}
                      </div>
                    </div>
                    <Badge variant={log.quantityChange < 0 ? "warning" : "success"}>
                      {log.quantityChange > 0 ? "+" : ""}
                      {formatNumber(log.quantityChange)}
                    </Badge>
                  </div>
                  <div className="mt-3 text-sm text-stone-600">
                    {log.operationLabel} · {formatDateTime(log.createdAt)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
