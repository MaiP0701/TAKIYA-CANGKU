import Link from "next/link";
import { DeleteEntityButton } from "@/components/actions/delete-entity-button";
import { LocationForm } from "@/components/forms/location-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireAdminUser } from "@/lib/auth/session";
import { getLocations } from "@/lib/services/queries";

type SearchParams = Promise<{
  query?: string;
  active?: string;
}>;

export default async function LocationsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const filters = await searchParams;
  const locations = await getLocations(user, filters);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/70 bg-white/60 p-6 shadow-panel">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-tea-700">
          Locations
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900">地点管理</h1>
        <p className="mt-2 text-sm text-stone-600">新增、编辑、启停门店与仓库地点。</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
          <CardDescription>支持按名称和启用状态筛选地点</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-3">
            <Input defaultValue={filters.query} name="query" placeholder="地点名称关键词" />
            <Select defaultValue={filters.active ?? ""} name="active">
              <option value="">全部状态</option>
              <option value="true">启用</option>
              <option value="false">停用</option>
            </Select>
            <Button type="submit">应用筛选</Button>
          </form>
        </CardContent>
      </Card>

      <LocationForm />

      <Card>
        <CardHeader>
          <CardTitle>地点列表</CardTitle>
          <CardDescription>共 {locations.length} 个地点</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200/70 text-stone-500">
                <th className="pb-3 pr-4 font-medium">名称</th>
                <th className="pb-3 pr-4 font-medium">编码</th>
                <th className="pb-3 pr-4 font-medium">类型</th>
                <th className="pb-3 pr-4 font-medium">排序</th>
                <th className="pb-3 pr-4 font-medium">状态</th>
                <th className="pb-3 pr-4 font-medium">备注</th>
                <th className="pb-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((location) => (
                <tr key={location.id} className="border-b border-stone-100 text-stone-700">
                  <td className="py-4 pr-4 font-medium">{location.name}</td>
                  <td className="py-4 pr-4">{location.code}</td>
                  <td className="py-4 pr-4">{location.typeLabel}</td>
                  <td className="py-4 pr-4">{location.sortOrder}</td>
                  <td className="py-4 pr-4">
                    <Badge variant={location.isActive ? "success" : "muted"}>
                      {location.isActive ? "启用" : "停用"}
                    </Badge>
                  </td>
                  <td className="py-4 pr-4">{location.remark ?? "-"}</td>
                  <td className="py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        className="text-tea-700 hover:underline"
                        href={`/locations/${location.id}`}
                      >
                        编辑
                      </Link>
                      <DeleteEntityButton
                        endpoint={`/api/locations/${location.id}`}
                        entityName={location.name}
                        kind="location"
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
