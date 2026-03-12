import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { requireUser } from "@/lib/auth/session";
import { getDashboardSummary } from "@/lib/services/queries";
import { formatDateTime, formatNumber } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const dashboard = await getDashboardSummary(user);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/70 bg-gradient-to-br from-white/70 via-white/40 to-tea-50/80 p-6 shadow-panel sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-tea-700">
              仪表盘
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-stone-900 sm:text-4xl">
              库存总览
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
              快速查看全部物料、低库存风险、各地点库存分布和最近库存操作。
            </p>
          </div>
          <div className="rounded-[24px] bg-white/70 px-4 py-3 text-sm text-stone-600">
            当前角色：<span className="font-semibold text-stone-900">{user.roleName}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="全部物料总数"
          value={dashboard.stats.itemCount}
          hint="当前启用的物料基础资料数"
        />
        <StatCard
          label="低库存物料数"
          value={dashboard.stats.lowStockCount}
          hint="低于安全库存的地点物料组合"
        />
        <StatCard
          label="地点数"
          value={dashboard.stats.locationCount}
          hint="当前可见门店 / 仓库数量"
        />
        <StatCard
          label="今日操作数"
          value={dashboard.stats.todayTransactionCount}
          hint="今天产生的库存流水数量"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>各地点库存概览</CardTitle>
            <CardDescription>按当前权限范围展示地点库存状态</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.locations.map((location) => (
              <div
                key={location.id}
                className="rounded-[24px] border border-white/70 bg-white/70 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-stone-900">{location.name}</p>
                    <p className="text-sm text-stone-500">
                      {location.typeLabel}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="success">物料 {location.itemCount}</Badge>
                    <Badge variant={location.lowStockCount > 0 ? "warning" : "muted"}>
                      低库存 {location.lowStockCount}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>需要补货的物料</CardTitle>
            <CardDescription>按缺口大小排序，优先处理风险项</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.replenishmentList.length === 0 ? (
              <div className="rounded-[24px] bg-jade-50 p-4 text-sm text-jade-800">
                当前没有低库存项。
              </div>
            ) : (
              dashboard.replenishmentList.map((row) => (
                <div
                  key={row.id}
                  className="rounded-[24px] border border-rose-100 bg-rose-50/70 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-stone-900">{row.itemName}</p>
                      <p className="mt-1 text-sm text-stone-500">
                        {row.locationName} · {row.categoryName}
                      </p>
                    </div>
                    <Badge variant="warning">缺货风险</Badge>
                  </div>
                  <p className="mt-3 text-sm text-stone-700">
                    当前 {formatNumber(row.quantity)} / 安全库存 {formatNumber(row.safetyStock)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>最近库存操作</CardTitle>
          <CardDescription>最近 8 条库存流水记录</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200/70 text-stone-500">
                <th className="pb-3 pr-4 font-medium">流水号</th>
                <th className="pb-3 pr-4 font-medium">地点</th>
                <th className="pb-3 pr-4 font-medium">类型</th>
                <th className="pb-3 pr-4 font-medium">物料</th>
                <th className="pb-3 pr-4 font-medium">模块</th>
                <th className="pb-3 pr-4 font-medium">数量变更</th>
                <th className="pb-3 pr-4 font-medium">操作人</th>
                <th className="pb-3 font-medium">时间</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recentTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-stone-100 text-stone-700">
                  <td className="py-4 pr-4 font-medium">{transaction.transactionNo}</td>
                  <td className="py-4 pr-4">{transaction.locationName}</td>
                  <td className="py-4 pr-4">
                    <Badge
                      variant={
                        transaction.operationType === "DAMAGE"
                          ? "warning"
                          : transaction.quantityChange > 0
                            ? "success"
                            : "default"
                      }
                    >
                      {transaction.operationLabel}
                    </Badge>
                  </td>
                  <td className="py-4 pr-4">{transaction.itemName}</td>
                  <td className="py-4 pr-4">
                    {transaction.sourceModuleLabel}
                  </td>
                  <td className="py-4 pr-4">
                    {transaction.quantityChange > 0 ? "+" : ""}
                    {formatNumber(transaction.quantityChange)} {transaction.unitName}
                  </td>
                  <td className="py-4 pr-4">{transaction.operatorName}</td>
                  <td className="py-4">{formatDateTime(transaction.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
