import { TransferForm } from "@/components/forms/transfer-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getBootstrapData, getItems, getTransferTransactions } from "@/lib/services/queries";
import { formatDateTime, formatNumber } from "@/lib/utils";

export default async function TransfersPage() {
  const user = await requireUser();
  const [bootstrap, items, transactions] = await Promise.all([
    getBootstrapData(user),
    getItems({ active: "true" }),
    getTransferTransactions(user, {})
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/70 bg-white/60 p-6 shadow-panel">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-tea-700">
          Transfers
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900">调拨管理</h1>
        <p className="mt-2 text-sm text-stone-600">
          统一处理总仓到门店、门店之间的库存流转。
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <TransferForm
          items={items.map((item) => ({ id: item.id, name: item.name }))}
          locations={bootstrap.locations.map((location) => ({
            id: location.id,
            name: location.name
          }))}
          defaultLocationId={user.defaultLocationId}
        />

        <Card>
          <CardHeader>
            <CardTitle>最近调拨记录</CardTitle>
            <CardDescription>共 {transactions.length} 条调拨流水</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200/70 text-stone-500">
                  <th className="pb-3 pr-4 font-medium">流水号</th>
                  <th className="pb-3 pr-4 font-medium">类型</th>
                  <th className="pb-3 pr-4 font-medium">物料</th>
                  <th className="pb-3 pr-4 font-medium">路线</th>
                  <th className="pb-3 pr-4 font-medium">数量</th>
                  <th className="pb-3 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((row) => (
                  <tr key={row.id} className="border-b border-stone-100 text-stone-700">
                    <td className="py-4 pr-4 font-medium">{row.transactionNo}</td>
                    <td className="py-4 pr-4">
                      <Badge>{row.operationLabel}</Badge>
                    </td>
                    <td className="py-4 pr-4">{row.itemName}</td>
                    <td className="py-4 pr-4">
                      {(row.sourceLocationName ?? "-") + " -> " + (row.targetLocationName ?? "-")}
                    </td>
                    <td className="py-4 pr-4">
                      {formatNumber(row.quantity)} {row.unitName}
                    </td>
                    <td className="py-4">{formatDateTime(row.occurredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
