import { getAdminApiUserOrThrow } from "@/lib/auth/session";
import { jsonError, jsonOk, readRequestBody } from "@/lib/api";
import { revalidateInventoryViews, revalidateManagedResource } from "@/lib/revalidate-paths";
import { createLocation } from "@/lib/services/inventory";
import { getLocations } from "@/lib/services/queries";

export async function GET(request: Request) {
  try {
    const user = await getAdminApiUserOrThrow();
    const { searchParams } = new URL(request.url);
    const data = await getLocations(user, {
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
    const location = await createLocation(user, {
      name: typeof body.name === "string" ? body.name : "",
      code: typeof body.code === "string" ? body.code : undefined,
      type:
        body.type === "WAREHOUSE" || body.type === "OTHER" ? body.type : "STORE",
      sortOrder:
        body.sortOrder !== undefined && body.sortOrder !== null && body.sortOrder !== ""
          ? Number(body.sortOrder)
          : 0,
      remark: typeof body.remark === "string" ? body.remark : undefined,
      isActive: !(body.isActive === false || body.isActive === "false")
    });
    revalidateManagedResource("locations", location.id);
    revalidateManagedResource("users");
    revalidateInventoryViews();
    return jsonOk(location, 201);
  } catch (error) {
    return jsonError(error);
  }
}
