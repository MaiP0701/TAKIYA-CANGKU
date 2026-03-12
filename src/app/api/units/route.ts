import { getAdminApiUserOrThrow } from "@/lib/auth/session";
import { jsonError, jsonOk, readRequestBody } from "@/lib/api";
import { revalidateInventoryViews, revalidateManagedResource } from "@/lib/revalidate-paths";
import { createUnit } from "@/lib/services/inventory";
import { getUnits } from "@/lib/services/queries";

export async function GET(request: Request) {
  try {
    const user = await getAdminApiUserOrThrow();
    const { searchParams } = new URL(request.url);
    const data = await getUnits(user, {
      query: searchParams.get("query") ?? undefined,
      active: searchParams.get("active") ?? undefined
    });
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAdminApiUserOrThrow();
    const body = await readRequestBody(request);
    const unit = await createUnit(user, {
      name: typeof body.name === "string" ? body.name : "",
      code: typeof body.code === "string" ? body.code : undefined,
      symbol: typeof body.symbol === "string" ? body.symbol : undefined,
      precision:
        body.precision !== undefined && body.precision !== null && body.precision !== ""
          ? Number(body.precision)
          : 0,
      sortOrder:
        body.sortOrder !== undefined && body.sortOrder !== null && body.sortOrder !== ""
          ? Number(body.sortOrder)
          : 0,
      remark: typeof body.remark === "string" ? body.remark : undefined,
      isActive: !(body.isActive === false || body.isActive === "false")
    });
    revalidateManagedResource("units", unit.id);
    revalidateManagedResource("items");
    revalidateInventoryViews();
    return jsonOk(unit, 201);
  } catch (error) {
    return jsonError(error);
  }
}
