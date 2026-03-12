import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/api";
import { assertAdmin, isAdmin } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";
import type { SessionUser } from "@/types/domain";

const SESSION_COOKIE = "bubble_tea_inventory_session";
const SESSION_TTL_DAYS = 14;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sessionExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);
  return expiresAt;
}

function mapSessionUser(payload: {
  id: string;
  username: string;
  displayName: string;
  role: { code: string; name: string };
  defaultLocation: { id: string; name: string } | null;
}): SessionUser {
  return {
    id: payload.id,
    username: payload.username,
    displayName: payload.displayName,
    roleCode: payload.role.code,
    roleName: payload.role.name,
    defaultLocationId: payload.defaultLocation?.id ?? null,
    defaultLocationName: payload.defaultLocation?.name ?? null
  };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = sessionExpiry();

  await prisma.session.create({
    data: {
      tokenHash,
      userId,
      expiresAt
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: {
        tokenHash: hashToken(token)
      }
    });
  }

  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashToken(token)
    },
    include: {
      user: {
        include: {
          role: true,
          defaultLocation: true
        }
      }
    }
  });

  if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
    return null;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() }
  });

  return mapSessionUser(session.user);
}

export async function requireUser() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdminUser() {
  const user = await requireUser();

  if (!isAdmin(user)) {
    redirect("/");
  }

  return user;
}

export async function getApiUserOrThrow() {
  const user = await getSessionUser();

  if (!user) {
    throw new AppError("请先登录", 401);
  }

  return user;
}

export async function getAdminApiUserOrThrow() {
  const user = await getApiUserOrThrow();
  assertAdmin(user);
  return user;
}
