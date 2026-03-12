"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { fetchJson } from "@/lib/client-fetch";
import { formatNumber } from "@/lib/utils";

type StocktakeItem = {
  itemId: string;
  itemName: string;
  categoryName: string;
  systemQuantity: number;
  unitName: string;
};

type StocktakeComposerProps = {
  locationId: string;
  locationName: string;
  items: StocktakeItem[];
};

export function StocktakeComposer({
  locationId,
  locationName,
  items
}: StocktakeComposerProps) {
  const router = useRouter();
  const [lines, setLines] = useState(
    items.map((item) => ({
      itemId: item.itemId,
      countedQuantity: String(item.systemQuantity),
      notes: ""
    }))
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setLines(
      items.map((item) => ({
        itemId: item.itemId,
        countedQuantity: String(item.systemQuantity),
        notes: ""
      }))
    );
  }, [items]);

  const changedCount = lines.reduce((total, line) => {
    const current = Number(line.countedQuantity);
    const system = items.find((item) => item.itemId === line.itemId)?.systemQuantity ?? 0;
    return total + (current !== system ? 1 : 0);
  }, 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const created = await fetchJson<{ id: string }>("/api/stocktakes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          locationId,
          notes,
          lines: lines.map((line) => ({
            itemId: line.itemId,
            countedQuantity: Number(line.countedQuantity),
            notes: line.notes
          }))
        })
      });

      await fetchJson(`/api/stocktakes/${created.id}/complete`, {
        method: "POST"
      });

      setMessage("盘点已完成并生成修正流水");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "盘点失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>盘点执行</CardTitle>
            <CardDescription>{locationName} 当前库存快照</CardDescription>
          </div>
          <Badge variant={changedCount > 0 ? "warning" : "success"}>
            已修改 {changedCount} 项
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-2xl bg-stone-100/70 px-4 py-6 text-sm text-stone-600">
            当前地点还没有库存记录。
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="overflow-x-auto rounded-[24px] border border-white/70 bg-white/80">
              <table className="min-w-full text-left text-sm">
                <thead className="text-stone-500">
                  <tr className="border-b border-stone-200/70">
                    <th className="px-4 py-3 font-medium">物料</th>
                    <th className="px-4 py-3 font-medium">分类</th>
                    <th className="px-4 py-3 font-medium">系统库存</th>
                    <th className="px-4 py-3 font-medium">实际盘点</th>
                    <th className="px-4 py-3 font-medium">差异</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const current = Number(lines[index]?.countedQuantity ?? item.systemQuantity);
                    const diff = current - item.systemQuantity;

                    return (
                      <tr key={item.itemId} className="border-b border-stone-100 text-stone-700">
                        <td className="px-4 py-4 font-medium">{item.itemName}</td>
                        <td className="px-4 py-4">{item.categoryName}</td>
                        <td className="px-4 py-4">
                          {formatNumber(item.systemQuantity)} {item.unitName}
                        </td>
                        <td className="px-4 py-4">
                          <Input
                            className="min-w-[120px]"
                            min="0"
                            step="0.001"
                            type="number"
                            value={lines[index]?.countedQuantity ?? ""}
                            onChange={(event) => {
                              const next = [...lines];
                              next[index] = {
                                ...next[index],
                                countedQuantity: event.target.value
                              };
                              setLines(next);
                            }}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={diff === 0 ? "muted" : diff > 0 ? "success" : "warning"}>
                            {diff > 0 ? "+" : ""}
                            {formatNumber(diff)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">盘点备注</label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="例如：晚班交接盘点"
              />
            </div>

            {error ? (
              <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            ) : null}
            {message ? (
              <div className="rounded-2xl bg-jade-50 px-4 py-3 text-sm text-jade-800">
                {message}
              </div>
            ) : null}

            <Button type="submit" disabled={loading || items.length === 0}>
              {loading ? "提交盘点中..." : "生成盘点修正"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
