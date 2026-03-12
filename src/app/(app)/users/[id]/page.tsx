import Link from "next/link";
import { notFound } from "next/navigation";
import { UserForm } from "@/components/forms/user-form";
import { assertAdmin } from "@/lib/auth/access";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getBootstrapData } from "@/lib/services/queries";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export default async function UserEditPage({ params }: RouteContext) {
  const user = await requireUser();
  assertAdmin(user);

  const { id } = await params;
  const [bootstrap, record] = await Promise.all([
    getBootstrapData(user, {
      includeCategories: false,
      includeUnits: false,
      includeRoles: true
    }),
    prisma.user.findUnique({
      where: {
        id
      },
      include: {
        defaultLocation: true
      }
    })
  ]);

  if (!record) {
    notFound();
  }

  const locationOptions = [...bootstrap.locations];
  if (
    record.defaultLocation &&
    !locationOptions.some((location) => location.id === record.defaultLocationId)
  ) {
    locationOptions.push({
      id: record.defaultLocation.id,
      code: record.defaultLocation.code,
      name: `${record.defaultLocation.name}（已停用）`,
      type: record.defaultLocation.type,
      typeLabel:
  record.defaultLocation.type === "STORE"
    ? "门店"
    : record.defaultLocation.type === "WAREHOUSE"
      ? "仓库"
      : "其他",
      isActive: record.defaultLocation.isActive
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-tea-700">
          User Edit
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-stone-900">编辑用户</h1>
          <Link className="text-sm font-medium text-tea-700 hover:underline" href="/users">
            返回用户列表
          </Link>
        </div>
      </div>

      <UserForm
        mode="update"
        user={{
          id: record.id,
          username: record.username,
          email: record.email,
          displayName: record.displayName,
          roleId: record.roleId,
          defaultLocationId: record.defaultLocationId,
          isActive: record.isActive
        }}
        roles={bootstrap.roles.map((role) => ({
          id: role.id,
          name: role.name
        }))}
        locations={locationOptions.map((location) => ({
          id: location.id,
          name: location.name
        }))}
      />
    </div>
  );
}
