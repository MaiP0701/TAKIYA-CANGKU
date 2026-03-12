import { Prisma, TransactionType } from "@prisma/client";
import { AppError } from "@/lib/api";
import {
  assertAdmin,
  assertLocationManageable,
  assertTransferAllowed
} from "@/lib/auth/access";
import { hashPassword } from "@/lib/auth/password";
import { LARGE_ADJUSTMENT_THRESHOLD } from "@/lib/constants/inventory";
import { prisma } from "@/lib/db/prisma";
import type { SessionUser } from "@/types/domain";

type SerializableCallback<T> = (tx: Prisma.TransactionClient) => Promise<T>;

type MovementInput = {
  user: SessionUser;
  transactionType: TransactionType;
  itemId: string;
  quantity: number;
  sourceLocationId?: string;
  targetLocationId?: string;
  notes?: string;
  stocktakeId?: string;
  occurredAt?: Date;
  sourceModule?: string;
  referenceNo?: string;
  confirmed?: boolean;
};

type StocktakeLineInput = {
  itemId: string;
  countedQuantity: number;
  notes?: string;
};

type ItemPayload = {
  name: string;
  categoryId: string;
  baseUnitId: string;
  specification?: string;
  safetyStock?: number;
  alertEnabled?: boolean;
  brand?: string;
  supplierName?: string;
  shelfLifeDays?: number | null;
  imageUrl?: string;
  notes?: string;
  isActive?: boolean;
  sku?: string;
};

type UserPayload = {
  username: string;
  displayName: string;
  email?: string;
  password: string;
  roleId: string;
  defaultLocationId?: string | null;
  isActive?: boolean;
};

type UserUpdatePayload = Partial<Omit<UserPayload, "password">> & {
  password?: string;
};

type LocationPayload = {
  name: string;
  code?: string;
  type: "STORE" | "WAREHOUSE" | "OTHER";
  sortOrder?: number;
  remark?: string;
  isActive?: boolean;
};

type UnitPayload = {
  name: string;
  code?: string;
  symbol?: string;
  precision?: number;
  sortOrder?: number;
  remark?: string;
  isActive?: boolean;
};

type QuickAdjustInput = {
  user: SessionUser;
  locationId: string;
  itemId: string;
  quantity: number;
  operationType: "INBOUND" | "OUTBOUND" | "DAMAGE" | "ADJUSTMENT";
  adjustmentDirection?: "INCREASE" | "DECREASE";
  notes?: string;
  confirmed?: boolean;
};

async function runSerializable<T>(callback: SerializableCallback<T>, attempts = 3): Promise<T> {
  try {
    return await prisma.$transaction((tx) => callback(tx), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });
  } catch (error) {
    if (
      attempts > 1 &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return runSerializable(callback, attempts - 1);
    }

    throw error;
  }
}

function decimal(value: number | string | Prisma.Decimal) {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function isBlank(value: unknown): value is undefined | null | "" {
  return value === undefined || value === null || String(value).trim() === "";
}

function normalizeOptionalText(value?: string | null) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function assertPositiveNumber(value: number, message: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new AppError(message, 400);
  }
}

function assertNonNegativeNumber(value: number, message: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new AppError(message, 400);
  }
}

function assertIntegerInRange(value: number, min: number, max: number, message: string) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new AppError(message, 400);
  }
}

function randomSuffix(length = 6) {
  return Math.random().toString(36).slice(2, 2 + length).toUpperCase();
}

function buildBusinessNo(prefix: string) {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("");

  return `${prefix}-${stamp}-${randomSuffix()}`;
}

