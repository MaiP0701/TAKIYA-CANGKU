import { getApiUserOrThrow } from "@/lib/auth/session";
import { jsonError, jsonOk, readRequestBody } from "@/lib/api";
import { updateUser } from "@/lib/services/inventory";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getApiUserOrThrow();
    const { id } = await context.params;
    const body = await readRequestBody(request);

    const updatedUser = await updateUser(user, id, {
      username: typeof body.username === "string" ? body.username : undefined,
      displayName: typeof body.displayName === "string" ? body.displayName : undefined,
      email: typeof body.email === "string" ? body.email : undefined,
      password: typeof body.password === "string" && body.password ? body.password : undefined,
      roleId: typeof body.roleId === "string" ? body.roleId : undefined,
      defaultLocationId:
        body.defaultLocationId === undefined
          ? undefined
          : typeof body.defaultLocationId === "string" && body.defaultLocationId !== ""
            ? body.defaultLocationId
            : null,
      isActive:
        body.isActive === undefined ? undefined : !(body.isActive === false || body.isActive === "false")
    });

    return jsonOk(updatedUser);
  } catch (error) {
    return jsonError(error);
  }
}
