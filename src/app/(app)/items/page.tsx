import Link from "next/link";
import { DeleteEntityButton } from "@/components/actions/delete-entity-button";
import { ItemForm } from "@/components/forms/item-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireAdminUser } from "@/lib/auth/session";
import { getBootstrapData, getItems } from "@/lib/services/queries";
import { formatNumber } from "@/lib/utils";

type SearchParams = Promise<{
  query?: string;
  categoryId?: string;
  active?: string;
}>;

export default async function ItemsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const filters = await searchParams;
  const [bootstrap, items] = await Promise.all([
    getBootstrapData(user, {
      includeRoles: false
    }),
    getItems(filters)
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/70 bg-white/60 p-6 shadow-panel">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-tea-700">
          Items
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900">物料管理</h1>
        <p className="mt-2 text-sm text-stone-600">
          维护可扩展的物料主数据、分类、规格、安全库存和启用状态。
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
          <CardDescription>支持按名称、分类和状态查找物料</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input defaultValue={filters.query} name="query" placeholder="物料名称关键词" />
            <Select defaultValue={filters.categoryId ?? ""} name="categoryId">
              <option value="">全部分类</option>
              {bootstrap.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Select defaultValue={filters.active ?? ""} name="active">
              <option value="">全部状态</option>
              <option value="true">启用</option>
              <option value="false">停用</option>
            </Select>
            <Button type="submit">应用筛选</Button>
          </form>
        </CardContent>
      </Card>

      <ItemForm
        categories={bootstrap.categories.map((category) => ({
          id: category.id,
          name: category.name
        }))}
        units={bootstrap.units.map((unit) => ({
          id: unit.id,
          name: unit.name
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>物料列表</CardTitle>
          <CardDescription>共 {items.length} 条物料记录</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200/70 text-stone-500">
                <th className="pb-3 pr-4 font-medium">SKU</th>
                <th className="pb-3 pr-4 font-medium">名称</th>
                <th className="pb-3 pr-4 font-medium">分类</th>
                <th className="pb-3 pr-4 font-medium">规格</th>
                <th className="pb-3 pr-4 font-medium">单位</th>
                <th className="pb-3 pr-4 font-medium">安全库存</th>
                <th className="pb-3 pr-4 font-medium">状态</th>
                <th className="pb-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-stone-100 text-stone-700">
                  <td className="py-4 pr-4 font-medium">{item.sku}</td>
                  <td className="py-4 pr-4">{item.name}</td>
                  <td className="py-4 pr-4">{item.categoryName}</td>
                  <td className="py-4 pr-4">{item.specification ?? "-"}</td>
                  <td className="py-4 pr-4">{item.baseUnitName}</td>
                  <td className="py-4 pr-4">{formatNumber(item.safetyStock)}</td>
                  <td className="py-4 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={item.alertEnabled ? "warning" : "muted"}>
                        {item.alertEnabled ? "预警开启" : "预警关闭"}
                      </Badge>
                      <Badge variant={item.isActive ? "success" : "muted"}>
                        {item.isActive ? "启用" : "停用"}
                      </Badge>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        className="text-tea-700 underline-offset-4 hover:underline"
                        href={`/items/${item.id}`}
                      >
                        编辑
                      </Link>
                      <DeleteEntityButton
                        endpoint={`/api/items/${item.id}`}
                        entityName={item.name}
                        kind="item"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
