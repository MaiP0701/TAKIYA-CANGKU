import Link from "next/link";
import { DeleteEntityButton } from "@/components/actions/delete-entity-button";
import { UnitForm } from "@/components/forms/unit-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireAdminUser } from "@/lib/auth/session";
import { getUnits } from "@/lib/services/queries";

type SearchParams = Promise<{
  query?: string;
  active?: string;
}>;

export default async function UnitsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const filters = await searchParams;
  const units = await getUnits(user, filters);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/70 bg-white/60 p-6 shadow-panel">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-tea-700">
          Units
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900">单位管理</h1>
        <p className="mt-2 text-sm text-stone-600">维护库存与物料使用的基础单位。</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
          <CardDescription>支持按名称和启用状态筛选单位</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-3">
            <Input defaultValue={filters.query} name="query" placeholder="单位名称关键词" />
            <Select defaultValue={filters.active ?? ""} name="active">
              <option value="">全部状态</option>
              <option value="true">启用</option>
              <option value="false">停用</option>
            </Select>
            <Button type="submit">应用筛选</Button>
          </form>
        </CardContent>
      </Card>

      <UnitForm />

      <Card>
        <CardHeader>
          <CardTitle>单位列表</CardTitle>
          <CardDescription>共 {units.length} 个单位</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200/70 text-stone-500">
                <th className="pb-3 pr-4 font-medium">名称</th>
                <th className="pb-3 pr-4 font-medium">编码</th>
                <th className="pb-3 pr-4 font-medium">简称</th>
                <th className="pb-3 pr-4 font-medium">精度</th>
                <th className="pb-3 pr-4 font-medium">排序</th>
                <th className="pb-3 pr-4 font-medium">状态</th>
                <th className="pb-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id} className="border-b border-stone-100 text-stone-700">
                  <td className="py-4 pr-4 font-medium">{unit.name}</td>
                  <td className="py-4 pr-4">{unit.code}</td>
                  <td className="py-4 pr-4">{unit.symbol ?? "-"}</td>
                  <td className="py-4 pr-4">{unit.precision}</td>
                  <td className="py-4 pr-4">{unit.sortOrder}</td>
                  <td className="py-4 pr-4">
                    <Badge variant={unit.isActive ? "success" : "muted"}>
                      {unit.isActive ? "启用" : "停用"}
                    </Badge>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link className="text-tea-700 hover:underline" href={`/units/${unit.id}`}>
                        编辑
                      </Link>
                      <DeleteEntityButton
                        endpoint={`/api/units/${unit.id}`}
                        entityName={unit.name}
                        kind="unit"
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
