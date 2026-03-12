import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

type SeedClient = PrismaClient;

const roles = [
  {
    code: "ADMIN",
    name: "管理员",
    description: "可查看和操作全部地点库存"
  },
  {
    code: "STORE_CLERK",
    name: "店员",
    description: "仅操作所属门店库存"
  },
  {
    code: "WAREHOUSE_STAFF",
    name: "仓库人员",
    description: "管理仓库库存及调拨"
  }
] as const;

const locations = [
  {
    code: "WAREHOUSE",
    name: "总仓",
    type: "WAREHOUSE" as const,
    sortOrder: 1,
    remark: "靠近神田店的总仓",
    isActive: true
  },
  {
    code: "KANDA",
    name: "神田店",
    type: "STORE" as const,
    sortOrder: 10,
    remark: "工作日客流较高",
    isActive: true
  },
  {
    code: "UENO",
    name: "上野店",
    type: "STORE" as const,
    sortOrder: 20,
    remark: "周末游客较多",
    isActive: true
  },
  {
    code: "IKEBUKURO",
    name: "池袋店",
    type: "STORE" as const,
    sortOrder: 30,
    remark: "筹备中，暂未启用",
    isActive: false
  }
] as const;

const categories = [
  {
    code: "INGREDIENT",
    name: "原料",
    sortOrder: 10,
    isActive: true
  },
  {
    code: "PACKAGING",
    name: "包材",
    sortOrder: 20,
    isActive: true
  },
  {
    code: "SUPPLY",
    name: "其他耗材",
    sortOrder: 30,
    isActive: true
  }
] as const;

const units = [
  {
    code: "kg",
    name: "千克",
    symbol: "kg",
    precision: 3,
    sortOrder: 10,
    isActive: true,
    remark: null
  },
  {
    code: "L",
    name: "升",
    symbol: "L",
    precision: 3,
    sortOrder: 20,
    isActive: true,
    remark: null
  },
  {
    code: "piece",
    name: "个",
    symbol: "个",
    precision: 0,
    sortOrder: 30,
    isActive: true,
    remark: null
  },
  {
    code: "sheet",
    name: "片",
    symbol: "片",
    precision: 0,
    sortOrder: 40,
    isActive: true,
    remark: null
  },
  {
    code: "bag",
    name: "袋",
    symbol: "袋",
    precision: 0,
    sortOrder: 50,
    isActive: true,
    remark: null
  },
  {
    code: "box",
    name: "箱",
    symbol: "箱",
    precision: 0,
    sortOrder: 60,
    isActive: true,
    remark: null
  },
  {
    code: "pack",
    name: "包",
    symbol: "包",
    precision: 0,
    sortOrder: 70,
    isActive: true,
    remark: null
  },
  {
    code: "bottle",
    name: "瓶",
    symbol: "瓶",
    precision: 0,
    sortOrder: 80,
    isActive: true,
    remark: null
  },
  {
    code: "tray",
    name: "托盘",
    symbol: "托",
    precision: 0,
    sortOrder: 90,
    isActive: false,
    remark: "预留停用单位示例"
  }
] as const;

const users = [
  {
    username: "admin",
    displayName: "系统管理员",
    email: "admin@example.com",
    password: "Admin123!",
    roleCode: "ADMIN",
    defaultLocationCode: "WAREHOUSE",
    isActive: true
  },
  {
    username: "kanda",
    displayName: "神田店店员",
    email: "kanda@example.com",
    password: "Store123!",
    roleCode: "STORE_CLERK",
    defaultLocationCode: "KANDA",
    isActive: true
  },
  {
    username: "warehouse",
    displayName: "总仓仓管",
    email: "warehouse@example.com",
    password: "Warehouse123!",
    roleCode: "WAREHOUSE_STAFF",
    defaultLocationCode: "WAREHOUSE",
    isActive: true
  }
] as const;

