import { NextResponse } from "next/server";
import { getApiUserOrThrow } from "@/lib/auth/session";
import { jsonError } from "@/lib/api";
import { getInventoryList } from "@/lib/services/queries";
import { formatDateTimeCompact } from "@/lib/utils";

function escapeCsv(value: string | number | null | undefined) {
  const stringValue = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export async function GET(request: Request) {
  try {
    const user = await getApiUserOrThrow();
    const { searchParams } = new URL(request.url);
    const rows = await getInventoryList(user, {
      locationId: searchParams.get("locationId") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      lowStock: searchParams.get("lowStock") ?? undefined
    });

    const sort = searchParams.get("sort") ?? undefined;
    const sortedRows = [...rows].sort((left, right) => {
      switch (sort) {
        case "quantity_desc":
          return right.quantity - left.quantity;
        case "quantity_asc":
          return left.quantity - right.quantity;
        case "low_stock_first":
          return Number(right.isLowStock) - Number(left.isLowStock);
        default:
          return left.itemName.localeCompare(right.itemName, "zh-CN");
      }
    });

    const lines = [
      [
        "地点",
        "物料",
        "分类",
        "当前库存",
        "单位",
        "低库存阈值",
        "预警状态",
        "最近操作人",
        "最近操作时间"
      ].join(","),
      ...sortedRows.map((row) =>
        [
          escapeCsv(row.locationName),
          escapeCsv(row.itemName),
          escapeCsv(row.categoryName),
          escapeCsv(row.quantity),
          escapeCsv(row.unitSymbol ?? row.unitName),
          escapeCsv(row.safetyStock),
          escapeCsv(row.isLowStock ? "低库存" : "正常"),
          escapeCsv(row.lastOperatorName ?? ""),
          escapeCsv(row.lastTransactionAt ? formatDateTimeCompact(row.lastTransactionAt) : "")
        ].join(",")
      )
    ];

    return new NextResponse(`\uFEFF${lines.join("\n")}`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="inventory-report.csv"'
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
