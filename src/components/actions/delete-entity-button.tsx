"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fetchJson } from "@/lib/client-fetch";
import { Button } from "@/components/ui/button";

type DeleteEntityKind = "item" | "location" | "unit" | "user";

type DeleteResult = {
  action: "deleted" | "disabled_instead" | "blocked_due_to_relations";
  entityId: string;
  message: string;
};

type DeleteEntityButtonProps = {
  endpoint: string;
  entityName: string;
  kind: DeleteEntityKind;
  disabled?: boolean;
};

function getConfirmMessage(kind: DeleteEntityKind, entityName: string) {
  switch (kind) {
    case "location":
      return `确认删除地点“${entityName}”吗？如果该地点已有库存、流水、盘点或调拨记录，系统不会物理删除，而会自动改为停用。`;
    case "item":
      return `确认删除物料“${entityName}”吗？如果该物料已有库存、流水、盘点或调拨记录，系统不会物理删除，而会自动改为停用。`;
    case "unit":
      return `确认删除单位“${entityName}”吗？如果该单位已被物料或历史业务数据使用，系统会阻止删除。`;
    case "user":
      return `确认删除用户“${entityName}”吗？如果该用户已有库存操作、盘点、调拨或日志记录，系统不会物理删除，而会自动停用并禁止登录。`;
    default:
      return `确认删除“${entityName}”吗？`;
  }
}

export function DeleteEntityButton({
  endpoint,
  entityName,
  kind,
  disabled
}: DeleteEntityButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(getConfirmMessage(kind, entityName));

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const result = await fetchJson<DeleteResult>(endpoint, {
        method: "DELETE"
      });

      window.alert(result.message);

      if (result.action !== "blocked_due_to_relations") {
        router.refresh();
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "删除失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button disabled={disabled || loading} onClick={handleDelete} size="sm" variant="danger">
      {loading ? "处理中..." : "删除"}
    </Button>
  );
}
