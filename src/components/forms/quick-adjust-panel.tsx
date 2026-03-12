"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fetchJson } from "@/lib/client-fetch";
import { LARGE_ADJUSTMENT_THRESHOLD } from "@/lib/constants/inventory";
import { formatNumber } from "@/lib/utils";

type LocationOption = {
  id: string;
  name: string;
  typeLabel: string;
};

type SearchItem = {
  itemId: string;
  itemName: string;
  sku: string;
  categoryName: string;
  unitName: string;
  locationId: string;
  currentQuantity: number;
  safetyStock: number;
  isLowStock: boolean;
};

type QuickAdjustPanelProps = {
  locations: LocationOption[];
  defaultLocationId?: string | null;
};

export function QuickAdjustPanel({
  locations,
  defaultLocationId
}: QuickAdjustPanelProps) {
  const router = useRouter();
  const [locationId, setLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [recentItems, setRecentItems] = useState<SearchItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SearchItem | null>(null);
  const [operationType, setOperationType] = useState<"INBOUND" | "OUTBOUND" | "DAMAGE" | "ADJUSTMENT">("OUTBOUND");
  const [adjustmentDirection, setAdjustmentDirection] = useState<"INCREASE" | "DECREASE">("DECREASE");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      if (!locationId) {
        return;
      }

      setSearchLoading(true);
      setError(null);

      try {
        const payload = await fetchJson<{
          results: SearchItem[];
          recentItems: SearchItem[];
        }>(`/api/quick-adjust/search?locationId=${locationId}&query=${encodeURIComponent(deferredQuery)}`);

        if (cancelled) {
          return;
        }

        setResults(payload.results);
        setRecentItems(payload.recentItems);

        if (selectedItem) {
          const nextSelected =
            payload.results.find((item) => item.itemId === selectedItem.itemId) ??
            payload.recentItems.find((item) => item.itemId === selectedItem.itemId) ??
            null;
          setSelectedItem(nextSelected);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "加载物料失败");
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }

    void loadItems();

    return () => {
      cancelled = true;
    };
  }, [deferredQuery, locationId, reloadToken, selectedItem?.itemId]);

  const displayedItems = useMemo(
    () => (query.trim() ? results : recentItems.length > 0 ? recentItems : results),
    [query, recentItems, results]
  );

  const isDecreaseAction =
    operationType === "OUTBOUND" ||
    operationType === "DAMAGE" ||
    (operationType === "ADJUSTMENT" && adjustmentDirection === "DECREASE");
  const parsedQuantity = Number(quantity || 0);
  const insufficient =
    selectedItem && isDecreaseAction && Number.isFinite(parsedQuantity)
      ? parsedQuantity > selectedItem.currentQuantity
      : false;
  const requireRemark =
    operationType === "DAMAGE" ||
    operationType === "ADJUSTMENT" ||
    parsedQuantity >= LARGE_ADJUSTMENT_THRESHOLD;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (!selectedItem) {
        throw new Error("请先选择物料");
      }

      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        throw new Error("请输入合法数量");
      }

      if (requireRemark && notes.trim().length === 0) {
        throw new Error("当前操作必须填写备注");
      }

      if (insufficient) {
        throw new Error("当前库存不足，无法提交减少类操作");
      }

      const confirmed =
        parsedQuantity >= LARGE_ADJUSTMENT_THRESHOLD
          ? window.confirm(`本次操作数量达到 ${LARGE_ADJUSTMENT_THRESHOLD} 以上，确认继续提交吗？`)
          : true;

      if (!confirmed) {
        setSubmitting(false);
        return;
      }

      await fetchJson("/api/quick-adjust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          locationId,
          itemId: selectedItem.itemId,
          quantity: parsedQuantity,
          operationType,
          adjustmentDirection,
          notes,
          confirmed
        })
      });

      setQuantity("");
      setNotes("");
      setMessage("库存操作已完成");
      setReloadToken((current) => current + 1);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>快速出入库</CardTitle>
          <CardDescription>适合 iPad 和手机端的高频操作入口</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">地点</label>
              <Select value={locationId} onChange={(event) => setLocationId(event.target.value)}>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} · {location.typeLabel}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">搜索物料</label>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="输入名称关键字，如：牛奶、珍珠、杯子"
              />
              <p className="text-xs text-stone-500">
                {searchLoading ? "正在搜索..." : "支持即时模糊搜索，空输入时显示最近使用物料"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">操作类型</label>
              <Select
                value={operationType}
                onChange={(event) => setOperationType(event.target.value as typeof operationType)}
              >
                <option value="INBOUND">入库</option>
                <option value="OUTBOUND">出库</option>
                <option value="DAMAGE">报损</option>
                <option value="ADJUSTMENT">其他调整</option>
              </Select>
            </div>

            {operationType === "ADJUSTMENT" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">调整方向</label>
                <Select
                  value={adjustmentDirection}
                  onChange={(event) =>
                    setAdjustmentDirection(event.target.value as typeof adjustmentDirection)
                  }
                >
                  <option value="INCREASE">增加</option>
                  <option value="DECREASE">减少</option>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">数量</label>
              <Input
                type="number"
                min="0"
                step="0.001"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="请输入数量"
              />
              {insufficient ? (
                <p className="text-xs font-medium text-rose-600">当前库存不足，无法提交减少类操作</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">
                备注{requireRemark ? "（必填）" : "（选填）"}
              </label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="报损、其他调整、大额操作建议填写原因"
              />
            </div>

            {selectedItem ? (
              <div className="rounded-[24px] border border-white/70 bg-white/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-stone-900">{selectedItem.itemName}</p>
                    <p className="text-sm text-stone-500">
                      {selectedItem.categoryName} · {selectedItem.unitName}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={selectedItem.isLowStock ? "warning" : "success"}>
                      {selectedItem.isLowStock ? "低库存" : "库存正常"}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-stone-100/70 px-4 py-3">
                    <div className="text-xs text-stone-500">当前库存</div>
                    <div className="mt-1 text-2xl font-semibold text-stone-900">
                      {formatNumber(selectedItem.currentQuantity)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-stone-100/70 px-4 py-3">
                    <div className="text-xs text-stone-500">预警阈值</div>
                    <div className="mt-1 text-2xl font-semibold text-stone-900">
                      {formatNumber(selectedItem.safetyStock)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] bg-stone-100/70 px-4 py-6 text-sm text-stone-600">
                先选择地点并搜索物料，再输入数量提交。
              </div>
            )}

            {error ? (
              <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            ) : null}
            {message ? (
              <div className="rounded-2xl bg-jade-50 px-4 py-3 text-sm text-jade-800">
                {message}
              </div>
            ) : null}

            <Button className="w-full h-12 text-base" type="submit" disabled={submitting || !selectedItem}>
              {submitting ? "提交中..." : "确认提交库存操作"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{query.trim() ? "搜索结果" : "最近使用物料"}</CardTitle>
          <CardDescription>点击一项即可带入右侧操作表单</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {displayedItems.length === 0 ? (
            <div className="rounded-[24px] bg-stone-100/70 px-4 py-6 text-sm text-stone-600">
              当前没有可展示的物料。
            </div>
          ) : (
            displayedItems.map((item) => (
              <button
                key={`${item.itemId}-${item.locationId}`}
                type="button"
                className={`w-full rounded-[24px] border p-4 text-left transition ${
                  selectedItem?.itemId === item.itemId
                    ? "border-tea-300 bg-tea-50 shadow-sm"
                    : "border-white/70 bg-white/80 hover:bg-white"
                }`}
                onClick={() => setSelectedItem(item)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-stone-900">{item.itemName}</p>
                    <p className="mt-1 text-sm text-stone-500">
                      {item.categoryName} · {item.unitName}
                    </p>
                  </div>
                  <Badge variant={item.isLowStock ? "warning" : "muted"}>
                    {item.isLowStock ? "低库存" : "可操作"}
                  </Badge>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-stone-600">
                  <span>当前库存 {formatNumber(item.currentQuantity)}</span>
                  <span>预警阈值 {formatNumber(item.safetyStock)}</span>
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
