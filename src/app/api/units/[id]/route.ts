import { prisma } from "@/lib/db/prisma";
import { getApiUserOrThrow } from "@/lib/auth/session";
import { jsonError, jsonOk, readRequestBody, AppError } from "@/lib/api";
import { revalidateManagedResource } from "@/lib/revalidate-paths";
import { deleteUnit, updateUnit } from "@/lib/services/inventory";
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
    const unit = await prisma.unit.findUnique({
      where: {
        id
      }
    });

    if (!unit) {
      throw new AppError("单位不存在", 404);
    }

    return jsonOk(unit);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getApiUserOrThrow();
    const { id } = await context.params;
    const body = await readRequestBody(request);
    const unit = await updateUnit(user, id, {
      name: typeof body.name === "string" ? body.name : undefined,
      code: typeof body.code === "string" ? body.code : undefined,
      symbol: typeof body.symbol === "string" ? body.symbol : undefined,
      precision:
        body.precision !== undefined && body.precision !== null && body.precision !== ""
          ? Number(body.precision)
          : undefined,
      sortOrder:
        body.sortOrder !== undefined && body.sortOrder !== null && body.sortOrder !== ""
          ? Number(body.sortOrder)
          : undefined,
      remark: typeof body.remark === "string" ? body.remark : undefined,
      isActive:
        body.isActive === undefined ? undefined : !(body.isActive === false || body.isActive === "false")
    });
    revalidateManagedResource("units", id);
    return jsonOk(unit);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await getApiUserOrThrow();
    const { id } = await context.params;
    const result = await deleteUnit(user, id);
    revalidateManagedResource("units", id);
    revalidateManagedResource("items");
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
