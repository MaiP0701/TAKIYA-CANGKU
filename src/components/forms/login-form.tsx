"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      const payload = await response.json();

      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error?.message ?? "登录失败");
      }

      router.replace("/");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-tea-700">
          Inventory MVP
        </div>
        <CardTitle className="text-2xl">登录系统</CardTitle>
        <CardDescription>
          默认种子账号已填入，可直接进入查看。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">用户名</label>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="请输入用户名"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">密码</label>
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="请输入密码"
              type="password"
            />
          </div>

          {error ? (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "登录中..." : "进入系统"}
          </Button>
        </form>

        <div className="mt-6 rounded-2xl bg-stone-100/70 p-4 text-sm text-stone-600">
          <p>可用账号：</p>
          <p className="mt-2">管理员：`admin / Admin123!`</p>
          <p>店员：`kanda / Store123!`</p>
          <p>仓库：`warehouse / Warehouse123!`</p>
        </div>
      </CardContent>
    </Card>
  );
}
