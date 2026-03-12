import { prisma } from "@/lib/db/prisma";
import { getApiUserOrThrow } from "@/lib/auth/session";
import { jsonError, jsonOk, readRequestBody, AppError } from "@/lib/api";
import { revalidateInventoryViews, revalidateManagedResource } from "@/lib/revalidate-paths";
import { deleteItem, updateItem } from "@/lib/services/inventory";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await getApiUserOrThrow();
    const { id } = await context.params;
    const item = await prisma.item.findUnique({
      where: {
        id
      },
      include: {
        category: true,
        baseUnit: true
      }
    });

    if (!item) {
      throw new AppError("物料不存在", 404);
    }

    return jsonOk({
      id: item.id,
      sku: item.sku,
      name: item.name,
      categoryId: item.categoryId,
      categoryName: item.category.name,
      baseUnitId: item.baseUnitId,
      baseUnitName: item.baseUnit.name,
      specification: item.specification,
      safetyStock: Number(item.safetyStock),
      alertEnabled: item.alertEnabled,
      brand: item.brand,
      supplierName: item.supplierName,
      shelfLifeDays: item.shelfLifeDays,
      imageUrl: item.imageUrl,
      notes: item.notes,
      isActive: item.isActive
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getApiUserOrThrow();
    const { id } = await context.params;
    const body = await readRequestBody(request);
    const item = await updateItem(user, id, {
      sku: typeof body.sku === "string" ? body.sku : undefined,
      name: typeof body.name === "string" ? body.name : undefined,
      categoryId: typeof body.categoryId === "string" ? body.categoryId : undefined,
      baseUnitId: typeof body.baseUnitId === "string" ? body.baseUnitId : undefined,
      specification: typeof body.specification === "string" ? body.specification : undefined,
      safetyStock:
        body.safetyStock !== undefined && body.safetyStock !== null && body.safetyStock !== ""
          ? Number(body.safetyStock)
          : undefined,
      brand: typeof body.brand === "string" ? body.brand : undefined,
      supplierName: typeof body.supplierName === "string" ? body.supplierName : undefined,
      shelfLifeDays:
        body.shelfLifeDays !== undefined && body.shelfLifeDays !== null && body.shelfLifeDays !== ""
          ? Number(body.shelfLifeDays)
          : undefined,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      alertEnabled:
        body.alertEnabled === undefined
          ? undefined
          : !(body.alertEnabled === false || body.alertEnabled === "false"),
      isActive:
        body.isActive === undefined ? undefined : !(body.isActive === false || body.isActive === "false")
    });
    revalidateManagedResource("items", id);
    return jsonOk(item);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await getApiUserOrThrow();
    const { id } = await context.params;
    const result = await deleteItem(user, id);
    revalidateManagedResource("items", id);
    revalidateInventoryViews();
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
