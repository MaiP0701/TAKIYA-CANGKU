import { getApiUserOrThrow } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/api";
import { getAlertList } from "@/lib/services/queries";

export async function GET(request: Request) {
  try {
    const user = await getApiUserOrThrow();
    const { searchParams } = new URL(request.url);
    const data = await getAlertList(user, searchParams.get("locationId") ?? undefined);
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}

