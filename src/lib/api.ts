import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export class AppError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export async function readRequestBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries());
  }

  return {};
}

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data
    },
    { status }
  );
}

export function jsonError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message,
          status: error.status,
          code: error.code ?? "APP_ERROR"
        }
      },
      { status: error.status }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "数据已存在，不能重复创建",
            status: 409,
            code: error.code
          }
        },
        { status: 409 }
      );
    }

    if (error.code === "P2025") {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "数据不存在或已被移除",
            status: 404,
            code: error.code
          }
        },
        { status: 404 }
      );
    }
  }

  console.error(error);
  return NextResponse.json(
    {
      success: false,
      error: {
        message: "服务器内部错误",
        status: 500,
        code: "INTERNAL_ERROR"
      }
    },
    { status: 500 }
  );
}
