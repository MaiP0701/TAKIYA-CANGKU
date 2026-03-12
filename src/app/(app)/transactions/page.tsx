import { isAdmin } from "@/lib/auth/access";
import { requireUser } from "@/lib/auth/session";
import { getTransactions, getUsers, getBootstrapData } from "@/lib/services/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDateTime, formatNumber } from "@/lib/utils";

type SearchParams = Promise<{
  query?: string;
  type?: string;
  locationId?: string;
  operatorId?: string;
  sourceModule?: string;
  dateFrom?: string;
  dateTo?: string;
}>;

const operationTypes = [
  ["", "全部类型"],
  ["INBOUND", "入库"],
  ["OUTBOUND", "出库"],
  ["WAREHOUSE_TRANSFER", "仓库调拨"],
  ["STORE_TRANSFER", "门店调拨"],
  ["STORE_RETURN", "门店退回"],
  ["STOCKTAKE_ADJUSTMENT", "盘点修正"],
  ["DAMAGE", "报损"],
  ["ADJUSTMENT", "其他调整"]
];

const sourceModules = [
  ["", "全部来源"],
  ["quick-adjust", "快速出入库"],
  ["inventory-page", "库存列表"],
  ["transfer", "调拨"],
  ["stocktake", "盘点"]
];

export default async function TransactionsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const filters = await searchParams;
  const [bootstrap, logs, users] = await Promise.all([
    getBootstrapData(user),
    getTransactions(user, filters),
    isAdmin(user) ? getUsers(user) : Promise.resolve([])
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/70 bg-white/60 p-6 shadow-panel">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-tea-700">
          Audit Trail
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900">库存日志</h1>
        <p className="mt-2 text-sm text-stone-600">
          查看谁在什么时间、对哪个地点的哪个物料做了什么库存变更。
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
          <CardDescription>支持按物料、地点、操作类型、来源模块、操作人和时间筛选</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
            <Input defaultValue={filters.query} name="query" placeholder="物料关键词" />
            <Select defaultValue={filters.type ?? ""} name="type">
              {operationTypes.map(([value, label]) => (
                <option key={value || "all"} value={value}>
                  {label}
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
            <Select defaultValue={filters.sourceModule ?? ""} name="sourceModule">
              {sourceModules.map(([value, label]) => (
                <option key={value || "all"} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select defaultValue={filters.operatorId ?? ""} name="operatorId">
              <option value="">全部操作人</option>
              {users.map((operator) => (
                <option key={operator.id} value={operator.id}>
                  {operator.displayName}
                </option>
              ))}
            </Select>
            <Input defaultValue={filters.dateFrom} name="dateFrom" type="date" />
            <Input defaultValue={filters.dateTo} name="dateTo" type="date" />
            <Button className="xl:col-span-7 xl:w-fit" type="submit">
              应用筛选
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>日志明细</CardTitle>
          <CardDescription>共 {logs.length} 条库存变化记录</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200/70 text-stone-500">
                <th className="pb-3 pr-4 font-medium">时间</th>
                <th className="pb-3 pr-4 font-medium">操作人</th>
                <th className="pb-3 pr-4 font-medium">来源模块</th>
                <th className="pb-3 pr-4 font-medium">类型</th>
                <th className="pb-3 pr-4 font-medium">地点</th>
                <th className="pb-3 pr-4 font-medium">物料</th>
                <th className="pb-3 pr-4 font-medium">变更</th>
                <th className="pb-3 pr-4 font-medium">变更前后</th>
                <th className="pb-3 font-medium">备注</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td className="py-8 text-center text-stone-500" colSpan={9}>
                    当前筛选条件下没有库存日志。
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-stone-100 text-stone-700">
                    <td className="py-4 pr-4">{formatDateTime(log.createdAt)}</td>
                    <td className="py-4 pr-4">{log.operatorName}</td>
                    <td className="py-4 pr-4">{log.sourceModuleLabel}</td>
                    <td className="py-4 pr-4">
                      <Badge
                        variant={
                          log.operationType === "DAMAGE"
                            ? "warning"
                            : log.quantityChange > 0
                              ? "success"
                              : "default"
                        }
                      >
                        {log.operationLabel}
                      </Badge>
                    </td>
                    <td className="py-4 pr-4">{log.locationName}</td>
                    <td className="py-4 pr-4 font-medium">{log.itemName}</td>
                    <td className="py-4 pr-4">
                      <span className={log.quantityChange < 0 ? "text-rose-600" : "text-jade-700"}>
                        {log.quantityChange > 0 ? "+" : ""}
                        {formatNumber(log.quantityChange)} {log.unitName}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      {formatNumber(log.beforeQuantity)} → {formatNumber(log.afterQuantity)}
                    </td>
                    <td className="py-4">{log.remark ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
