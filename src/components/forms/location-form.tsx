"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fetchJson } from "@/lib/client-fetch";

type LocationFormProps = {
  mode?: "create" | "update";
  location?: {
    id: string;
    name: string;
    code: string;
    type: "STORE" | "WAREHOUSE" | "OTHER";
    sortOrder: number;
    remark: string | null;
    isActive: boolean;
  };
};

function buildLocationFormState(location: LocationFormProps["location"]) {
  return {
    name: location?.name ?? "",
    code: location?.code ?? "",
    type: location?.type ?? "STORE",
    sortOrder: String(location?.sortOrder ?? 0),
    remark: location?.remark ?? "",
    isActive: location?.isActive ?? true
  };
}

export function LocationForm({ mode = "create", location }: LocationFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(() => buildLocationFormState(location));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "update") {
      return;
    }

    setForm(buildLocationFormState(location));
    setError(null);
    setMessage(null);
  }, [location, mode]);

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
        throw new Error("地点名称不能为空");
      }

      const sortOrder = Number(form.sortOrder);
      if (!Number.isInteger(sortOrder) || sortOrder < 0) {
        throw new Error("排序必须是大于等于 0 的整数");
      }

      await fetchJson(mode === "create" ? "/api/locations" : `/api/locations/${location?.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          sortOrder
        })
      });

      if (mode === "update") {
        setMessage("地点已保存，正在同步最新数据...");
        router.refresh();
        return;
      } else {
        setMessage("地点已创建");
        router.refresh();
        setForm(buildLocationFormState(undefined));
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
        <CardTitle>{mode === "create" ? "新增地点" : "编辑地点"}</CardTitle>
        <CardDescription>停用地点不会删除历史数据，但不能参与新的库存操作。</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">地点名称</label>
              <Input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="例如：神田店"
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

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">地点类型</label>
              <Select value={form.type} onChange={(event) => updateField("type", event.target.value as typeof form.type)}>
                <option value="STORE">门店</option>
                <option value="WAREHOUSE">仓库</option>
                <option value="OTHER">其他</option>
              </Select>
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
              placeholder="例如：离神田店最近的总仓"
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
            {loading ? "保存中..." : mode === "create" ? "创建地点" : "保存地点"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
