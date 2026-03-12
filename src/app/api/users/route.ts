import { getAdminApiUserOrThrow } from "@/lib/auth/session";
import { jsonError, jsonOk, readRequestBody } from "@/lib/api";
import { revalidateManagedResource } from "@/lib/revalidate-paths";
import { createUser } from "@/lib/services/inventory";
import { getUsers } from "@/lib/services/queries";

export async function GET() {
  try {
    const user = await getAdminApiUserOrThrow();
    const data = await getUsers(user);
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAdminApiUserOrThrow();
    const body = await readRequestBody(request);

    const createdUser = await createUser(user, {
      username: typeof body.username === "string" ? body.username : "",
      displayName: typeof body.displayName === "string" ? body.displayName : "",
      email: typeof body.email === "string" ? body.email : undefined,
      password: typeof body.password === "string" ? body.password : "",
      roleId: typeof body.roleId === "string" ? body.roleId : "",
      defaultLocationId:
        typeof body.defaultLocationId === "string" && body.defaultLocationId !== ""
          ? body.defaultLocationId
          : null,
      isActive: body.isActive === false || body.isActive === "false" ? false : true
    });

    revalidateManagedResource("users", createdUser.id);
    return jsonOk(createdUser, 201);
  } catch (error) {
    return jsonError(error);
  }
}
