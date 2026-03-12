import { getApiUserOrThrow } from "@/lib/auth/session";
import { jsonError, jsonOk, readRequestBody, AppError } from "@/lib/api";
import { revalidateInventoryViews } from "@/lib/revalidate-paths";
import { performInventoryMovement } from "@/lib/services/inventory";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  try {
    const user = await getApiUserOrThrow();
    const body = await readRequestBody(request);

    if (
      typeof body.itemId !== "string" ||
      typeof body.sourceLocationId !== "string" ||
      typeof body.targetLocationId !== "string"
    ) {
      throw new AppError("调拨缺少必要参数", 400);
    }

    const locations = await prisma.location.findMany({
      where: {
        id: {
          in: [body.sourceLocationId, body.targetLocationId]
        }
      }
    });

    const isWarehouseTransfer = locations.some((location) => location.type === "WAREHOUSE");

    const transaction = await performInventoryMovement({
      user,
      transactionType: isWarehouseTransfer ? "WAREHOUSE_TRANSFER" : "STORE_TRANSFER",
      itemId: body.itemId,
      sourceLocationId: body.sourceLocationId,
      targetLocationId: body.targetLocationId,
      quantity: Number(body.quantity),
      notes: typeof body.notes === "string" ? body.notes : undefined,
      sourceModule: "transfer",
      confirmed: body.confirmed === true || body.confirmed === "true"
    });

    revalidateInventoryViews();
    return jsonOk(transaction, 201);
  } catch (error) {
    return jsonError(error);
  }
}
