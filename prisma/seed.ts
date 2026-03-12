import { Prisma, PrismaClient, TransactionType } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

type SeedMovement = {
  transactionType: TransactionType;
  sourceModule: string;
  itemSku: string;
  quantity: string;
  sourceCode?: string;
  targetCode?: string;
  notes: string;
  occurredAt: Date;
  referenceNo?: string;
  stocktakeId?: string;
};

async function applyMovement(
  prismaClient: Prisma.TransactionClient,
  input: SeedMovement & {
    itemId: string;
    unitId: string;
    operatorId: string;
    itemName: string;
    unitNameSnapshot: string;
    sourceLocationId?: string;
    targetLocationId?: string;
    sourceLocationName?: string;
    targetLocationName?: string;
  },
  sequence: number
) {
  const quantity = new Prisma.Decimal(input.quantity);

  const sourceInventory = input.sourceLocationId
    ? await prismaClient.inventory.findUnique({
        where: {
          itemId_locationId: {
            itemId: input.itemId,
            locationId: input.sourceLocationId
          }
        }
      })
    : null;
  const targetInventory = input.targetLocationId
    ? await prismaClient.inventory.findUnique({
        where: {
          itemId_locationId: {
            itemId: input.itemId,
            locationId: input.targetLocationId
          }
        }
      })
    : null;

  const beforeSourceQty = sourceInventory?.quantity ?? new Prisma.Decimal(0);
  const beforeTargetQty = targetInventory?.quantity ?? new Prisma.Decimal(0);
  const afterSourceQty = input.sourceLocationId ? beforeSourceQty.minus(quantity) : null;
  const afterTargetQty = input.targetLocationId ? beforeTargetQty.plus(quantity) : null;

  if (afterSourceQty && afterSourceQty.lessThan(0)) {
    throw new Error(`Seed movement would create negative stock for ${input.itemName}`);
  }

  if (input.sourceLocationId) {
    await prismaClient.inventory.upsert({
      where: {
        itemId_locationId: {
          itemId: input.itemId,
          locationId: input.sourceLocationId
        }
      },
      update: {
        quantity: afterSourceQty!,
        lastTransactionAt: input.occurredAt,
        lastOperatorId: input.operatorId
      },
      create: {
        itemId: input.itemId,
        locationId: input.sourceLocationId,
        quantity: afterSourceQty!,
        lastTransactionAt: input.occurredAt,
        lastOperatorId: input.operatorId
      }
    });
  }

  if (input.targetLocationId) {
    await prismaClient.inventory.upsert({
      where: {
        itemId_locationId: {
          itemId: input.itemId,
          locationId: input.targetLocationId
        }
      },
      update: {
        quantity: afterTargetQty!,
        lastTransactionAt: input.occurredAt,
        lastOperatorId: input.operatorId
      },
      create: {
        itemId: input.itemId,
        locationId: input.targetLocationId,
        quantity: afterTargetQty!,
        lastTransactionAt: input.occurredAt,
        lastOperatorId: input.operatorId
      }
    });
  }

  const transaction = await prismaClient.inventoryTransaction.create({
    data: {
      transactionNo: `TRX-${String(sequence).padStart(6, "0")}`,
      transactionType: input.transactionType,
      sourceModule: input.sourceModule,
      referenceNo: input.referenceNo ?? null,
      itemId: input.itemId,
      sourceLocationId: input.sourceLocationId,
      targetLocationId: input.targetLocationId,
      quantity,
      unitId: input.unitId,
      beforeSourceQty: input.sourceLocationId ? beforeSourceQty : null,
      afterSourceQty,
      beforeTargetQty: input.targetLocationId ? beforeTargetQty : null,
      afterTargetQty,
      operatorId: input.operatorId,
      occurredAt: input.occurredAt,
      stocktakeId: input.stocktakeId ?? null,
      notes: input.notes
    }
  });

  await prismaClient.inventoryChangeLog.createMany({
    data: [
      input.sourceLocationId
        ? {
            transactionId: transaction.id,
            operationType: input.transactionType,
            sourceModule: input.sourceModule,
            itemId: input.itemId,
            itemNameSnapshot: input.itemName,
            locationId: input.sourceLocationId,
            locationNameSnapshot: input.sourceLocationName!,
            unitId: input.unitId,
            unitNameSnapshot: input.unitNameSnapshot,
            quantityChange: quantity.mul(-1),
            beforeQuantity: beforeSourceQty,
            afterQuantity: afterSourceQty!,
            operatorId: input.operatorId,
            operatorNameSnapshot: "系统管理员",
            remark: input.notes,
            createdAt: input.occurredAt
          }
        : null,
      input.targetLocationId
        ? {
            transactionId: transaction.id,
            operationType: input.transactionType,
            sourceModule: input.sourceModule,
            itemId: input.itemId,
            itemNameSnapshot: input.itemName,
            locationId: input.targetLocationId,
            locationNameSnapshot: input.targetLocationName!,
            unitId: input.unitId,
            unitNameSnapshot: input.unitNameSnapshot,
            quantityChange: quantity,
            beforeQuantity: beforeTargetQty,
            afterQuantity: afterTargetQty!,
            operatorId: input.operatorId,
            operatorNameSnapshot: "系统管理员",
            remark: input.notes,
            createdAt: input.occurredAt
          }
        : null
    ].filter(Boolean) as Prisma.InventoryChangeLogCreateManyInput[]
  });

  return transaction;
}

