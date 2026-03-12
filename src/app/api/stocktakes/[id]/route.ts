import { getApiUserOrThrow } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/api";
import { getStocktakeDetail } from "@/lib/services/queries";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await getApiUserOrThrow();
    const { id } = await context.params;
    const data = await getStocktakeDetail(user, id);
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}

