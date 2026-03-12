"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { fetchJson } from "@/lib/client-fetch";

type Option = {
  id: string;
  name: string;
};

type UserFormProps = {
  roles: Option[];
  locations: Option[];
  mode?: "create" | "update";
  user?: {
    id: string;
    username: string;
    email: string | null;
    displayName: string;
    roleId: string;
    defaultLocationId: string | null;
    isActive: boolean;
  };
};

function buildUserFormState(
  user: UserFormProps["user"],
  roles: Option[],
  locations: Option[]
) {
  return {
    username: user?.username ?? "",
    email: user?.email ?? "",
    displayName: user?.displayName ?? "",
    password: "",
    roleId: user?.roleId ?? roles[0]?.id ?? "",
    defaultLocationId:
      user?.defaultLocationId ??
      (locations.some((location) => location.id === user?.defaultLocationId) ? user?.defaultLocationId : "") ??
      "",
    isActive: user?.isActive ?? true
  };
}

export function UserForm({
  roles,
  locations,
  mode = "create",
  user
}: UserFormProps) {
  const router = useRouter();
  const hasRoles = roles.length > 0;
  const [form, setForm] = useState(() => buildUserFormState(user, roles, locations));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "update") {
      return;
    }

    setForm(buildUserFormState(user, roles, locations));
    setError(null);
    setMessage(null);
  }, [locations, mode, roles, user]);

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
      if (form.username.trim().length === 0 || form.displayName.trim().length === 0) {
        throw new Error("用户名和显示名称不能为空");
      }

      if (!hasRoles) {
        throw new Error("当前没有可用角色，请先检查角色基础资料");
      }

      if (!form.roleId) {
        throw new Error("请选择角色");
      }

      if (mode === "create" && form.password.trim().length === 0) {
        throw new Error("创建用户时必须填写密码");
      }

      const endpoint = mode === "create" ? "/api/users" : `/api/users/${user?.id}`;
      await fetchJson(endpoint, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          defaultLocationId: form.defaultLocationId || null
        })
      });

      if (mode === "update") {
        setMessage("用户已保存，正在同步最新数据...");
        router.refresh();
        return;
      } else {
        setMessage("用户已创建");
        router.refresh();
        setForm(buildUserFormState(undefined, roles, locations));
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
        <CardTitle>{mode === "create" ? "新增用户" : "编辑用户"}</CardTitle>
        <CardDescription>第一版仅提供基础角色和所属地点绑定</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">用户名</label>
              <Input
                value={form.username}
                onChange={(event) => updateField("username", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">显示名称</label>
              <Input
                value={form.displayName}
                onChange={(event) => updateField("displayName", event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">邮箱</label>
              <Input
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">
                {mode === "create" ? "密码" : "新密码（留空则不修改）"}
              </label>
              <Input
                type="password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">角色</label>
              <Select
                disabled={!hasRoles}
                value={form.roleId}
                onChange={(event) => updateField("roleId", event.target.value)}
              >
                <option value="" disabled>
                  {hasRoles ? "请选择角色" : "暂无可用角色"}
                </option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">所属地点</label>
              <Select
                value={form.defaultLocationId}
                onChange={(event) => updateField("defaultLocationId", event.target.value)}
              >
                <option value="">未指定</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </Select>
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

          {error ? (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}
          {!hasRoles ? (
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              当前没有可用角色，无法创建或编辑用户。请先检查角色基础资料是否已初始化。
            </div>
          ) : null}
          {message ? (
            <div className="rounded-2xl bg-jade-50 px-4 py-3 text-sm text-jade-800">
              {message}
            </div>
          ) : null}

          <Button className="w-full sm:w-auto" type="submit" disabled={loading || !hasRoles}>
            {loading ? "保存中..." : mode === "create" ? "创建用户" : "保存用户"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
