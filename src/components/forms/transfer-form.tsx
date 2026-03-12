"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fetchJson } from "@/lib/client-fetch";
import { LARGE_ADJUSTMENT_THRESHOLD } from "@/lib/constants/inventory";

type Option = {
  id: string;
  name: string;
};

type TransferFormProps = {
  items: Option[];
  locations: Option[];
  defaultLocationId?: string | null;
};

export function TransferForm({
  items,
  locations,
  defaultLocationId
}: TransferFormProps) {
  const router = useRouter();
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [sourceLocationId, setSourceLocationId] = useState(
    defaultLocationId ?? locations[0]?.id ?? ""
  );
  const [targetLocationId, setTargetLocationId] = useState(
    locations.find((location) => location.id !== (defaultLocationId ?? locations[0]?.id))?.id ??
      locations[0]?.id ??
      ""
  );
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!itemId || !sourceLocationId || !targetLocationId) {
        throw new Error("请选择物料、来源地点和目标地点");
      }

      if (sourceLocationId === targetLocationId) {
        throw new Error("来源地点和目标地点不能相同");
      }

      const parsedQuantity = Number(quantity);
      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        throw new Error("请输入合法调拨数量");
      }

      if (parsedQuantity >= LARGE_ADJUSTMENT_THRESHOLD && notes.trim().length === 0) {
        throw new Error("大额调拨请填写备注");
      }

      const confirmed =
        parsedQuantity >= LARGE_ADJUSTMENT_THRESHOLD
          ? window.confirm(`本次调拨数量达到 ${LARGE_ADJUSTMENT_THRESHOLD} 以上，确认继续提交吗？`)
          : true;

      if (!confirmed) {
        setLoading(false);
        return;
      }

      await fetchJson("/api/transactions/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          itemId,
          sourceLocationId,
          targetLocationId,
          quantity: parsedQuantity,
          notes,
          confirmed
        })
      });

      setQuantity("");
      setNotes("");
      setMessage("调拨已完成");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "调拨失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>新建调拨</CardTitle>
        <CardDescription>支持总仓到门店、门店间调拨</CardDescription>
      </CardHeader>
      <CardContent>
        {locations.length < 2 ? (
          <div className="rounded-2xl bg-stone-100/80 px-4 py-6 text-sm text-stone-600">
            当前账号可用地点不足 2 个，暂时不能发起调拨。
          </div>
        ) : (
            <div className="space-y-2">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700">物料</label>
                  <Select value={itemId} onChange={(event) => setItemId(event.target.value)}>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">来源地点</label>
                    <Select
                      value={sourceLocationId}
                      onChange={(event) => setSourceLocationId(event.target.value)}
                    >
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">目标地点</label>
                    <Select
                      value={targetLocationId}
                      onChange={(event) => setTargetLocationId(event.target.value)}
                    >
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700">数量</label>
                  <Input
                    min="0"
                    step="0.001"
                    type="number"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    placeholder="请输入调拨数量"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700">备注</label>
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="例如：补货、紧急调拨"
                  />
                </div>

                {error ? (
                  <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}
                {message ? (
                  <div className="rounded-2xl bg-jade-50 px-4 py-3 text-sm text-jade-800">
                    {message}
                  </div>
                ) : null}

                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? "提交中..." : "确认调拨"}
                </Button>
              </form>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
