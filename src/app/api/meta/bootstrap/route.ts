import { getApiUserOrThrow } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/api";
import { getBootstrapData } from "@/lib/services/queries";

export async function GET() {
  try {
    const user = await getApiUserOrThrow();
    const data = await getBootstrapData(user);
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}

