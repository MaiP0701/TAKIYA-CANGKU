import { getApiUserOrThrow } from "@/lib/auth/session";
import { jsonError, jsonOk, readRequestBody } from "@/lib/api";
import { createItem } from "@/lib/services/inventory";
import { getItems } from "@/lib/services/queries";

export async function GET(request: Request) {
  try {
    await getApiUserOrThrow();
    const { searchParams } = new URL(request.url);
    const data = await getItems({
      query: searchParams.get("query") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      active: searchParams.get("active") ?? undefined
    });
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUserOrThrow();
    const body = await readRequestBody(request);
    const item = await createItem(user, {
      sku: typeof body.sku === "string" ? body.sku : undefined,
      name: typeof body.name === "string" ? body.name : "",
      categoryId: typeof body.categoryId === "string" ? body.categoryId : "",
      baseUnitId: typeof body.baseUnitId === "string" ? body.baseUnitId : "",
      specification: typeof body.specification === "string" ? body.specification : undefined,
      safetyStock:
        body.safetyStock !== undefined && body.safetyStock !== null && body.safetyStock !== ""
          ? Number(body.safetyStock)
          : 0,
      brand: typeof body.brand === "string" ? body.brand : undefined,
      supplierName: typeof body.supplierName === "string" ? body.supplierName : undefined,
      shelfLifeDays:
        body.shelfLifeDays !== undefined && body.shelfLifeDays !== null && body.shelfLifeDays !== ""
          ? Number(body.shelfLifeDays)
          : null,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      alertEnabled: !(body.alertEnabled === false || body.alertEnabled === "false"),
      isActive: body.isActive === false || body.isActive === "false" ? false : true
    });
    return jsonOk(item, 201);
  } catch (error) {
    return jsonError(error);
  }
}
