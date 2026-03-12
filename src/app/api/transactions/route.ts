import { getApiUserOrThrow } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/api";
import { getTransactions } from "@/lib/services/queries";

export async function GET(request: Request) {
  try {
    const user = await getApiUserOrThrow();
    const { searchParams } = new URL(request.url);
    const data = await getTransactions(user, {
      query: searchParams.get("query") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      locationId: searchParams.get("locationId") ?? undefined,
      operatorId: searchParams.get("operatorId") ?? undefined,
      sourceModule: searchParams.get("sourceModule") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined
    });
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
