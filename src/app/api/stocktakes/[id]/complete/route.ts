import { getApiUserOrThrow } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/api";
import { completeStocktake } from "@/lib/services/inventory";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await getApiUserOrThrow();
    const { id } = await context.params;
    const stocktake = await completeStocktake(user, id);
    return jsonOk(stocktake);
  } catch (error) {
    return jsonError(error);
  }
}