async function main() {
  await prisma.stocktakeItem.deleteMany();
  await prisma.stocktake.deleteMany();
  await prisma.inventoryChangeLog.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.session.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.location.deleteMany();

  const [adminRole, storeRole, warehouseRole] = await Promise.all([
    prisma.role.create({
      data: {
        code: "ADMIN",
        name: "管理员",
        description: "可查看和操作全部地点库存"
      }
    }),
    prisma.role.create({
      data: {
        code: "STORE_CLERK",
        name: "店员",
        description: "仅操作所属门店库存"
      }
    }),
    prisma.role.create({
      data: {
        code: "WAREHOUSE_STAFF",
        name: "仓库人员",
        description: "管理仓库库存及调拨"
      }
    })
  ]);

  const [warehouse, kanda, ueno, ikebukuro] = await Promise.all([
    prisma.location.create({
      data: {
        code: "WAREHOUSE",
        name: "总仓",
        type: "WAREHOUSE",
        sortOrder: 1,
        remark: "靠近神田店的总仓"
      }
    }),
    prisma.location.create({
      data: {
        code: "KANDA",
        name: "神田店",
        type: "STORE",
        sortOrder: 10,
        remark: "工作日客流较高"
      }
    }),
    prisma.location.create({
      data: {
        code: "UENO",
        name: "上野店",
        type: "STORE",
        sortOrder: 20,
        remark: "周末游客较多"
      }
    }),
    prisma.location.create({
      data: {
        code: "IKEBUKURO",
        name: "池袋店",
        type: "STORE",
        sortOrder: 30,
        remark: "筹备中，暂未启用",
        isActive: false
      }
    })
  ]);

  const [ingredientCategory, packagingCategory, supplyCategory] = await Promise.all([
    prisma.category.create({
      data: {
        code: "INGREDIENT",
        name: "原料",
        sortOrder: 10
      }
    }),
    prisma.category.create({
      data: {
        code: "PACKAGING",
        name: "包材",
        sortOrder: 20
      }
    }),
    prisma.category.create({
      data: {
        code: "SUPPLY",
        name: "其他耗材",
        sortOrder: 30
      }
    })
  ]);

  const units = await Promise.all([
    prisma.unit.create({
      data: { code: "kg", name: "千克", symbol: "kg", precision: 3, sortOrder: 10 }
    }),
    prisma.unit.create({
      data: { code: "L", name: "升", symbol: "L", precision: 3, sortOrder: 20 }
    }),
    prisma.unit.create({
      data: { code: "piece", name: "个", symbol: "个", precision: 0, sortOrder: 30 }
    }),
    prisma.unit.create({
      data: { code: "sheet", name: "片", symbol: "片", precision: 0, sortOrder: 40 }
    }),
    prisma.unit.create({
      data: { code: "bag", name: "袋", symbol: "袋", precision: 0, sortOrder: 50 }
    }),
    prisma.unit.create({
      data: { code: "box", name: "箱", symbol: "箱", precision: 0, sortOrder: 60 }
    }),
    prisma.unit.create({
      data: { code: "pack", name: "包", symbol: "包", precision: 0, sortOrder: 70 }
    }),
    prisma.unit.create({
      data: { code: "bottle", name: "瓶", symbol: "瓶", precision: 0, sortOrder: 80 }
    }),
    prisma.unit.create({
      data: {
        code: "tray",
        name: "托盘",
        symbol: "托",
        precision: 0,
        sortOrder: 90,
        remark: "演示停用单位",
        isActive: false
      }
    })
  ]);

  const unitByCode = Object.fromEntries(units.map((unit) => [unit.code, unit]));

  const adminUser = await prisma.user.create({
    data: {
      username: "admin",
      displayName: "系统管理员",
      email: "admin@example.com",
      passwordHash: hashPassword("Admin123!"),
      roleId: adminRole.id,
      defaultLocationId: warehouse.id
    }
  });

  await Promise.all([
    prisma.user.create({
      data: {
        username: "kanda",
        displayName: "神田店店员",
        email: "kanda@example.com",
        passwordHash: hashPassword("Store123!"),
        roleId: storeRole.id,
        defaultLocationId: kanda.id
      }
    }),
    prisma.user.create({
      data: {
        username: "warehouse",
        displayName: "总仓仓管",
        email: "warehouse@example.com",
        passwordHash: hashPassword("Warehouse123!"),
        roleId: warehouseRole.id,
        defaultLocationId: warehouse.id
      }
    })
  ]);

  const itemInputs = [
    ["MAT-001", "红茶茶叶", ingredientCategory.id, "kg", "1袋=1kg", "3", "茶底常备原料", true],
    ["MAT-002", "绿茶茶叶", ingredientCategory.id, "kg", "1袋=1kg", "3", "茶底常备原料", true],
    ["MAT-003", "乌龙茶茶叶", ingredientCategory.id, "kg", "1袋=1kg", "3", "茶底常备原料", true],
    ["MAT-004", "牛奶", ingredientCategory.id, "L", "1箱=12L", "20", "冷藏保存", true],
    ["MAT-005", "浓缩牛奶", ingredientCategory.id, "L", "1箱=12L", "10", "用于奶盖与甜品", true],
    ["MAT-006", "草莓果酱", ingredientCategory.id, "bottle", "1瓶=1kg", "5", "果酱类原料", true],
    ["MAT-007", "芒果果酱", ingredientCategory.id, "bottle", "1瓶=1kg", "5", "果酱类原料", true],
    ["MAT-008", "珍珠", ingredientCategory.id, "bag", "1袋=3kg", "8", "小料", true],
    ["MAT-009", "椰果", ingredientCategory.id, "bag", "1袋=2kg", "5", "小料", true],
    ["MAT-010", "蛋挞皮", ingredientCategory.id, "sheet", "1包=30片", "100", "冷冻保存", true],
    ["MAT-011", "鸡蛋", ingredientCategory.id, "piece", "1箱=180个", "120", "甜品制作", true],
    ["MAT-012", "中杯杯子", packagingCategory.id, "box", "1箱=1000个", "2", "12oz", true],
    ["MAT-013", "大杯杯子", packagingCategory.id, "box", "1箱=1000个", "2", "16oz", true],
    ["MAT-014", "吸管", packagingCategory.id, "box", "1箱=2000支", "1", "单支包装", true],
    ["MAT-015", "纸袋", packagingCategory.id, "pack", "1包=100个", "4", "外带使用", true],
    ["MAT-016", "塑料袋", packagingCategory.id, "pack", "1包=100个", "5", "外带使用", true],
    ["MAT-017", "一次性手套", supplyCategory.id, "box", "1箱=1000只", "2", "卫生防护", true],
    ["MAT-018", "餐巾纸", supplyCategory.id, "pack", "1包=200张", "6", "前台耗材", true],
    ["MAT-019", "清洁剂", supplyCategory.id, "bottle", "1瓶=2L", "2", "闭店清洁使用", false]
  ] as const;

  const items = await Promise.all(
    itemInputs.map(([sku, name, categoryId, unitCode, specification, safetyStock, notes, alertEnabled]) =>
      prisma.item.create({
        data: {
          sku,
          name,
          categoryId,
          baseUnitId: unitByCode[unitCode].id,
          specification,
          safetyStock: new Prisma.Decimal(safetyStock),
          alertEnabled,
          notes,
          createdById: adminUser.id
        }
      })
    )
  );

  const itemsBySku = Object.fromEntries(items.map((item) => [item.sku, item]));
  const locationsByCode = {
    WAREHOUSE: warehouse,
    KANDA: kanda,
    UENO: ueno,
    IKEBUKURO: ikebukuro
  };

  let sequence = 1;

  const initialMovements: SeedMovement[] = [
    { transactionType: "INBOUND", sourceModule: "seed", itemSku: "MAT-001", quantity: "14", targetCode: "WAREHOUSE", notes: "初始化总仓库存", occurredAt: new Date("2026-03-01T08:00:00+08:00") },
    { transactionType: "INBOUND", sourceModule: "seed", itemSku: "MAT-002", quantity: "12", targetCode: "WAREHOUSE", notes: "初始化总仓库存", occurredAt: new Date("2026-03-01T08:02:00+08:00") },
    { transactionType: "INBOUND", sourceModule: "seed", itemSku: "MAT-003", quantity: "10", targetCode: "WAREHOUSE", notes: "初始化总仓库存", occurredAt: new Date("2026-03-01T08:04:00+08:00") },
    { transactionType: "INBOUND", sourceModule: "seed", itemSku: "MAT-004", quantity: "96", targetCode: "WAREHOUSE", notes: "初始化总仓库存", occurredAt: new Date("2026-03-01T08:06:00+08:00") },
    { transactionType: "INBOUND", sourceModule: "seed", itemSku: "MAT-005", quantity: "42", targetCode: "WAREHOUSE", notes: "初始化总仓库存", occurredAt: new Date("2026-03-01T08:08:00+08:00") },
    { transactionType: "INBOUND", sourceModule: "seed", itemSku: "MAT-006", quantity: "18", targetCode: "WAREHOUSE", notes: "初始化总仓库存", occurredAt: new Date("2026-03-01T08:10:00+08:00") },
    { transactionType: "INBOUND", sourceModule: "seed", itemSku: "MAT-007", quantity: "16", targetCode: "WAREHOUSE", notes: "初始化总仓库存", occurredAt: new Date("2026-03-01T08:12:00+08:00") },
    { transactionType: "INBOUND", sourceModule: "seed", itemSku: "MAT-008", quantity: "28", targetCode: "WAREHOUSE", notes: "初始化总仓库存", occurredAt: new Date("2026-03-01T08:14:00+08:00") },
    { transactionType: "INBOUND", sourceModule: "seed", itemSku: "MAT-009", quantity: "20", targetCode: "WAREHOUSE", notes: "初始化总仓库存", occurredAt: new Date("2026-03-01T08:16:00+08:00") },
    { transactionType: "INBOUND", sourceModule: "seed", itemSku: "MAT-010", quantity: "360", targetCode: "WAREHOUSE", notes: "初始化总仓库存", occurredAt: new Date("2026-03-01T08:18:00+08:00") },
    { transactionType: "INBOUND", sourceModule: "seed", itemSku: "MAT-011", quantity: "720", targetCode: "WAREHOUSE", notes: "初始化总仓库存", occurredAt: new Date("2026-03-01T08:20:00+08:00") },
    { transactionType: "INBOUND", sourceModule: "seed", itemSku: "MAT-012", quantity: "10", targetCode: "WAREHOUSE", notes: "初始化总仓库存", occurredAt: new Date("2026-03-01T08:22:00+08:00") },
    { transactionType: "INBOUND", sourceModule: "seed", itemSku: "MAT-013", quantity: "8", targetCode: "WAREHOUSE", notes: "初始化总仓库存", occurredAt: new Date("2026-03-01T08:24:00+08:00") },
    { transactionType: "INBOUND", sourceModule: "seed", itemSku: "MAT-014", quantity: "12", targetCode: "WAREHOUSE", notes: "初始化总仓库存", occurredAt: new Date("2026-03-01T08:26:00+08:00") },
    { transactionType: "INBOUND", sourceModule: "seed", itemSku: "MAT-015", quantity: "20", targetCode: "WAREHOUSE", notes: "初始化总仓库存", occurredAt: new Date("2026-03-01T08:28:00+08:00") },
    { transactionType: "INBOUND", sourceModule: "seed", itemSku: "MAT-016", quantity: "18", targetCode: "WAREHOUSE", notes: "初始化总仓库存", occurredAt: new Date("2026-03-01T08:30:00+08:00") },
    { transactionType: "INBOUND", sourceModule: "seed", itemSku: "MAT-017", quantity: "6", targetCode: "WAREHOUSE", notes: "初始化总仓库存", occurredAt: new Date("2026-03-01T08:32:00+08:00") },
    { transactionType: "INBOUND", sourceModule: "seed", itemSku: "MAT-018", quantity: "18", targetCode: "WAREHOUSE", notes: "初始化总仓库存", occurredAt: new Date("2026-03-01T08:34:00+08:00") },
    { transactionType: "INBOUND", sourceModule: "seed", itemSku: "MAT-019", quantity: "8", targetCode: "WAREHOUSE", notes: "初始化总仓库存", occurredAt: new Date("2026-03-01T08:36:00+08:00") },
    { transactionType: "WAREHOUSE_TRANSFER", sourceModule: "transfer", itemSku: "MAT-004", quantity: "18", sourceCode: "WAREHOUSE", targetCode: "KANDA", notes: "总仓补货到神田店", occurredAt: new Date("2026-03-04T09:00:00+08:00") },
    { transactionType: "WAREHOUSE_TRANSFER", sourceModule: "transfer", itemSku: "MAT-004", quantity: "16", sourceCode: "WAREHOUSE", targetCode: "UENO", notes: "总仓补货到上野店", occurredAt: new Date("2026-03-04T09:05:00+08:00") },
    { transactionType: "WAREHOUSE_TRANSFER", sourceModule: "transfer", itemSku: "MAT-012", quantity: "2", sourceCode: "WAREHOUSE", targetCode: "KANDA", notes: "总仓补货中杯杯子", occurredAt: new Date("2026-03-04T09:10:00+08:00") },
    { transactionType: "WAREHOUSE_TRANSFER", sourceModule: "transfer", itemSku: "MAT-012", quantity: "1", sourceCode: "WAREHOUSE", targetCode: "UENO", notes: "总仓补货中杯杯子", occurredAt: new Date("2026-03-04T09:12:00+08:00") },
    { transactionType: "WAREHOUSE_TRANSFER", sourceModule: "transfer", itemSku: "MAT-014", quantity: "1", sourceCode: "WAREHOUSE", targetCode: "KANDA", notes: "总仓调拨吸管", occurredAt: new Date("2026-03-04T09:15:00+08:00") },
    { transactionType: "WAREHOUSE_TRANSFER", sourceModule: "transfer", itemSku: "MAT-017", quantity: "1", sourceCode: "WAREHOUSE", targetCode: "KANDA", notes: "总仓调拨一次性手套", occurredAt: new Date("2026-03-04T09:18:00+08:00") },
    { transactionType: "WAREHOUSE_TRANSFER", sourceModule: "transfer", itemSku: "MAT-018", quantity: "4", sourceCode: "WAREHOUSE", targetCode: "KANDA", notes: "总仓调拨餐巾纸", occurredAt: new Date("2026-03-04T09:20:00+08:00") },
    { transactionType: "WAREHOUSE_TRANSFER", sourceModule: "transfer", itemSku: "MAT-001", quantity: "4", sourceCode: "WAREHOUSE", targetCode: "KANDA", notes: "总仓调拨红茶茶叶", occurredAt: new Date("2026-03-04T09:25:00+08:00") },
    { transactionType: "WAREHOUSE_TRANSFER", sourceModule: "transfer", itemSku: "MAT-002", quantity: "3", sourceCode: "WAREHOUSE", targetCode: "UENO", notes: "总仓调拨绿茶茶叶", occurredAt: new Date("2026-03-04T09:30:00+08:00") },
    { transactionType: "WAREHOUSE_TRANSFER", sourceModule: "transfer", itemSku: "MAT-008", quantity: "6", sourceCode: "WAREHOUSE", targetCode: "KANDA", notes: "总仓调拨珍珠", occurredAt: new Date("2026-03-04T09:35:00+08:00") },
    { transactionType: "WAREHOUSE_TRANSFER", sourceModule: "transfer", itemSku: "MAT-009", quantity: "4", sourceCode: "WAREHOUSE", targetCode: "UENO", notes: "总仓调拨椰果", occurredAt: new Date("2026-03-04T09:40:00+08:00") },
    { transactionType: "OUTBOUND", sourceModule: "quick-adjust", itemSku: "MAT-004", quantity: "7", sourceCode: "KANDA", notes: "门店日常销售消耗", occurredAt: new Date("2026-03-06T18:10:00+08:00") },
    { transactionType: "OUTBOUND", sourceModule: "quick-adjust", itemSku: "MAT-004", quantity: "6", sourceCode: "UENO", notes: "门店日常销售消耗", occurredAt: new Date("2026-03-06T18:12:00+08:00") },
    { transactionType: "OUTBOUND", sourceModule: "quick-adjust", itemSku: "MAT-012", quantity: "1", sourceCode: "KANDA", notes: "门店包材消耗", occurredAt: new Date("2026-03-06T18:15:00+08:00") },
    { transactionType: "OUTBOUND", sourceModule: "quick-adjust", itemSku: "MAT-015", quantity: "2", sourceCode: "UENO", notes: "外带纸袋消耗", occurredAt: new Date("2026-03-06T18:18:00+08:00") },
    { transactionType: "DAMAGE", sourceModule: "quick-adjust", itemSku: "MAT-011", quantity: "20", sourceCode: "WAREHOUSE", notes: "运输破损报损", occurredAt: new Date("2026-03-07T09:00:00+08:00") },
    { transactionType: "ADJUSTMENT", sourceModule: "quick-adjust", itemSku: "MAT-019", quantity: "1", targetCode: "KANDA", notes: "临时补充闭店清洁剂", occurredAt: new Date("2026-03-07T10:20:00+08:00") },
    { transactionType: "WAREHOUSE_TRANSFER", sourceModule: "transfer", itemSku: "MAT-015", quantity: "5", sourceCode: "WAREHOUSE", targetCode: "UENO", notes: "总仓调拨纸袋", occurredAt: new Date("2026-03-07T10:30:00+08:00") },
    { transactionType: "ADJUSTMENT", sourceModule: "inventory-page", itemSku: "MAT-018", quantity: "1", sourceCode: "KANDA", notes: "闭店盘整后修正损耗", occurredAt: new Date("2026-03-07T22:00:00+08:00") }
  ];

  for (const movement of initialMovements) {
    const item = itemsBySku[movement.itemSku];
    const source = movement.sourceCode ? locationsByCode[movement.sourceCode as keyof typeof locationsByCode] : undefined;
    const target = movement.targetCode ? locationsByCode[movement.targetCode as keyof typeof locationsByCode] : undefined;

    await prisma.$transaction(async (tx) => {
      await applyMovement(
        tx,
        {
          ...movement,
          itemId: item.id,
          unitId: item.baseUnitId,
          operatorId: adminUser.id,
          itemName: item.name,
          unitNameSnapshot: unitByCode[units.find((unit) => unit.id === item.baseUnitId)?.code ?? "piece"].symbol ?? units.find((unit) => unit.id === item.baseUnitId)?.name ?? "",
          sourceLocationId: source?.id,
          targetLocationId: target?.id,
          sourceLocationName: source?.name,
          targetLocationName: target?.name
        },
        sequence
      );
    });

    sequence += 1;
  }

  const kandaPearlInventory = await prisma.inventory.findFirstOrThrow({
    where: {
      item: {
        sku: "MAT-008"
      },
      location: {
        code: "KANDA"
      }
    }
  });

  const stocktake = await prisma.stocktake.create({
    data: {
      stocktakeNo: "STK-20260308-000001",
      locationId: kanda.id,
      createdById: adminUser.id,
      notes: "神田店晚班盘点",
      status: "DRAFT"
    }
  });

  const stocktakeLine = await prisma.stocktakeItem.create({
    data: {
      stocktakeId: stocktake.id,
      itemId: itemsBySku["MAT-008"].id,
      unitId: itemsBySku["MAT-008"].baseUnitId,
      systemQuantity: kandaPearlInventory.quantity,
      countedQuantity: kandaPearlInventory.quantity.minus(new Prisma.Decimal(1)),
      differenceQuantity: new Prisma.Decimal(-1),
      notes: "晚班盘点发现珍珠少 1 袋"
    }
  });

  const stocktakeAdjustment = await prisma.$transaction(async (tx) =>
    applyMovement(
      tx,
      {
        transactionType: "STOCKTAKE_ADJUSTMENT",
        sourceModule: "stocktake",
        itemSku: "MAT-008",
        quantity: "1",
        sourceCode: "KANDA",
        notes: "盘点修正：神田店晚班盘点",
        occurredAt: new Date("2026-03-08T22:15:00+08:00"),
        referenceNo: stocktake.stocktakeNo,
        stocktakeId: stocktake.id,
        itemId: itemsBySku["MAT-008"].id,
        unitId: itemsBySku["MAT-008"].baseUnitId,
        operatorId: adminUser.id,
        itemName: itemsBySku["MAT-008"].name,
        unitNameSnapshot: unitByCode.bag.symbol ?? unitByCode.bag.name,
        sourceLocationId: kanda.id,
        sourceLocationName: kanda.name
      },
      sequence
    )
  );
  sequence += 1;

  await prisma.stocktakeItem.update({
    where: {
      id: stocktakeLine.id
    },
    data: {
      adjustmentTransactionId: stocktakeAdjustment.id
    }
  });

  await prisma.stocktake.update({
    where: {
      id: stocktake.id
    },
    data: {
      status: "COMPLETED",
      completedById: adminUser.id,
      completedAt: new Date("2026-03-08T22:16:00+08:00")
    }
  });

  const kandaCupInventory = await prisma.inventory.findFirstOrThrow({
    where: {
      item: {
        sku: "MAT-012"
      },
      location: {
        code: "KANDA"
      }
    }
  });

  await prisma.inventory.update({
    where: {
      id: kandaCupInventory.id
    },
    data: {
      safetyStockOverride: new Prisma.Decimal("1.5")
    }
  });

  const uenoMilkInventory = await prisma.inventory.findFirstOrThrow({
    where: {
      item: {
        sku: "MAT-004"
      },
      location: {
        code: "UENO"
      }
    }
  });

  await prisma.inventory.update({
    where: {
      id: uenoMilkInventory.id
    },
    data: {
      safetyStockOverride: new Prisma.Decimal("12"),
      alertEnabledOverride: true
    }
  });

  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
