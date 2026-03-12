"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fetchJson } from "@/lib/client-fetch";

type UnitFormProps = {
  mode?: "create" | "update";
  unit?: {
    id: string;
    name: string;
    code: string;
    symbol: string | null;
    precision: number;
    sortOrder: number;
    remark: string | null;
    isActive: boolean;
  };
};

function buildUnitFormState(unit: UnitFormProps["unit"]) {
  return {
    name: unit?.name ?? "",
    code: unit?.code ?? "",
    symbol: unit?.symbol ?? "",
    precision: String(unit?.precision ?? 0),
    sortOrder: String(unit?.sortOrder ?? 0),
    remark: unit?.remark ?? "",
    isActive: unit?.isActive ?? true
  };
}

export function UnitForm({ mode = "create", unit }: UnitFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(() => buildUnitFormState(unit));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "update") {
      return;
    }

    setForm(buildUnitFormState(unit));
    setError(null);
    setMessage(null);
  }, [mode, unit]);

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
        throw new Error("单位名称不能为空");
      }

      const precision = Number(form.precision);
      const sortOrder = Number(form.sortOrder);

      if (!Number.isInteger(precision) || precision < 0 || precision > 6) {
        throw new Error("单位精度必须是 0 到 6 之间的整数");
      }

      if (!Number.isInteger(sortOrder) || sortOrder < 0) {
        throw new Error("排序必须是大于等于 0 的整数");
      }

      await fetchJson(mode === "create" ? "/api/units" : `/api/units/${unit?.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          precision,
          sortOrder
        })
      });

      if (mode === "update") {
        window.location.assign("/units");
        return;
      } else {
        setMessage("单位已创建");
        router.refresh();
        setForm(buildUnitFormState(undefined));
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
        <CardTitle>{mode === "create" ? "新增单位" : "编辑单位"}</CardTitle>
        <CardDescription>停用单位不会影响历史数据，但不能继续分配给新物料。</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">单位名称</label>
              <Input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="例如：千克"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">编码</label>
              <Input
                value={form.code}
                onChange={(event) => updateField("code", event.target.value)}
                placeholder="留空可自动生成"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">简称 / 符号</label>
              <Input
                value={form.symbol}
                onChange={(event) => updateField("symbol", event.target.value)}
                placeholder="kg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">精度</label>
              <Input
                type="number"
                min="0"
                max="6"
                value={form.precision}
                onChange={(event) => updateField("precision", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">排序</label>
              <Input
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(event) => updateField("sortOrder", event.target.value)}
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">备注</label>
            <Textarea
              value={form.remark}
              onChange={(event) => updateField("remark", event.target.value)}
              placeholder="例如：常用于液体原料"
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

          <Button type="submit" disabled={loading}>
            {loading ? "保存中..." : mode === "create" ? "创建单位" : "保存单位"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