function normalizeCode(value: string | undefined, fallbackPrefix: string) {
  const normalized = (value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();

  return normalized.length > 0 ? normalized : `${fallbackPrefix}-${randomSuffix(8)}`;
}

function requiresRemark(transactionType: TransactionType, quantity: number) {
  return (
    transactionType === "DAMAGE" ||
    transactionType === "ADJUSTMENT" ||
    transactionType === "STOCKTAKE_ADJUSTMENT" ||
    quantity >= LARGE_ADJUSTMENT_THRESHOLD
  );
}

async function getItemForOperation(tx: Prisma.TransactionClient, itemId: string) {
  const item = await tx.item.findUnique({
    where: {
      id: itemId
    },
    include: {
      baseUnit: true,
      category: true
    }
  });

  if (!item) {
    throw new AppError("物料不存在", 404);
  }

  return item;
}

async function getLocationForOperation(tx: Prisma.TransactionClient, locationId: string) {
  const location = await tx.location.findUnique({
    where: {
      id: locationId
    }
  });

  if (!location) {
    throw new AppError("地点不存在", 404);
  }

  return location;
}

async function getInventoryRow(
  tx: Prisma.TransactionClient,
  itemId: string,
  locationId: string
) {
  return tx.inventory.findUnique({
    where: {
      itemId_locationId: {
        itemId,
        locationId
      }
    }
  });
}

async function upsertInventory(
  tx: Prisma.TransactionClient,
  itemId: string,
  locationId: string,
  quantity: Prisma.Decimal,
  operatorId: string,
  occurredAt: Date
) {
  return tx.inventory.upsert({
    where: {
      itemId_locationId: {
        itemId,
        locationId
      }
    },
    update: {
      quantity,
      lastTransactionAt: occurredAt,
      lastOperatorId: operatorId
    },
    create: {
      itemId,
      locationId,
      quantity,
      lastTransactionAt: occurredAt,
      lastOperatorId: operatorId
    }
  });
}

function validateMovementShape(input: MovementInput) {
  assertPositiveNumber(input.quantity, "数量必须大于 0");

  const sourceLocationId = input.sourceLocationId;
  const targetLocationId = input.targetLocationId;

  if (input.transactionType === "INBOUND" && !targetLocationId) {
    throw new AppError("入库必须提供目标地点", 400);
  }

  if (["OUTBOUND", "DAMAGE", "STORE_PICKUP"].includes(input.transactionType) && !sourceLocationId) {
    throw new AppError("当前操作必须提供来源地点", 400);
  }

  if (
    ["WAREHOUSE_TRANSFER", "STORE_TRANSFER", "STORE_RETURN"].includes(input.transactionType)
  ) {
    if (!sourceLocationId || !targetLocationId) {
      throw new AppError("调拨类操作必须同时提供来源和目标地点", 400);
    }
  }

  if (input.transactionType === "ADJUSTMENT") {
    if ((!sourceLocationId && !targetLocationId) || (sourceLocationId && targetLocationId)) {
      throw new AppError("其他调整必须且只能影响一个地点", 400);
    }
  }

  if (sourceLocationId && targetLocationId && sourceLocationId === targetLocationId) {
    throw new AppError("来源地点和目标地点不能相同", 400);
  }

  if (requiresRemark(input.transactionType, input.quantity) && isBlank(input.notes)) {
    throw new AppError("当前操作必须填写备注", 400);
  }

  if (input.quantity >= LARGE_ADJUSTMENT_THRESHOLD && !input.confirmed) {
    throw new AppError(`数量达到 ${LARGE_ADJUSTMENT_THRESHOLD} 以上，请二次确认后提交`, 400);
  }
}

async function assertMovementEntities(
  tx: Prisma.TransactionClient,
  input: MovementInput
) {
  const item = await getItemForOperation(tx, input.itemId);

  if (!item.isActive) {
    throw new AppError("停用物料不能参与新的库存操作", 400);
  }

  const sourceLocation = input.sourceLocationId
    ? await getLocationForOperation(tx, input.sourceLocationId)
    : null;
  const targetLocation = input.targetLocationId
    ? await getLocationForOperation(tx, input.targetLocationId)
    : null;

  if (sourceLocation && !sourceLocation.isActive) {
    throw new AppError("停用地点不能参与新的库存操作", 400);
  }

  if (targetLocation && !targetLocation.isActive) {
    throw new AppError("停用地点不能参与新的库存操作", 400);
  }

  if (input.sourceLocationId && input.targetLocationId) {
    assertTransferAllowed(input.user, input.sourceLocationId, input.targetLocationId);
  } else if (input.sourceLocationId) {
    assertLocationManageable(input.user, input.sourceLocationId);
  } else if (input.targetLocationId) {
    assertLocationManageable(input.user, input.targetLocationId);
  }

  return {
    item,
    sourceLocation,
    targetLocation
  };
}

async function applyMovementInTransaction(
  tx: Prisma.TransactionClient,
  input: MovementInput
) {
  validateMovementShape(input);

  const occurredAt = input.occurredAt ?? new Date();
  const sourceModule = normalizeOptionalText(input.sourceModule) ?? "manual";
  const { item, sourceLocation, targetLocation } = await assertMovementEntities(tx, input);
  const quantity = decimal(input.quantity);

  const sourceInventory = sourceLocation
    ? await getInventoryRow(tx, item.id, sourceLocation.id)
    : null;
  const targetInventory = targetLocation
    ? await getInventoryRow(tx, item.id, targetLocation.id)
    : null;

  const beforeSourceQty = sourceInventory?.quantity ?? decimal(0);
  const beforeTargetQty = targetInventory?.quantity ?? decimal(0);
  const afterSourceQty = sourceLocation ? beforeSourceQty.minus(quantity) : null;
  const afterTargetQty = targetLocation ? beforeTargetQty.plus(quantity) : null;

  if (afterSourceQty && afterSourceQty.lessThan(0)) {
    throw new AppError(
      `库存不足：当前库存 ${beforeSourceQty.toString()}，无法扣减 ${quantity.toString()}`,
      400
    );
  }

  if (sourceLocation) {
    await upsertInventory(tx, item.id, sourceLocation.id, afterSourceQty!, input.user.id, occurredAt);
  }

  if (targetLocation) {
    await upsertInventory(tx, item.id, targetLocation.id, afterTargetQty!, input.user.id, occurredAt);
  }

  const transaction = await tx.inventoryTransaction.create({
    data: {
      transactionNo: buildBusinessNo("TRX"),
      transactionType: input.transactionType,
      sourceModule,
      referenceNo: normalizeOptionalText(input.referenceNo),
      itemId: item.id,
      sourceLocationId: sourceLocation?.id,
      targetLocationId: targetLocation?.id,
      quantity,
      unitId: item.baseUnitId,
      beforeSourceQty: sourceLocation ? beforeSourceQty : null,
      afterSourceQty,
      beforeTargetQty: targetLocation ? beforeTargetQty : null,
      afterTargetQty,
      operatorId: input.user.id,
      occurredAt,
      stocktakeId: input.stocktakeId,
      notes: normalizeOptionalText(input.notes)
    }
  });

  const unitSnapshot = item.baseUnit.symbol?.trim() || item.baseUnit.name;
  const remark = normalizeOptionalText(input.notes);

  await tx.inventoryChangeLog.createMany({
    data: [
      sourceLocation
        ? {
            transactionId: transaction.id,
            operationType: input.transactionType,
            sourceModule,
            itemId: item.id,
            itemNameSnapshot: item.name,
            locationId: sourceLocation.id,
            locationNameSnapshot: sourceLocation.name,
            unitId: item.baseUnitId,
            unitNameSnapshot: unitSnapshot,
            quantityChange: quantity.mul(-1),
            beforeQuantity: beforeSourceQty,
            afterQuantity: afterSourceQty!,
            operatorId: input.user.id,
            operatorNameSnapshot: input.user.displayName,
            remark,
            createdAt: occurredAt
          }
        : null,
      targetLocation
        ? {
            transactionId: transaction.id,
            operationType: input.transactionType,
            sourceModule,
            itemId: item.id,
            itemNameSnapshot: item.name,
            locationId: targetLocation.id,
            locationNameSnapshot: targetLocation.name,
            unitId: item.baseUnitId,
            unitNameSnapshot: unitSnapshot,
            quantityChange: quantity,
            beforeQuantity: beforeTargetQty,
            afterQuantity: afterTargetQty!,
            operatorId: input.user.id,
            operatorNameSnapshot: input.user.displayName,
            remark,
            createdAt: occurredAt
          }
        : null
    ].filter(Boolean) as Prisma.InventoryChangeLogCreateManyInput[]
  });

  return tx.inventoryTransaction.findUniqueOrThrow({
    where: {
      id: transaction.id
    },
    include: {
      item: true,
      unit: true,
      sourceLocation: true,
      targetLocation: true,
      operator: true,
      changeLogs: {
        include: {
          location: true
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });
}

async function assertCategoryAssignable(categoryId: string) {
  const category = await prisma.category.findUnique({
    where: {
      id: categoryId
    }
  });

  if (!category) {
    throw new AppError("分类不存在", 404);
  }

  if (!category.isActive) {
    throw new AppError("停用分类不能用于新物料", 400);
  }
}

async function assertUnitAssignable(unitId: string) {
  const unit = await prisma.unit.findUnique({
    where: {
      id: unitId
    }
  });

  if (!unit) {
    throw new AppError("单位不存在", 404);
  }

  if (!unit.isActive) {
    throw new AppError("停用单位不能用于新建或编辑物料", 400);
  }
}

async function ensureUniqueLocationName(name: string, currentId?: string) {
  const existing = await prisma.location.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive"
      },
      NOT: currentId ? { id: currentId } : undefined
    }
  });

  if (existing) {
    throw new AppError("地点名称已存在", 400);
  }
}

