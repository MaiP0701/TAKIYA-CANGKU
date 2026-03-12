import Link from "next/link";
import { notFound } from "next/navigation";
import { LocationForm } from "@/components/forms/location-form";
import { assertAdmin } from "@/lib/auth/access";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export default async function LocationEditPage({ params }: RouteContext) {
  const user = await requireUser();
  assertAdmin(user);
  const { id } = await params;

  const location = await prisma.location.findUnique({
    where: {
      id
    }
  });

  if (!location) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-tea-700">
            Location Edit
          </div>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">编辑地点</h1>
        </div>
        <Link className="text-sm font-medium text-tea-700 hover:underline" href="/locations">
          返回地点列表
        </Link>
      </div>

      <LocationForm
        key={`${location.id}:${location.updatedAt.toISOString()}`}
        mode="update"
        location={{
          id: location.id,
          name: location.name,
          code: location.code,
          type: location.type,
          sortOrder: location.sortOrder,
          remark: location.remark,
          isActive: location.isActive
        }}
      />
    </div>
  );
}
