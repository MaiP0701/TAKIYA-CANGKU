import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemForm } from "@/components/forms/item-form";
import { requireAdminUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getBootstrapData } from "@/lib/services/queries";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ItemEditPage({ params }: RouteContext) {
  const user = await requireAdminUser();

  const { id } = await params;
  const [bootstrap, item] = await Promise.all([
    getBootstrapData(user),
    prisma.item.findUnique({
      where: {
        id
      },
      include: {
        category: true,
        baseUnit: true
      }
    })
  ]);

  if (!item) {
    notFound();
  }

  const categoryOptions = [...bootstrap.categories];
  if (!categoryOptions.some((category) => category.id === item.categoryId)) {
    categoryOptions.push({
      id: item.categoryId,
      code: item.category.code,
      name: `${item.category.name}（已停用）`
    });
  }

  const unitOptions = [...bootstrap.units];
  if (!unitOptions.some((unit) => unit.id === item.baseUnitId)) {
    unitOptions.push({
      id: item.baseUnitId,
      code: item.baseUnit.code,
      name: `${item.baseUnit.name}（已停用）`,
      symbol: item.baseUnit.symbol,
      precision: item.baseUnit.precision
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-tea-700">
            Item Edit
          </div>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">编辑物料</h1>
        </div>
        <Link className="text-sm font-medium text-tea-700 hover:underline" href="/items">
          返回物料列表
        </Link>
      </div>

      <ItemForm
        key={`${item.id}:${item.updatedAt.toISOString()}`}
        mode="update"
        item={{
          id: item.id,
          sku: item.sku,
          name: item.name,
          categoryId: item.categoryId,
          baseUnitId: item.baseUnitId,
          specification: item.specification,
          safetyStock: Number(item.safetyStock),
          alertEnabled: item.alertEnabled,
          brand: item.brand,
          supplierName: item.supplierName,
          shelfLifeDays: item.shelfLifeDays,
          imageUrl: item.imageUrl,
          notes: item.notes,
          isActive: item.isActive
        }}
        categories={categoryOptions.map((category) => ({
          id: category.id,
          name: category.name
        }))}
        units={unitOptions.map((unit) => ({
          id: unit.id,
          name: unit.name
        }))}
      />
    </div>
  );
}