async function ensureUniqueLocationCode(code: string, currentId?: string) {
  const existing = await prisma.location.findFirst({
    where: {
      code: {
        equals: code,
        mode: "insensitive"
      },
      NOT: currentId ? { id: currentId } : undefined
    }
  });

  if (existing) {
    throw new AppError("地点编码已存在", 400);
  }
}

async function ensureUniqueUnitName(name: string, currentId?: string) {
  const existing = await prisma.unit.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive"
      },
      NOT: currentId ? { id: currentId } : undefined
    }
  });

  if (existing) {
    throw new AppError("单位名称已存在", 400);
  }
}

async function ensureUniqueUnitCode(code: string, currentId?: string) {
  const existing = await prisma.unit.findFirst({
    where: {
      code: {
        equals: code,
        mode: "insensitive"
      },
      NOT: currentId ? { id: currentId } : undefined
    }
  });

  if (existing) {
    throw new AppError("单位编码已存在", 400);
  }
}

async function ensureUniqueItemName(name: string, currentId?: string) {
  const existing = await prisma.item.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive"
      },
      NOT: currentId ? { id: currentId } : undefined
    }
  });

  if (existing) {
    throw new AppError("物料名称已存在", 400);
  }
}

async function ensureUniqueItemSku(sku: string, currentId?: string) {
  const existing = await prisma.item.findFirst({
    where: {
      sku: {
        equals: sku,
        mode: "insensitive"
      },
      NOT: currentId ? { id: currentId } : undefined
    }
  });

  if (existing) {
    throw new AppError("物料编码已存在", 400);
  }
}

