import { getApiUserOrThrow } from "@/lib/auth/session";
import { jsonError, jsonOk, AppError } from "@/lib/api";
import { getQuickAdjustRecentItems, searchQuickAdjustItems } from "@/lib/services/queries";

export async function GET(request: Request) {
  try {
    const user = await getApiUserOrThrow();
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");

    if (!locationId) {
      throw new AppError("请选择地点", 400);
    }

    const query = searchParams.get("query") ?? undefined;
    const [results, recentItems] = await Promise.all([
      searchQuickAdjustItems(user, {
        locationId,
        query,
        limit: query ? 20 : 12
      }),
      getQuickAdjustRecentItems(user, locationId)
    ]);

    return jsonOk({
      results,
      recentItems
    });
  } catch (error) {
    return jsonError(error);
  }
}

