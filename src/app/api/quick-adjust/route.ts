import { getApiUserOrThrow } from "@/lib/auth/session";
import { jsonError, jsonOk, readRequestBody } from "@/lib/api";
import { quickAdjustInventory } from "@/lib/services/inventory";

export async function POST(request: Request) {
  try {
    const user = await getApiUserOrThrow();
    const body = await readRequestBody(request);
    const transaction = await quickAdjustInventory({
      user,
      locationId: typeof body.locationId === "string" ? body.locationId : "",
      itemId: typeof body.itemId === "string" ? body.itemId : "",
      quantity: Number(body.quantity),
      operationType:
        body.operationType === "OUTBOUND" ||
        body.operationType === "DAMAGE" ||
        body.operationType === "ADJUSTMENT"
          ? body.operationType
          : "INBOUND",
      adjustmentDirection:
        body.adjustmentDirection === "DECREASE" ? "DECREASE" : "INCREASE",
      notes: typeof body.notes === "string" ? body.notes : undefined,
      confirmed: body.confirmed === true || body.confirmed === "true"
    });
    return jsonOk(transaction, 201);
  } catch (error) {
    return jsonError(error);
  }
}