async function ensureUniqueUsername(username: string, currentId?: string) {
  const existing = await prisma.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive"
      },
      NOT: currentId ? { id: currentId } : undefined
    }
  });

  if (existing) {
    throw new AppError("用户名已存在", 400);
  }
}

async function ensureUniqueEmail(email: string, currentId?: string) {
  const existing = await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive"
      },
      NOT: currentId ? { id: currentId } : undefined
    }
  });

  if (existing) {
    throw new AppError("邮箱已存在", 400);
  }
}

async function assertRoleAssignable(roleId: string) {
  const role = await prisma.role.findUnique({
    where: {
      id: roleId
    }
  });

  if (!role) {
    throw new AppError("角色不存在", 404);
  }
}

export async function performInventoryMovement(input: MovementInput) {
  return runSerializable((tx) =>
    applyMovementInTransaction(tx, {
      ...input,
      sourceModule: input.sourceModule ?? "manual"
    })
  );
}

export async function quickAdjustInventory(input: QuickAdjustInput) {
  const operationType = input.operationType;

  if (operationType === "ADJUSTMENT" && !input.adjustmentDirection) {
    throw new AppError("其他调整必须指定增加或减少方向", 400);
  }

  return performInventoryMovement({
    user: input.user,
    transactionType: operationType,
    itemId: input.itemId,
    quantity: input.quantity,
    sourceLocationId:
      operationType === "OUTBOUND" ||
      operationType === "DAMAGE" ||
      (operationType === "ADJUSTMENT" && input.adjustmentDirection === "DECREASE")
        ? input.locationId
        : undefined,
    targetLocationId:
      operationType === "INBOUND" ||
      (operationType === "ADJUSTMENT" && input.adjustmentDirection === "INCREASE")
        ? input.locationId
        : undefined,
    notes: input.notes,
    sourceModule: "quick-adjust",
    confirmed: input.confirmed
  });
}

