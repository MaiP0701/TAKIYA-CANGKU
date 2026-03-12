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

type MovementFormProps = {
  title: string;
  description: string;
  endpoint: string;
  mode: "inbound" | "outbound" | "damage";
  items: Option[];
  locations: Option[];
  defaultLocationId?: string | null;
};

export function MovementForm({
  title,
  description,
  endpoint,
  mode,
  items,
  locations,
  defaultLocationId
}: MovementFormProps) {
  const router = useRouter();
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [locationId, setLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!itemId || !locationId) {
        throw new Error("请选择物料和地点");
      }

      const parsedQuantity = Number(quantity);
      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        throw new Error("请输入合法数量");
      }

      if ((mode === "damage" || parsedQuantity >= LARGE_ADJUSTMENT_THRESHOLD) && notes.trim().length === 0) {
        throw new Error("当前操作必须填写备注");
      }

      const confirmed =
        parsedQuantity >= LARGE_ADJUSTMENT_THRESHOLD
          ? window.confirm(`本次操作数量达到 ${LARGE_ADJUSTMENT_THRESHOLD} 以上，确认继续提交吗？`)
          : true;

      if (!confirmed) {
        setLoading(false);
        return;
      }

      await fetchJson(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          itemId,
          quantity: parsedQuantity,
          notes,
          confirmed,
          ...(mode === "inbound"
            ? { targetLocationId: locationId }
            : { sourceLocationId: locationId })
        })
      });

      setQuantity("");
      setNotes("");
      setMessage("操作已提交");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">
              {mode === "inbound" ? "目标地点" : "来源地点"}
            </label>
            <Select value={locationId} onChange={(event) => setLocationId(event.target.value)}>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">数量</label>
            <Input
              min="0"
              step="0.001"
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="请输入数量"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">备注</label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="可选填写操作说明"
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

          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "提交中..." : title}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
