import { getApiUserOrThrow } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/api";
import { getInventoryList } from "@/lib/services/queries";

export async function GET(request: Request) {
  try {
    const user = await getApiUserOrThrow();
    const { searchParams } = new URL(request.url);
    const data = await getInventoryList(user, {
      query: searchParams.get("query") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      locationId: searchParams.get("locationId") ?? undefined,
      lowStock: searchParams.get("lowStock") ?? undefined
    });
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}