const items = [
  {
    sku: "MAT-001",
    name: "红茶茶叶",
    categoryCode: "INGREDIENT",
    unitCode: "kg",
    specification: "1袋=1kg",
    safetyStock: "3",
    notes: "茶底常备原料",
    alertEnabled: true,
    isActive: true
  },
  {
    sku: "MAT-002",
    name: "绿茶茶叶",
    categoryCode: "INGREDIENT",
    unitCode: "kg",
    specification: "1袋=1kg",
    safetyStock: "3",
    notes: "茶底常备原料",
    alertEnabled: true,
    isActive: true
  },
  {
    sku: "MAT-003",
    name: "乌龙茶茶叶",
    categoryCode: "INGREDIENT",
    unitCode: "kg",
    specification: "1袋=1kg",
    safetyStock: "3",
    notes: "茶底常备原料",
    alertEnabled: true,
    isActive: true
  },
  {
    sku: "MAT-004",
    name: "牛奶",
    categoryCode: "INGREDIENT",
    unitCode: "L",
    specification: "1箱=12L",
    safetyStock: "20",
    notes: "冷藏保存",
    alertEnabled: true,
    isActive: true
  },
  {
    sku: "MAT-005",
    name: "浓缩牛奶",
    categoryCode: "INGREDIENT",
    unitCode: "L",
    specification: "1箱=12L",
    safetyStock: "10",
    notes: "用于奶盖与甜品",
    alertEnabled: true,
    isActive: true
  },
  {
    sku: "MAT-006",
    name: "草莓果酱",
    categoryCode: "INGREDIENT",
    unitCode: "bottle",
    specification: "1瓶=1kg",
    safetyStock: "5",
    notes: "果酱类原料",
    alertEnabled: true,
    isActive: true
  },
  {
    sku: "MAT-007",
    name: "芒果果酱",
    categoryCode: "INGREDIENT",
    unitCode: "bottle",
    specification: "1瓶=1kg",
    safetyStock: "5",
    notes: "果酱类原料",
    alertEnabled: true,
    isActive: true
  },
  {
    sku: "MAT-008",
    name: "珍珠",
    categoryCode: "INGREDIENT",
    unitCode: "bag",
    specification: "1袋=3kg",
    safetyStock: "8",
    notes: "小料",
    alertEnabled: true,
    isActive: true
  },
  {
    sku: "MAT-009",
    name: "椰果",
    categoryCode: "INGREDIENT",
    unitCode: "bag",
    specification: "1袋=2kg",
    safetyStock: "5",
    notes: "小料",
    alertEnabled: true,
    isActive: true
  },
  {
    sku: "MAT-010",
    name: "蛋挞皮",
    categoryCode: "INGREDIENT",
    unitCode: "sheet",
    specification: "1包=30片",
    safetyStock: "100",
    notes: "冷冻保存",
    alertEnabled: true,
    isActive: true
  },
  {
    sku: "MAT-011",
    name: "鸡蛋",
    categoryCode: "INGREDIENT",
    unitCode: "piece",
    specification: "1箱=180个",
    safetyStock: "120",
    notes: "甜品制作",
    alertEnabled: true,
    isActive: true
  },
  {
    sku: "MAT-012",
    name: "中杯杯子",
    categoryCode: "PACKAGING",
    unitCode: "box",
    specification: "1箱=1000个",
    safetyStock: "2",
    notes: "12oz",
    alertEnabled: true,
    isActive: true
  },
  {
    sku: "MAT-013",
    name: "大杯杯子",
    categoryCode: "PACKAGING",
    unitCode: "box",
    specification: "1箱=1000个",
    safetyStock: "2",
    notes: "16oz",
    alertEnabled: true,
    isActive: true
  },
  {
    sku: "MAT-014",
    name: "吸管",
    categoryCode: "PACKAGING",
    unitCode: "box",
    specification: "1箱=2000支",
    safetyStock: "1",
    notes: "单支包装",
    alertEnabled: true,
    isActive: true
  },
  {
    sku: "MAT-015",
    name: "纸袋",
    categoryCode: "PACKAGING",
    unitCode: "pack",
    specification: "1包=100个",
    safetyStock: "4",
    notes: "外带使用",
    alertEnabled: true,
    isActive: true
  },
  {
    sku: "MAT-016",
    name: "塑料袋",
    categoryCode: "PACKAGING",
    unitCode: "pack",
    specification: "1包=100个",
    safetyStock: "5",
    notes: "外带使用",
    alertEnabled: true,
    isActive: true
  },
  {
    sku: "MAT-017",
    name: "一次性手套",
    categoryCode: "SUPPLY",
    unitCode: "box",
    specification: "1箱=1000只",
    safetyStock: "2",
    notes: "卫生防护",
    alertEnabled: true,
    isActive: true
  },
  {
    sku: "MAT-018",
    name: "餐巾纸",
    categoryCode: "SUPPLY",
    unitCode: "pack",
    specification: "1包=200张",
    safetyStock: "6",
    notes: "前台耗材",
    alertEnabled: true,
    isActive: true
  },
  {
    sku: "MAT-019",
    name: "清洁剂",
    categoryCode: "SUPPLY",
    unitCode: "bottle",
    specification: "1瓶=2L",
    safetyStock: "2",
    notes: "闭店清洁使用",
    alertEnabled: true,
    isActive: false
  }
] as const;

