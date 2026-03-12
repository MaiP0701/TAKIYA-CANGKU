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

    const rawQuery = searchParams.get("query") ?? "";
    const query = rawQuery.trim() || undefined;
    const [results, recentItems] = await Promise.all([
      searchQuickAdjustItems(user, {
        locationId,
        query,
        limit: query ? 12 : 8
      }),
      query ? Promise.resolve([]) : getQuickAdjustRecentItems(user, locationId, 8)
    ]);

    return jsonOk({
      results,
      recentItems
    });
  } catch (error) {
    return jsonError(error);
  }
}
