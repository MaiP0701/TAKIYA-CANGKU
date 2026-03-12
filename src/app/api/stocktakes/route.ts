import { getApiUserOrThrow } from "@/lib/auth/session";
import { jsonError, jsonOk, readRequestBody, AppError } from "@/lib/api";
import { createStocktake } from "@/lib/services/inventory";
import { getStocktakes } from "@/lib/services/queries";

function parseLines(raw: unknown) {
  let parsed: unknown;

  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    throw new AppError("盘点明细格式错误", 400);
  }

  if (!Array.isArray(parsed)) {
    throw new AppError("盘点明细格式错误", 400);
  }

  return parsed.map((line) => ({
    itemId: typeof line.itemId === "string" ? line.itemId : "",
    countedQuantity: Number(line.countedQuantity),
    notes: typeof line.notes === "string" ? line.notes : undefined
  }));
}


export async function GET(request: Request) {
  try {
    const user = await getApiUserOrThrow();
    const { searchParams } = new URL(request.url);
    const data = await getStocktakes(user, searchParams.get("locationId") ?? undefined);
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUserOrThrow();
    const body = await readRequestBody(request);

    if (typeof body.locationId !== "string") {
      throw new AppError("缺少盘点地点", 400);
    }

    const stocktake = await createStocktake(user, {
      locationId: body.locationId,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      lines: parseLines(body.lines)
    });

    return jsonOk(stocktake, 201);
  } catch (error) {
    return jsonError(error);
  }
}