export async function clearOperationalData(prisma: SeedClient) {
  await prisma.$transaction(async (tx) => {
    await tx.stocktakeItem.deleteMany();
    await tx.stocktake.deleteMany();
    await tx.inventoryChangeLog.deleteMany();
    await tx.inventoryTransaction.deleteMany();
    await tx.inventory.deleteMany();
    await tx.session.deleteMany();
  });
}

export async function seedBaseData(prisma: SeedClient) {
  const seededRoles = await Promise.all(
    roles.map((role) =>
      prisma.role.upsert({
        where: { code: role.code },
        update: {
          name: role.name,
          description: role.description
        },
        create: role
      })
    )
  );
  const roleByCode = Object.fromEntries(seededRoles.map((role) => [role.code, role]));

  const seededLocations = await Promise.all(
    locations.map((location) =>
      prisma.location.upsert({
        where: { code: location.code },
        update: {
          name: location.name,
          type: location.type,
          isActive: location.isActive,
          sortOrder: location.sortOrder,
          remark: location.remark
        },
        create: location
      })
    )
  );
  const locationByCode = Object.fromEntries(
    seededLocations.map((location) => [location.code, location])
  );

  const seededCategories = await Promise.all(
    categories.map((category) =>
      prisma.category.upsert({
        where: { code: category.code },
        update: {
          name: category.name,
          sortOrder: category.sortOrder,
          isActive: category.isActive
        },
        create: category
      })
    )
  );
  const categoryByCode = Object.fromEntries(
    seededCategories.map((category) => [category.code, category])
  );

  const seededUnits = await Promise.all(
    units.map((unit) =>
      prisma.unit.upsert({
        where: { code: unit.code },
        update: {
          name: unit.name,
          symbol: unit.symbol,
          precision: unit.precision,
          isActive: unit.isActive,
          sortOrder: unit.sortOrder,
          remark: unit.remark
        },
        create: unit
      })
    )
  );
  const unitByCode = Object.fromEntries(seededUnits.map((unit) => [unit.code, unit]));

  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      displayName: "系统管理员",
      email: "admin@example.com",
      passwordHash: hashPassword("Admin123!"),
      roleId: roleByCode.ADMIN.id,
      defaultLocationId: locationByCode.WAREHOUSE.id,
      isActive: true
    },
    create: {
      username: "admin",
      displayName: "系统管理员",
      email: "admin@example.com",
      passwordHash: hashPassword("Admin123!"),
      roleId: roleByCode.ADMIN.id,
      defaultLocationId: locationByCode.WAREHOUSE.id,
      isActive: true
    }
  });

  await Promise.all(
    users
      .filter((user) => user.username !== "admin")
      .map((user) =>
        prisma.user.upsert({
          where: { username: user.username },
          update: {
            displayName: user.displayName,
            email: user.email,
            passwordHash: hashPassword(user.password),
            roleId: roleByCode[user.roleCode].id,
            defaultLocationId: locationByCode[user.defaultLocationCode].id,
            isActive: user.isActive
          },
          create: {
            username: user.username,
            displayName: user.displayName,
            email: user.email,
            passwordHash: hashPassword(user.password),
            roleId: roleByCode[user.roleCode].id,
            defaultLocationId: locationByCode[user.defaultLocationCode].id,
            isActive: user.isActive
          }
        })
      )
  );

  await Promise.all(
    items.map((item) =>
      prisma.item.upsert({
        where: { sku: item.sku },
        update: {
          name: item.name,
          categoryId: categoryByCode[item.categoryCode].id,
          baseUnitId: unitByCode[item.unitCode].id,
          specification: item.specification,
          safetyStock: item.safetyStock,
          alertEnabled: item.alertEnabled,
          notes: item.notes,
          isActive: item.isActive,
          createdById: adminUser.id
        },
        create: {
          sku: item.sku,
          name: item.name,
          categoryId: categoryByCode[item.categoryCode].id,
          baseUnitId: unitByCode[item.unitCode].id,
          specification: item.specification,
          safetyStock: item.safetyStock,
          alertEnabled: item.alertEnabled,
          notes: item.notes,
          isActive: item.isActive,
          createdById: adminUser.id
        }
      })
    )
  );

  return {
    roleCount: seededRoles.length,
    locationCount: seededLocations.length,
    categoryCount: seededCategories.length,
    unitCount: seededUnits.length,
    userCount: users.length,
    itemCount: items.length
  };
}