export async function createStocktake(
  user: SessionUser,
  input: {
    locationId: string;
    notes?: string;
    lines: StocktakeLineInput[];
  }
) {
  assertLocationManageable(user, input.locationId);

  if (input.lines.length === 0) {
    throw new AppError("盘点明细不能为空", 400);
  }

  return runSerializable(async (tx) => {
    const location = await getLocationForOperation(tx, input.locationId);

    if (!location.isActive) {
      throw new AppError("停用地点不能发起盘点", 400);
    }

    const uniqueItemIds = new Set<string>();
    for (const line of input.lines) {
      if (!Number.isFinite(line.countedQuantity) || line.countedQuantity < 0) {
        throw new AppError("盘点数量必须大于等于 0", 400);
      }

      if (uniqueItemIds.has(line.itemId)) {
        throw new AppError("同一物料不能重复盘点", 400);
      }

      uniqueItemIds.add(line.itemId);
    }

    const inventoryRows = await tx.inventory.findMany({
      where: {
        locationId: input.locationId,
        itemId: {
          in: input.lines.map((line) => line.itemId)
        }
      }
    });

    const itemRows = await tx.item.findMany({
      where: {
        id: {
          in: input.lines.map((line) => line.itemId)
        }
      }
    });

    const inventoryByItemId = Object.fromEntries(inventoryRows.map((row) => [row.itemId, row]));
    const itemById = Object.fromEntries(itemRows.map((item) => [item.id, item]));

    for (const line of input.lines) {
      const item = itemById[line.itemId];

      if (!item) {
        throw new AppError("盘点物料不存在", 404);
      }

      if (!item.isActive) {
        throw new AppError(`停用物料 ${item.name} 不能参与新的盘点`, 400);
      }
    }

    return tx.stocktake.create({
      data: {
        stocktakeNo: buildBusinessNo("STK"),
        locationId: location.id,
        createdById: user.id,
        notes: normalizeOptionalText(input.notes),
        items: {
          create: input.lines.map((line) => {
            const item = itemById[line.itemId];
            const systemQuantity = inventoryByItemId[line.itemId]?.quantity ?? decimal(0);
            const countedQuantity = decimal(line.countedQuantity);

            return {
              itemId: line.itemId,
              unitId: item.baseUnitId,
              systemQuantity,
              countedQuantity,
              differenceQuantity: countedQuantity.minus(systemQuantity),
              notes: normalizeOptionalText(line.notes)
            };
          })
        }
      },
      include: {
        items: true
      }
    });
  });
}

export async function completeStocktake(user: SessionUser, stocktakeId: string) {
  return runSerializable(async (tx) => {
    const stocktake = await tx.stocktake.findUnique({
      where: {
        id: stocktakeId
      },
      include: {
        location: true,
        items: true
      }
    });

    if (!stocktake) {
      throw new AppError("盘点单不存在", 404);
    }

    assertLocationManageable(user, stocktake.locationId);

    if (stocktake.status !== "DRAFT") {
      throw new AppError("只有草稿状态盘点单可以完成", 400);
    }

    if (!stocktake.location.isActive) {
      throw new AppError("停用地点不能完成新的盘点修正", 400);
    }

    for (const line of stocktake.items) {
      const currentInventory = await getInventoryRow(tx, line.itemId, stocktake.locationId);
      const currentQuantity = currentInventory?.quantity ?? decimal(0);

      if (!currentQuantity.equals(line.systemQuantity)) {
        throw new AppError("盘点期间库存已变化，请重新创建盘点单", 409);
      }
    }

    for (const line of stocktake.items) {
      if (line.differenceQuantity.equals(0)) {
        continue;
      }

      const transaction = await applyMovementInTransaction(tx, {
        user,
        transactionType: "STOCKTAKE_ADJUSTMENT",
        itemId: line.itemId,
        quantity: Number(line.differenceQuantity.abs().toString()),
        sourceLocationId: line.differenceQuantity.lessThan(0) ? stocktake.locationId : undefined,
        targetLocationId: line.differenceQuantity.greaterThan(0) ? stocktake.locationId : undefined,
        notes: normalizeOptionalText(line.notes) ?? `盘点修正：${stocktake.stocktakeNo}`,
        stocktakeId: stocktake.id,
        occurredAt: new Date(),
        sourceModule: "stocktake",
        referenceNo: stocktake.stocktakeNo,
        confirmed: true
      });

      await tx.stocktakeItem.update({
        where: {
          id: line.id
        },
        data: {
          adjustmentTransactionId: transaction.id
        }
      });
    }

    return tx.stocktake.update({
      where: {
        id: stocktake.id
      },
      data: {
        status: "COMPLETED",
        completedById: user.id,
        completedAt: new Date()
      }
    });
  });
}

