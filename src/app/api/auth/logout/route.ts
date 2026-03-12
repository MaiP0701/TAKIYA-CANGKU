import { destroySession } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/api";

export async function POST() {
  try {
    await destroySession();
    return jsonOk({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}

