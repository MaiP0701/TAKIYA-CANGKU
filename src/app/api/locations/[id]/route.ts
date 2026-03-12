import { prisma } from "@/lib/db/prisma";
import { getApiUserOrThrow } from "@/lib/auth/session";
import { jsonError, jsonOk, readRequestBody, AppError } from "@/lib/api";
import { revalidateInventoryViews, revalidateManagedResource } from "@/lib/revalidate-paths";
import { deleteLocation, updateLocation } from "@/lib/services/inventory";
import { assertAdmin } from "@/lib/auth/access";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await getApiUserOrThrow();
    assertAdmin(user);
    const { id } = await context.params;
    const location = await prisma.location.findUnique({
      where: {
        id
      }
    });

    if (!location) {
      throw new AppError("地点不存在", 404);
    }

    return jsonOk(location);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getApiUserOrThrow();
    const { id } = await context.params;
    const body = await readRequestBody(request);
    const location = await updateLocation(user, id, {
      name: typeof body.name === "string" ? body.name : undefined,
      code: typeof body.code === "string" ? body.code : undefined,
      type:
        body.type === "STORE" || body.type === "WAREHOUSE" || body.type === "OTHER"
          ? body.type
          : undefined,
      sortOrder:
        body.sortOrder !== undefined && body.sortOrder !== null && body.sortOrder !== ""
          ? Number(body.sortOrder)
          : undefined,
      remark: typeof body.remark === "string" ? body.remark : undefined,
      isActive:
        body.isActive === undefined ? undefined : !(body.isActive === false || body.isActive === "false")
    });
    revalidateManagedResource("locations", id);
    return jsonOk(location);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await getApiUserOrThrow();
    const { id } = await context.params;
    const result = await deleteLocation(user, id);
    revalidateManagedResource("locations", id);
    revalidateManagedResource("users");
    revalidateInventoryViews();
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
