import Link from "next/link";
import { UserForm } from "@/components/forms/user-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { assertAdmin } from "@/lib/auth/access";
import { requireUser } from "@/lib/auth/session";
import { getBootstrapData, getUsers } from "@/lib/services/queries";

export default async function UsersPage() {
  const user = await requireUser();
  assertAdmin(user);

  const [bootstrap, users] = await Promise.all([getBootstrapData(user), getUsers(user)]);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/70 bg-white/60 p-6 shadow-panel">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-tea-700">
          Users
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900">用户管理</h1>
        <p className="mt-2 text-sm text-stone-600">
          管理管理员、店员和仓库人员账号及默认地点。
        </p>
      </section>

      <UserForm
        roles={bootstrap.roles.map((role) => ({
          id: role.id,
          name: role.name
        }))}
        locations={bootstrap.locations.map((location) => ({
          id: location.id,
          name: location.name
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
          <CardDescription>共 {users.length} 个账号</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200/70 text-stone-500">
                <th className="pb-3 pr-4 font-medium">用户名</th>
                <th className="pb-3 pr-4 font-medium">显示名称</th>
                <th className="pb-3 pr-4 font-medium">角色</th>
                <th className="pb-3 pr-4 font-medium">所属地点</th>
                <th className="pb-3 pr-4 font-medium">状态</th>
                <th className="pb-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((record) => (
                <tr key={record.id} className="border-b border-stone-100 text-stone-700">
                  <td className="py-4 pr-4 font-medium">{record.username}</td>
                  <td className="py-4 pr-4">{record.displayName}</td>
                  <td className="py-4 pr-4">{record.roleName}</td>
                  <td className="py-4 pr-4">{record.defaultLocationName ?? "-"}</td>
                  <td className="py-4 pr-4">
                    <Badge variant={record.isActive ? "success" : "muted"}>
                      {record.isActive ? "启用" : "停用"}
                    </Badge>
                  </td>
                  <td className="py-4">
                    <Link className="text-tea-700 underline-offset-4 hover:underline" href={`/users/${record.id}`}>
                      编辑
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

