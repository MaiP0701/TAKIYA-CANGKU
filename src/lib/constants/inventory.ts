import type { TransactionType } from "@prisma/client";

export const LARGE_ADJUSTMENT_THRESHOLD = 50;

export const inventoryOperationLabels: Record<TransactionType, string> = {
  INBOUND: "入库",
  OUTBOUND: "出库",
  STORE_PICKUP: "门店领料",
  STORE_RETURN: "门店退回",
  WAREHOUSE_TRANSFER: "仓库调拨",
  STORE_TRANSFER: "门店调拨",
  STOCKTAKE_ADJUSTMENT: "盘点修正",
  DAMAGE: "报损",
  ADJUSTMENT: "其他调整"
};

export const sourceModuleLabels: Record<string, string> = {
  "inventory-page": "库存列表",
  "quick-adjust": "快速出入库",
  transfer: "调拨",
  stocktake: "盘点",
  "admin-adjust": "后台调整",
  seed: "种子数据",
  manual: "手工录入"
};

export const locationTypeLabels = {
  STORE: "门店",
  WAREHOUSE: "仓库",
  OTHER: "其他"
} as const;