export async function createItem(user: SessionUser, payload: ItemPayload) {
  assertAdmin(user);

  if (isBlank(payload.name) || isBlank(payload.categoryId) || isBlank(payload.baseUnitId)) {
    throw new AppError("物料名称、分类、单位不能为空", 400);
  }

  const name = payload.name.trim();
  if (name.length === 0) {
    throw new AppError("物料名称不能为空", 400);
  }

  const safetyStock = Number(payload.safetyStock ?? 0);
  assertNonNegativeNumber(safetyStock, "安全库存不能为负数");

  if (payload.shelfLifeDays !== null && payload.shelfLifeDays !== undefined) {
    assertNonNegativeNumber(payload.shelfLifeDays, "保质期天数不能为负数");
  }

  const sku = normalizeCode(payload.sku, "MAT");

  await Promise.all([
    ensureUniqueItemName(name),
    ensureUniqueItemSku(sku),
    assertCategoryAssignable(payload.categoryId),
    assertUnitAssignable(payload.baseUnitId)
  ]);

  return prisma.item.create({
    data: {
      sku,
      name,
      categoryId: payload.categoryId,
      baseUnitId: payload.baseUnitId,
      specification: normalizeOptionalText(payload.specification),
      safetyStock: decimal(safetyStock),
      alertEnabled: payload.alertEnabled ?? true,
      brand: normalizeOptionalText(payload.brand),
      supplierName: normalizeOptionalText(payload.supplierName),
      shelfLifeDays: payload.shelfLifeDays ?? null,
      imageUrl: normalizeOptionalText(payload.imageUrl),
      notes: normalizeOptionalText(payload.notes),
      isActive: payload.isActive ?? true,
      createdById: user.id
    }
  });
}

export async function updateItem(user: SessionUser, itemId: string, payload: Partial<ItemPayload>) {
  assertAdmin(user);

  const current = await prisma.item.findUnique({
    where: {
      id: itemId
    }
  });

  if (!current) {
    throw new AppError("物料不存在", 404);
  }

  if (payload.name !== undefined && payload.name.trim().length === 0) {
    throw new AppError("物料名称不能为空", 400);
  }

  if (payload.categoryId) {
    await assertCategoryAssignable(payload.categoryId);
  }

  if (payload.baseUnitId) {
    await assertUnitAssignable(payload.baseUnitId);
  }

  if (payload.safetyStock !== undefined) {
    assertNonNegativeNumber(payload.safetyStock, "安全库存不能为负数");
  }

  if (payload.shelfLifeDays !== undefined && payload.shelfLifeDays !== null) {
    assertNonNegativeNumber(payload.shelfLifeDays, "保质期天数不能为负数");
  }

  const nextSku =
    payload.sku !== undefined
      ? payload.sku.trim().length > 0
        ? normalizeCode(payload.sku, "MAT")
        : current.sku
      : undefined;

  await Promise.all([
    payload.name !== undefined ? ensureUniqueItemName(payload.name.trim(), itemId) : Promise.resolve(),
    nextSku !== undefined && nextSku !== current.sku
      ? ensureUniqueItemSku(nextSku, itemId)
      : Promise.resolve()
  ]);

  return prisma.item.update({
    where: {
      id: itemId
    },
    data: {
      sku: nextSku,
      name: payload.name?.trim(),
      categoryId: payload.categoryId,
      baseUnitId: payload.baseUnitId,
      specification:
        payload.specification !== undefined ? normalizeOptionalText(payload.specification) : undefined,
      safetyStock: payload.safetyStock !== undefined ? decimal(payload.safetyStock) : undefined,
      alertEnabled: payload.alertEnabled,
      brand: payload.brand !== undefined ? normalizeOptionalText(payload.brand) : undefined,
      supplierName:
        payload.supplierName !== undefined ? normalizeOptionalText(payload.supplierName) : undefined,
      shelfLifeDays: payload.shelfLifeDays,
      imageUrl: payload.imageUrl !== undefined ? normalizeOptionalText(payload.imageUrl) : undefined,
      notes: payload.notes !== undefined ? normalizeOptionalText(payload.notes) : undefined,
      isActive: payload.isActive
    }
  });
}

