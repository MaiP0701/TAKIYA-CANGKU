"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fetchJson } from "@/lib/client-fetch";

type Option = {
  id: string;
  name: string;
};

type ItemFormProps = {
  categories: Option[];
  units: Option[];
  mode?: "create" | "update";
  item?: {
    id: string;
    sku: string;
    name: string;
    categoryId: string;
    baseUnitId: string;
    specification: string | null;
    safetyStock: number;
    alertEnabled: boolean;
    brand: string | null;
    supplierName: string | null;
    shelfLifeDays: number | null;
    imageUrl: string | null;
    notes: string | null;
    isActive: boolean;
  };
};

export function ItemForm({
  categories,
  units,
  mode = "create",
  item
}: ItemFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    sku: item?.sku ?? "",
    name: item?.name ?? "",
    categoryId: item?.categoryId ?? categories[0]?.id ?? "",
    baseUnitId: item?.baseUnitId ?? units[0]?.id ?? "",
    specification: item?.specification ?? "",
    safetyStock: String(item?.safetyStock ?? 0),
    brand: item?.brand ?? "",
    supplierName: item?.supplierName ?? "",
    shelfLifeDays: item?.shelfLifeDays ? String(item.shelfLifeDays) : "",
    imageUrl: item?.imageUrl ?? "",
    notes: item?.notes ?? "",
    alertEnabled: item?.alertEnabled ?? true,
    isActive: item?.isActive ?? true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function updateField<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (form.name.trim().length === 0) {
        throw new Error("物料名称不能为空");
      }

      if (!form.categoryId || !form.baseUnitId) {
        throw new Error("请选择分类和单位");
      }

      const safetyStock = Number(form.safetyStock);
      if (!Number.isFinite(safetyStock) || safetyStock < 0) {
        throw new Error("安全库存必须是大于等于 0 的数字");
      }

      const shelfLifeDays =
        form.shelfLifeDays.trim().length > 0 ? Number(form.shelfLifeDays) : null;
      if (shelfLifeDays !== null && (!Number.isInteger(shelfLifeDays) || shelfLifeDays < 0)) {
        throw new Error("保质期天数必须是大于等于 0 的整数");
      }

      const endpoint = mode === "create" ? "/api/items" : `/api/items/${item?.id}`;
      await fetchJson(endpoint, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          safetyStock,
          shelfLifeDays
        })
      });

      if (mode === "update") {
        window.location.assign("/items");
        return;
      } else {
        setMessage("物料已创建");
        router.refresh();
        setForm((current) => ({
          ...current,
          sku: "",
          name: "",
          specification: "",
          safetyStock: "0",
          brand: "",
          supplierName: "",
          shelfLifeDays: "",
          imageUrl: "",
          notes: "",
          alertEnabled: true,
          isActive: true
        }));
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "create" ? "新增物料" : "编辑物料"}</CardTitle>
        <CardDescription>
          物料按主单位管理库存，`规格` 当前作为说明字段保存。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">SKU / 编码</label>
              <Input
                value={form.sku}
                onChange={(event) => updateField("sku", event.target.value)}
                placeholder="留空可自动生成"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">物料名称</label>
              <Input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="例如：红茶茶叶"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">分类</label>
              <Select
                value={form.categoryId}
                onChange={(event) => updateField("categoryId", event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">单位</label>
              <Select
                value={form.baseUnitId}
                onChange={(event) => updateField("baseUnitId", event.target.value)}
              >
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">规格说明</label>
              <Input
                value={form.specification}
                onChange={(event) => updateField("specification", event.target.value)}
                placeholder="例如：1箱=1000个"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">安全库存</label>
              <Input
                min="0"
                step="0.001"
                type="number"
                value={form.safetyStock}
                onChange={(event) => updateField("safetyStock", event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">品牌</label>
              <Input
                value={form.brand}
                onChange={(event) => updateField("brand", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">供应商</label>
              <Input
                value={form.supplierName}
                onChange={(event) => updateField("supplierName", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">保质期天数</label>
              <Input
                min="0"
                type="number"
                value={form.shelfLifeDays}
                onChange={(event) => updateField("shelfLifeDays", event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">图片链接</label>
              <Input
                value={form.imageUrl}
                onChange={(event) => updateField("imageUrl", event.target.value)}
                placeholder="预留字段，可后续接对象存储"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">状态</label>
              <Select
                value={String(form.isActive)}
                onChange={(event) => updateField("isActive", event.target.value === "true")}
              >
                <option value="true">启用</option>
                <option value="false">停用</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">低库存预警</label>
              <Select
                value={String(form.alertEnabled)}
                onChange={(event) => updateField("alertEnabled", event.target.value === "true")}
              >
                <option value="true">启用</option>
                <option value="false">停用</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">备注</label>
            <Textarea
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="可填写使用场景、储存要求等"
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

          <Button className="w-full sm:w-auto" type="submit" disabled={loading}>
            {loading ? "保存中..." : mode === "create" ? "创建物料" : "保存修改"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
