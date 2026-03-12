import Link from "next/link";
import { MovementForm } from "@/components/forms/movement-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireUser } from "@/lib/auth/session";
import {
  getBootstrapData,
  getItemOptions,
  getPaginatedInventoryList
} from "@/lib/services/queries";
import { formatDateTime, formatNumber } from "@/lib/utils";

type SearchParams = Promise<{
  query?: string;
  categoryId?: string;
  locationId?: string;
  lowStock?: string;
  page?: string;
}>;

function buildPageLink(
  filters: {
    query?: string;
    categoryId?: string;
    locationId?: string;
    lowStock?: string;
  },
  page: number
) {
  const params = new URLSearchParams();

  if (filters.query) params.set("query", filters.query);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.locationId) params.set("locationId", filters.locationId);
  if (filters.lowStock) params.set("lowStock", filters.lowStock);
  params.set("page", String(page));

  return `/inventory?${params.toString()}`;
}

export default async function InventoryPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const filters = await searchParams;
  const currentPage = Math.max(1, Number(filters.page ?? "1") || 1);
  const [bootstrap, inventory, items] = await Promise.all([
    getBootstrapData(user, {
      includeUnits: false,
      includeRoles: false
    }),
    getPaginatedInventoryList(user, filters, {
      page: currentPage,
      pageSize: 50
    }),
    getItemOptions({
      active: true,
      limit: 200
    })
  ]);

  const itemOptions = items.map((item) => ({
    id: item.id,
    name: item.name
  }));
  const locationOptions = bootstrap.locations.map((location) => ({
    id: location.id,
    name: location.name
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/70 bg-white/60 p-6 shadow-panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-tea-700">
              Inventory
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-stone-900">库存列表</h1>
            <p className="mt-2 text-sm text-stone-600">
              按地点查看当前库存，并直接进行入库、出库、报损操作。
            </p>
          </div>
          <Link className="text-sm font-medium text-tea-700 hover:underline" href="/quick-adjust">
            前往快速出入库
          </Link>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
          <CardDescription>支持按物料、分类、地点和低库存状态查询</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Input defaultValue={filters.query} name="query" placeholder="物料名称关键词" />
            <Select defaultValue={filters.categoryId ?? ""} name="categoryId">
              <option value="">全部分类</option>
              {bootstrap.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Select defaultValue={filters.locationId ?? ""} name="locationId">
              <option value="">全部地点</option>
              {bootstrap.locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
            <Select defaultValue={filters.lowStock ?? ""} name="lowStock">
              <option value="">全部状态</option>
              <option value="true">仅低库存</option>
            </Select>
            <Button type="submit">应用筛选</Button>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-3">
        <MovementForm
          title="入库"
          description="支持仓库或门店入库"
          endpoint="/api/transactions/inbound"
          mode="inbound"
          items={itemOptions}
          locations={locationOptions}
          defaultLocationId={user.defaultLocationId}
        />
        <MovementForm
          title="出库"
          description="门店消耗或人工出库"
          endpoint="/api/transactions/outbound"
          mode="outbound"
          items={itemOptions}
          locations={locationOptions}
          defaultLocationId={user.defaultLocationId}
        />
        <MovementForm
          title="报损"
          description="记录破损、过期或异常损耗"
          endpoint="/api/transactions/damage"
          mode="damage"
          items={itemOptions}
          locations={locationOptions}
          defaultLocationId={user.defaultLocationId}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>当前库存</CardTitle>
          <CardDescription>
            共 {inventory.total} 条库存记录，当前第 {inventory.page} / {inventory.totalPages} 页
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200/70 text-stone-500">
                <th className="pb-3 pr-4 font-medium">物料</th>
                <th className="pb-3 pr-4 font-medium">分类</th>
                <th className="pb-3 pr-4 font-medium">地点</th>
                <th className="pb-3 pr-4 font-medium">当前库存</th>
                <th className="pb-3 pr-4 font-medium">安全库存</th>
                <th className="pb-3 pr-4 font-medium">状态</th>
                <th className="pb-3 pr-4 font-medium">最近操作人</th>
                <th className="pb-3 font-medium">最近更新时间</th>
              </tr>
            </thead>
            <tbody>
              {inventory.rows.length === 0 ? (
                <tr>
                  <td className="py-8 text-center text-stone-500" colSpan={8}>
                    当前筛选条件下没有库存记录。
                  </td>
                </tr>
              ) : (
                inventory.rows.map((row) => (
                  <tr key={row.id} className="border-b border-stone-100 text-stone-700">
                    <td className="py-4 pr-4">
                      <div className="font-medium text-stone-900">{row.itemName}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        <span className="text-stone-500">{row.sku}</span>
                        {!row.itemIsActive ? <Badge variant="muted">物料已停用</Badge> : null}
                        {!row.locationIsActive ? <Badge variant="muted">地点已停用</Badge> : null}
                      </div>
                    </td>
                    <td className="py-4 pr-4">{row.categoryName}</td>
                    <td className="py-4 pr-4">{row.locationName}</td>
                    <td className="py-4 pr-4">
                      {formatNumber(row.quantity)} {row.unitName}
                    </td>
                    <td className="py-4 pr-4">
                      {formatNumber(row.safetyStock)} {row.unitName}
                    </td>
                    <td className="py-4 pr-4">
                      <Badge variant={row.isLowStock ? "warning" : "success"}>
                        {row.isLowStock ? "低库存" : "正常"}
                      </Badge>
                    </td>
                    <td className="py-4 pr-4">{row.lastOperatorName ?? "-"}</td>
                    <td className="py-4">
                      {row.lastTransactionAt ? formatDateTime(row.lastTransactionAt) : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {inventory.totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-stone-600">
              <span>
                第 {inventory.page} / {inventory.totalPages} 页
              </span>
              <div className="flex items-center gap-3">
                {inventory.page > 1 ? (
                  <Link
                    className="font-medium text-tea-700 hover:underline"
                    href={buildPageLink(filters, inventory.page - 1)}
                  >
                    上一页
                  </Link>
                ) : (
                  <span className="text-stone-400">上一页</span>
                )}
                {inventory.page < inventory.totalPages ? (
                  <Link
                    className="font-medium text-tea-700 hover:underline"
                    href={buildPageLink(filters, inventory.page + 1)}
                  >
                    下一页
                  </Link>
                ) : (
                  <span className="text-stone-400">下一页</span>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