export async function createUser(user: SessionUser, payload: UserPayload) {
  assertAdmin(user);

  if (
    isBlank(payload.username) ||
    isBlank(payload.displayName) ||
    isBlank(payload.password) ||
    isBlank(payload.roleId)
  ) {
    throw new AppError("用户名、姓名、密码和角色不能为空", 400);
  }

  const username = payload.username.trim();
  const displayName = payload.displayName.trim();
  const email = normalizeOptionalText(payload.email);

  if (username.length === 0 || displayName.length === 0) {
    throw new AppError("用户名和姓名不能为空", 400);
  }

  await Promise.all([
    ensureUniqueUsername(username),
    email ? ensureUniqueEmail(email) : Promise.resolve(),
    assertRoleAssignable(payload.roleId)
  ]);

  if (payload.defaultLocationId) {
    const location = await prisma.location.findUnique({
      where: {
        id: payload.defaultLocationId
      }
    });

    if (!location) {
      throw new AppError("默认地点不存在", 404);
    }

    if (!location.isActive) {
      throw new AppError("不能为用户分配停用地点作为默认地点", 400);
    }
  }

  return prisma.user.create({
    data: {
      username,
      displayName,
      email,
      passwordHash: hashPassword(payload.password),
      roleId: payload.roleId,
      defaultLocationId: payload.defaultLocationId || null,
      isActive: payload.isActive ?? true
    }
  });
}

export async function updateUser(user: SessionUser, userId: string, payload: UserUpdatePayload) {
  assertAdmin(user);

  const current = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  if (!current) {
    throw new AppError("用户不存在", 404);
  }

  if (payload.username !== undefined && payload.username.trim().length === 0) {
    throw new AppError("用户名不能为空", 400);
  }

  if (payload.displayName !== undefined && payload.displayName.trim().length === 0) {
    throw new AppError("显示名称不能为空", 400);
  }

  const normalizedEmail = payload.email !== undefined ? normalizeOptionalText(payload.email) : undefined;

  await Promise.all([
    payload.username !== undefined
      ? ensureUniqueUsername(payload.username.trim(), userId)
      : Promise.resolve(),
    normalizedEmail ? ensureUniqueEmail(normalizedEmail, userId) : Promise.resolve(),
    payload.roleId ? assertRoleAssignable(payload.roleId) : Promise.resolve()
  ]);

  if (payload.defaultLocationId) {
    const location = await prisma.location.findUnique({
      where: {
        id: payload.defaultLocationId
      }
    });

    if (!location) {
      throw new AppError("默认地点不存在", 404);
    }

    if (!location.isActive) {
      throw new AppError("不能为用户分配停用地点作为默认地点", 400);
    }
  }

  return prisma.user.update({
    where: {
      id: userId
    },
    data: {
      username: payload.username?.trim(),
      displayName: payload.displayName?.trim(),
      email: normalizedEmail,
      passwordHash: payload.password ? hashPassword(payload.password) : undefined,
      roleId: payload.roleId,
      defaultLocationId:
        payload.defaultLocationId === undefined ? undefined : payload.defaultLocationId || null,
      isActive: payload.isActive
    }
  });
}

export async function createLocation(user: SessionUser, payload: LocationPayload) {
  assertAdmin(user);

  if (isBlank(payload.name)) {
    throw new AppError("地点名称不能为空", 400);
  }

  const name = payload.name.trim();
  if (name.length === 0) {
    throw new AppError("地点名称不能为空", 400);
  }

  const sortOrder = Number(payload.sortOrder ?? 0);
  assertIntegerInRange(sortOrder, 0, 9999, "排序值必须是 0 到 9999 之间的整数");
  const code = normalizeCode(payload.code, "LOC");
  await Promise.all([ensureUniqueLocationName(name), ensureUniqueLocationCode(code)]);

  return prisma.location.create({
    data: {
      name,
      code,
      type: payload.type,
      sortOrder,
      remark: normalizeOptionalText(payload.remark),
      isActive: payload.isActive ?? true
    }
  });
}

