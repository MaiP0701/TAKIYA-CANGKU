import Link from "next/link";
import { notFound } from "next/navigation";
import { UnitForm } from "@/components/forms/unit-form";
import { requireAdminUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export default async function UnitEditPage({ params }: RouteContext) {
  await requireAdminUser();
  const { id } = await params;

  const unit = await prisma.unit.findUnique({
    where: {
      id
    }
  });

  if (!unit) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-tea-700">
            Unit Edit
          </div>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">编辑单位</h1>
        </div>
        <Link className="text-sm font-medium text-tea-700 hover:underline" href="/units">
          返回单位列表
        </Link>
      </div>

      <UnitForm
        key={`${unit.id}:${unit.updatedAt.toISOString()}`}
        mode="update"
        unit={{
          id: unit.id,
          name: unit.name,
          code: unit.code,
          symbol: unit.symbol,
          precision: unit.precision,
          sortOrder: unit.sortOrder,
          remark: unit.remark,
          isActive: unit.isActive
        }}
      />
    </div>
  );
}
