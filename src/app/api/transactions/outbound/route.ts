import { getApiUserOrThrow } from "@/lib/auth/session";
import { jsonError, jsonOk, readRequestBody, AppError } from "@/lib/api";
import { performInventoryMovement } from "@/lib/services/inventory";

export async function POST(request: Request) {
  try {
    const user = await getApiUserOrThrow();
    const body = await readRequestBody(request);

    if (typeof body.itemId !== "string" || typeof body.sourceLocationId !== "string") {
      throw new AppError("缺少物料或来源地点", 400);
    }

    const transaction = await performInventoryMovement({
      user,
      transactionType: "OUTBOUND",
      itemId: body.itemId,
      sourceLocationId: body.sourceLocationId,
      quantity: Number(body.quantity),
      notes: typeof body.notes === "string" ? body.notes : undefined,
      sourceModule: "inventory-page",
      confirmed: body.confirmed === true || body.confirmed === "true"
    });

    return jsonOk(transaction, 201);
  } catch (error) {
    return jsonError(error);
  }
}