export async function updateLocation(
  user: SessionUser,
  locationId: string,
  payload: Partial<LocationPayload>
) {
  assertAdmin(user);

  const current = await prisma.location.findUnique({
    where: {
      id: locationId
    }
  });

  if (!current) {
    throw new AppError("地点不存在", 404);
  }

  if (payload.name !== undefined && payload.name.trim().length === 0) {
    throw new AppError("地点名称不能为空", 400);
  }

  if (payload.sortOrder !== undefined) {
    assertIntegerInRange(payload.sortOrder, 0, 9999, "排序值必须是 0 到 9999 之间的整数");
  }

  const nextCode =
    payload.code !== undefined
      ? payload.code.trim().length > 0
        ? normalizeCode(payload.code, "LOC")
        : current.code
      : undefined;

  await Promise.all([
    payload.name !== undefined ? ensureUniqueLocationName(payload.name.trim(), locationId) : Promise.resolve(),
    nextCode !== undefined && nextCode !== current.code
      ? ensureUniqueLocationCode(nextCode, locationId)
      : Promise.resolve()
  ]);

  return prisma.location.update({
    where: {
      id: locationId
    },
    data: {
      name: payload.name?.trim(),
      code: nextCode,
      type: payload.type,
      sortOrder: payload.sortOrder,
      remark: payload.remark !== undefined ? normalizeOptionalText(payload.remark) : undefined,
      isActive: payload.isActive
    }
  });
}

export async function createUnit(user: SessionUser, payload: UnitPayload) {
  assertAdmin(user);

  if (isBlank(payload.name)) {
    throw new AppError("单位名称不能为空", 400);
  }

  const name = payload.name.trim();
  if (name.length === 0) {
    throw new AppError("单位名称不能为空", 400);
  }

  const precision = Number(payload.precision ?? 0);
  const sortOrder = Number(payload.sortOrder ?? 0);
  assertIntegerInRange(precision, 0, 6, "单位精度必须是 0 到 6 之间的整数");
  assertIntegerInRange(sortOrder, 0, 9999, "排序值必须是 0 到 9999 之间的整数");
  const code = normalizeCode(payload.code, "UNIT");
  await Promise.all([ensureUniqueUnitName(name), ensureUniqueUnitCode(code)]);

  return prisma.unit.create({
    data: {
      name,
      code,
      symbol: normalizeOptionalText(payload.symbol),
      precision,
      sortOrder,
      remark: normalizeOptionalText(payload.remark),
      isActive: payload.isActive ?? true
    }
  });
}

export async function updateUnit(user: SessionUser, unitId: string, payload: Partial<UnitPayload>) {
  assertAdmin(user);

  const current = await prisma.unit.findUnique({
    where: {
      id: unitId
    }
  });

  if (!current) {
    throw new AppError("单位不存在", 404);
  }

  if (payload.name !== undefined && payload.name.trim().length === 0) {
    throw new AppError("单位名称不能为空", 400);
  }

  if (payload.precision !== undefined) {
    assertIntegerInRange(payload.precision, 0, 6, "单位精度必须是 0 到 6 之间的整数");
  }

  if (payload.sortOrder !== undefined) {
    assertIntegerInRange(payload.sortOrder, 0, 9999, "排序值必须是 0 到 9999 之间的整数");
  }

  const nextCode =
    payload.code !== undefined
      ? payload.code.trim().length > 0
        ? normalizeCode(payload.code, "UNIT")
        : current.code
      : undefined;

  await Promise.all([
    payload.name !== undefined ? ensureUniqueUnitName(payload.name.trim(), unitId) : Promise.resolve(),
    nextCode !== undefined && nextCode !== current.code
      ? ensureUniqueUnitCode(nextCode, unitId)
      : Promise.resolve()
  ]);

  return prisma.unit.update({
    where: {
      id: unitId
    },
    data: {
      name: payload.name?.trim(),
      code: nextCode,
      symbol: payload.symbol !== undefined ? normalizeOptionalText(payload.symbol) : undefined,
      precision: payload.precision,
      sortOrder: payload.sortOrder,
      remark: payload.remark !== undefined ? normalizeOptionalText(payload.remark) : undefined,
      isActive: payload.isActive
    }
  });
}
