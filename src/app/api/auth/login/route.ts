import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, readRequestBody, AppError } from "@/lib/api";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";

export async function POST(request: Request) {
  try {
    const body = await readRequestBody(request);
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      throw new AppError("用户名和密码不能为空", 400);
    }

    const user = await prisma.user.findUnique({
      where: {
        username
      },
      include: {
        role: true,
        defaultLocation: true
      }
    });

    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      throw new AppError("用户名或密码错误", 401);
    }

    await createSession(user.id);

    return jsonOk({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: {
        code: user.role.code,
        name: user.role.name
      },
      defaultLocation: user.defaultLocation
        ? {
            id: user.defaultLocation.id,
            name: user.defaultLocation.name
          }
        : null
    });
  } catch (error) {
    return jsonError(error);
  }
}

