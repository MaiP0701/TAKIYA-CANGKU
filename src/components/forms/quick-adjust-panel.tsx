"use client";

import { useEffect, useMemo, useState } from "react";
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

type CategoryOption = {
  id: string;
  name: string;
};

type QuickAdjustItem = {
  itemId: string;
  itemName: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  unitName: string;
  inventoryByLocation: Record<
    string,
    {
      currentQuantity: number;
      safetyStock: number;
      isLowStock: boolean;
    }
  >;
};

type QuickAdjustPanelProps = {
  locations: LocationOption[];
  categories: CategoryOption[];
  items: QuickAdjustItem[];
  defaultLocationId?: string | null;
};

export function QuickAdjustPanel({
  locations,
  categories,
  items,
  defaultLocationId
}: QuickAdjustPanelProps) {
  const router = useRouter();
  const [locationId, setLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [operationType, setOperationType] = useState<"INBOUND" | "OUTBOUND" | "DAMAGE" | "ADJUSTMENT">("OUTBOUND");
  const [adjustmentDirection, setAdjustmentDirection] = useState<"INCREASE" | "DECREASE">("DECREASE");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId) {
      setSelectedItemId("");
      return;
    }

    if (!items.some((item) => item.categoryId === categoryId && item.itemId === selectedItemId)) {
      setSelectedItemId("");
    };
  }, [categoryId, items, selectedItemId]);

  const filteredItems = useMemo(
    () => items.filter((item) => item.categoryId === categoryId),
    [categoryId, items]
  );

  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.itemId === selectedItemId) ?? null,
    [filteredItems, selectedItemId]
  );

  const selectedInventory = useMemo(() => {
    if (!selectedItem || !locationId) {
      return null;
    }

    return (
      selectedItem.inventoryByLocation[locationId] ?? {
        currentQuantity: 0,
        safetyStock: 0,
        isLowStock: false
      }
    );
  }, [locationId, selectedItem]);

  const isDecreaseAction =
    operationType === "OUTBOUND" ||
    operationType === "DAMAGE" ||
    (operationType === "ADJUSTMENT" && adjustmentDirection === "DECREASE");
  const parsedQuantity = Number(quantity || 0);
  const insufficient =
    selectedInventory && isDecreaseAction && Number.isFinite(parsedQuantity)
      ? parsedQuantity > selectedInventory.currentQuantity
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">物料分类</label>
                <Select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                >
                  <option value="">请选择分类</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">物料名称</label>
                <Select
                  disabled={!categoryId || filteredItems.length === 0}
                  value={selectedItemId}
                  onChange={(event) => setSelectedItemId(event.target.value)}
                >
                  <option value="">
                    {!categoryId
                      ? "请先选择分类"
                      : filteredItems.length === 0
                        ? "当前分类下暂无可用物料"
                        : "请选择物料"}
                  </option>
                  {filteredItems.map((item) => (
                    <option key={item.itemId} value={item.itemId}>
                      {item.itemName} · {item.unitName}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <p className="text-xs text-stone-500">
              先选分类，再从该分类下选择物料。这样在 iPad 和手机端会比即时搜索更稳定。
            </p>

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
                    <Badge variant={selectedInventory?.isLowStock ? "warning" : "success"}>
                      {selectedInventory?.isLowStock ? "低库存" : "库存正常"}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-stone-100/70 px-4 py-3">
                    <div className="text-xs text-stone-500">当前库存</div>
                    <div className="mt-1 text-2xl font-semibold text-stone-900">
                      {formatNumber(selectedInventory?.currentQuantity ?? 0)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-stone-100/70 px-4 py-3">
                    <div className="text-xs text-stone-500">预警阈值</div>
                    <div className="mt-1 text-2xl font-semibold text-stone-900">
                      {formatNumber(selectedInventory?.safetyStock ?? 0)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] bg-stone-100/70 px-4 py-6 text-sm text-stone-600">
                先选择地点、分类和物料，再输入数量提交。
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
          <CardTitle>{categoryId ? "当前分类物料" : "物料选择说明"}</CardTitle>
          <CardDescription>
            {categoryId ? "点击一项即可带入左侧操作表单" : "先选择一个物料分类，再选择具体物料"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!categoryId ? (
            <div className="rounded-[24px] bg-stone-100/70 px-4 py-6 text-sm text-stone-600">
              先在左侧选择物料分类，系统再展示该分类下的可操作物料。
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-[24px] bg-stone-100/70 px-4 py-6 text-sm text-stone-600">
              当前分类下没有可展示的启用物料。
            </div>
          ) : (
            filteredItems.map((item) => {
              const inventory = item.inventoryByLocation[locationId] ?? {
                currentQuantity: 0,
                safetyStock: 0,
                isLowStock: false
              };

              return (
              <button
                key={`${item.itemId}-${locationId}`}
                type="button"
                className={`w-full rounded-[24px] border p-4 text-left transition ${
                  selectedItemId === item.itemId
                    ? "border-tea-300 bg-tea-50 shadow-sm"
                    : "border-white/70 bg-white/80 hover:bg-white"
                }`}
                onClick={() => setSelectedItemId(item.itemId)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-stone-900">{item.itemName}</p>
                    <p className="mt-1 text-sm text-stone-500">
                      {item.categoryName} · {item.unitName}
                    </p>
                  </div>
                  <Badge variant={inventory.isLowStock ? "warning" : "muted"}>
                    {inventory.isLowStock ? "低库存" : "可操作"}
                  </Badge>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-stone-600">
                  <span>当前库存 {formatNumber(inventory.currentQuantity)}</span>
                  <span>预警阈值 {formatNumber(inventory.safetyStock)}</span>
                </div>
              </button>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
