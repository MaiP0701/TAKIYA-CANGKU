import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/api";
import { assertAdmin, assertLocationReadable, getScopedLocationIds } from "@/lib/auth/access";
import {
  inventoryOperationLabels,
  locationTypeLabels,
  sourceModuleLabels
} from "@/lib/constants/inventory";
import { prisma } from "@/lib/db/prisma";
import type { SessionUser } from "@/types/domain";

type BootstrapOptions = {
  includeCategories?: boolean;
  includeUnits?: boolean;
  includeRoles?: boolean;
};

type InventoryFilters = {
  query?: string;
  categoryId?: string;
  locationId?: string;
  lowStock?: string;
  active?: string;
};

type InventoryLogFilters = {
  query?: string;
  type?: string;
  locationId?: string;
  operatorId?: string;
  sourceModule?: string;
  dateFrom?: string;
  dateTo?: string;
  take?: number;
};

type PaginationOptions = {
  page?: number;
  pageSize?: number;
};

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  return Number(value);
}

function lowStockValue(currentQty: number, threshold: number, enabled: boolean) {
  return enabled && currentQty <= threshold;
}

function getThresholdValue(row: {
  safetyStockOverride: Prisma.Decimal | null;
  item: {
    safetyStock: Prisma.Decimal;
  };
}) {
  return toNumber(row.safetyStockOverride ?? row.item.safetyStock) ?? 0;
}

function getAlertEnabledValue(row: {
  alertEnabledOverride: boolean | null;
  item: {
    alertEnabled: boolean;
  };
}) {
  return row.alertEnabledOverride ?? row.item.alertEnabled;
}

export async function getAccessibleLocations(
  user: SessionUser,
  options?: {
    activeOnly?: boolean;
  }
) {
  const allLocations = await prisma.location.findMany({
    where: options?.activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });

  const scopedIds = getScopedLocationIds(
    user,
    allLocations.map((location) => location.id)
  );

  return allLocations.filter((location) => scopedIds.includes(location.id));
}

export async function getBootstrapData(user: SessionUser, options?: BootstrapOptions) {
  const [locations, categories, units, roles] = await Promise.all([
    getAccessibleLocations(user, { activeOnly: true }),
    options?.includeCategories === false
      ? Promise.resolve([])
      : prisma.category.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
        }),
    options?.includeUnits === false
      ? Promise.resolve([])
      : prisma.unit.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
        }),
    options?.includeRoles === true
      ? prisma.role.findMany({
          orderBy: [{ name: "asc" }]
        })
      : Promise.resolve([])
  ]);

  return {
    locations: locations.map((location) => ({
      id: location.id,
      code: location.code,
      name: location.name,
      type: location.type,
      typeLabel: locationTypeLabels[location.type],
      isActive: location.isActive
    })),
    categories: categories.map((category) => ({
      id: category.id,
      code: category.code,
      name: category.name
    })),
    units: units.map((unit) => ({
      id: unit.id,
      code: unit.code,
      name: unit.name,
      symbol: unit.symbol,
      precision: unit.precision
    })),
    roles: roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name
    }))
  };
}

type ItemListFilters = {
  query?: string;
  categoryId?: string;
  active?: string;
};

export async function getItems(filters: ItemListFilters) {
  const items = await prisma.item.findMany({
    where: {
      OR: filters.query
        ? [
            {
              name: {
                contains: filters.query,
                mode: "insensitive"
              }
            },
            {
              sku: {
                contains: filters.query,
                mode: "insensitive"
              }
            }
          ]
        : undefined,
      categoryId: filters.categoryId || undefined,
      isActive:
        filters.active === "true" ? true : filters.active === "false" ? false : undefined
    },
    include: {
      category: true,
      baseUnit: true
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }]
  });

  return items.map((item) => ({
    id: item.id,
    sku: item.sku,
    name: item.name,
    categoryName: item.category.name,
    categoryId: item.categoryId,
    baseUnitId: item.baseUnitId,
    baseUnitName: item.baseUnit.name,
    baseUnitSymbol: item.baseUnit.symbol,
    specification: item.specification,
    safetyStock: toNumber(item.safetyStock) ?? 0,
    alertEnabled: item.alertEnabled,
    brand: item.brand,
    supplierName: item.supplierName,
    shelfLifeDays: item.shelfLifeDays,
    notes: item.notes,
    isActive: item.isActive
  }));
}

export async function getItemOptions(filters?: {
  active?: boolean;
  limit?: number;
}) {
  const items = await prisma.item.findMany({
    where: {
      isActive: filters?.active === false ? undefined : true
    },
    select: {
      id: true,
      name: true
    },
    orderBy: {
      name: "asc"
    },
    take: filters?.limit ?? 120
  });

  return items;
}

function sanitizePagination(options?: PaginationOptions) {
  const page = Math.max(1, Number(options?.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(options?.pageSize ?? 50) || 50));

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize
  };
}

async function resolveAccessibleLocationIds(user: SessionUser, locationId?: string) {
  if (locationId) {
    assertLocationReadable(user, locationId);
  }

  const accessibleLocations = await getAccessibleLocations(user);
  const locationIds = locationId
    ? [locationId]
    : accessibleLocations.map((location) => location.id);

  return {
    accessibleLocations,
    locationIds
  };
}

function buildInventoryWhere(filters: InventoryFilters, locationIds: string[]) {
  return {
    locationId: {
      in: locationIds
    },
    item: {
      categoryId: filters.categoryId || undefined,
      isActive:
        filters.active === "true" ? true : filters.active === "false" ? false : undefined,
      OR: filters.query
        ? [
            {
              name: {
                contains: filters.query,
                mode: "insensitive" as const
              }
            },
            {
              sku: {
                contains: filters.query,
                mode: "insensitive" as const
              }
            }
          ]
        : undefined
    }
  } satisfies Prisma.InventoryWhereInput;
}

function mapInventoryRow(
  row: {
    id: string;
    itemId: string;
    locationId: string;
    quantity: Prisma.Decimal;
    safetyStockOverride: Prisma.Decimal | null;
    alertEnabledOverride: boolean | null;
    updatedAt?: Date;
    lastTransactionAt?: Date | null;
    item: {
      name: string;
      sku: string;
      isActive: boolean;
      safetyStock: Prisma.Decimal;
      alertEnabled: boolean;
      category: {
        name: string;
      };
      baseUnit: {
        name: string;
        symbol: string | null;
      };
    };
    location: {
      name: string;
      isActive: boolean;
    };
    lastOperator?: {
      displayName: string;
    } | null;
  }
) {
  const currentQty = toNumber(row.quantity) ?? 0;
  const safetyStock = getThresholdValue(row);
  const alertEnabled = getAlertEnabledValue(row);

  return {
    id: row.id,
    itemId: row.itemId,
    itemName: row.item.name,
    sku: row.item.sku,
    itemIsActive: row.item.isActive,
    categoryName: row.item.category.name,
    locationId: row.locationId,
    locationName: row.location.name,
    locationIsActive: row.location.isActive,
    quantity: currentQty,
    unitName: row.item.baseUnit.name,
    unitSymbol: row.item.baseUnit.symbol,
    safetyStock,
    alertEnabled,
    isLowStock: lowStockValue(currentQty, safetyStock, alertEnabled),
    lastUpdatedAt: row.updatedAt?.toISOString() ?? null,
    lastTransactionAt: row.lastTransactionAt?.toISOString() ?? null,
    lastOperatorName: row.lastOperator?.displayName ?? null
  };
}

export async function getInventoryList(user: SessionUser, filters: InventoryFilters) {
  const { locationIds } = await resolveAccessibleLocationIds(user, filters.locationId);
  const where = buildInventoryWhere(filters, locationIds);

  const inventoryRows = await prisma.inventory.findMany({
    where,
    select: {
      id: true,
      itemId: true,
      locationId: true,
      quantity: true,
      safetyStockOverride: true,
      alertEnabledOverride: true,
      updatedAt: true,
      lastTransactionAt: true,
      item: {
        select: {
          name: true,
          sku: true,
          isActive: true,
          safetyStock: true,
          alertEnabled: true,
          category: {
            select: {
              name: true
            }
          },
          baseUnit: {
            select: {
              name: true,
              symbol: true
            }
          }
        }
      },
      location: {
        select: {
          name: true,
          isActive: true,
          sortOrder: true
        }
      },
      lastOperator: {
        select: {
          displayName: true
        }
      }
    },
    orderBy: [{ location: { sortOrder: "asc" } }, { item: { name: "asc" } }]
  });

  const rows = inventoryRows.map(mapInventoryRow);

  if (filters.lowStock === "true") {
    return rows.filter((row) => row.isLowStock);
  }

  return rows;
}

export async function getPaginatedInventoryList(
  user: SessionUser,
  filters: InventoryFilters,
  options?: PaginationOptions
) {
  const { page, pageSize, skip } = sanitizePagination(options);
  const { locationIds } = await resolveAccessibleLocationIds(user, filters.locationId);
  const where = buildInventoryWhere(filters, locationIds);

  if (filters.lowStock === "true") {
    const rows = await getInventoryList(user, filters);
    const total = rows.length;

    return {
      rows: rows.slice(skip, skip + pageSize),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
  }

  const [total, inventoryRows] = await Promise.all([
    prisma.inventory.count({ where }),
    prisma.inventory.findMany({
      where,
      select: {
        id: true,
        itemId: true,
        locationId: true,
        quantity: true,
        safetyStockOverride: true,
        alertEnabledOverride: true,
        updatedAt: true,
        lastTransactionAt: true,
        item: {
          select: {
            name: true,
            sku: true,
            isActive: true,
            safetyStock: true,
            alertEnabled: true,
            category: {
              select: {
                name: true
              }
            },
            baseUnit: {
              select: {
                name: true,
                symbol: true
              }
            }
          }
        },
        location: {
          select: {
            name: true,
            isActive: true,
            sortOrder: true
          }
        },
        lastOperator: {
          select: {
            displayName: true
          }
        }
      },
      orderBy: [{ location: { sortOrder: "asc" } }, { item: { name: "asc" } }],
      skip,
      take: pageSize
    })
  ]);

  return {
    rows: inventoryRows.map(mapInventoryRow),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}

export async function getInventoryLogs(user: SessionUser, filters: InventoryLogFilters) {
  const { locationIds } = await resolveAccessibleLocationIds(user, filters.locationId);

  const logs = await prisma.inventoryChangeLog.findMany({
    where: {
      locationId: {
        in: locationIds
      },
      operationType: filters.type ? (filters.type as any) : undefined,
      sourceModule: filters.sourceModule || undefined,
      operatorId: filters.operatorId || undefined,
      itemNameSnapshot: filters.query
        ? {
            contains: filters.query,
            mode: "insensitive"
          }
        : undefined,
      createdAt: {
        gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        lte: filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : undefined
      }
    },
    include: {
      operator: true,
      transaction: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: filters.take ?? 100
  });

  return logs.map((log) => ({
    id: log.id,
    transactionId: log.transactionId,
    transactionNo: log.transaction.transactionNo,
    operationType: log.operationType,
    operationLabel: inventoryOperationLabels[log.operationType],
    sourceModule: log.sourceModule,
    sourceModuleLabel: sourceModuleLabels[log.sourceModule] ?? log.sourceModule,
    itemId: log.itemId,
    itemName: log.itemNameSnapshot,
    locationId: log.locationId,
    locationName: log.locationNameSnapshot,
    quantityChange: toNumber(log.quantityChange) ?? 0,
    beforeQuantity: toNumber(log.beforeQuantity) ?? 0,
    afterQuantity: toNumber(log.afterQuantity) ?? 0,
    unitName: log.unitNameSnapshot,
    operatorId: log.operatorId,
    operatorName: log.operatorNameSnapshot || log.operator.displayName,
    remark: log.remark,
    createdAt: log.createdAt.toISOString()
  }));
}

export async function getTransactions(user: SessionUser, filters: InventoryLogFilters) {
  return getInventoryLogs(user, filters);
}

export async function getTransferTransactions(
  user: SessionUser,
  filters?: {
    locationId?: string;
  }
) {
  if (filters?.locationId) {
    assertLocationReadable(user, filters.locationId);
  }

  const accessibleLocations = await getAccessibleLocations(user);
  const locationIds = filters?.locationId
    ? [filters.locationId]
    : accessibleLocations.map((location) => location.id);

  const rows = await prisma.inventoryTransaction.findMany({
    where: {
      transactionType: {
        in: ["WAREHOUSE_TRANSFER", "STORE_TRANSFER", "STORE_RETURN"]
      },
      OR: [
        {
          sourceLocationId: {
            in: locationIds
          }
        },
        {
          targetLocationId: {
            in: locationIds
          }
        }
      ]
    },
    include: {
      item: true,
      unit: true,
      sourceLocation: true,
      targetLocation: true,
      operator: true
    },
    orderBy: {
      occurredAt: "desc"
    },
    take: 100
  });

  return rows.map((row) => ({
    id: row.id,
    transactionNo: row.transactionNo,
    transactionType: row.transactionType,
    operationLabel: inventoryOperationLabels[row.transactionType],
    itemName: row.item.name,
    sourceLocationName: row.sourceLocation?.name ?? null,
    targetLocationName: row.targetLocation?.name ?? null,
    quantity: toNumber(row.quantity) ?? 0,
    unitName: row.unit.symbol ?? row.unit.name,
    operatorName: row.operator.displayName,
    occurredAt: row.occurredAt.toISOString(),
    notes: row.notes
  }));
}

export async function getAlertList(user: SessionUser, locationId?: string) {
  const rows = await getInventoryList(user, {
    locationId,
    lowStock: "true"
  });

  return rows.sort((left, right) => {
    const leftGap = left.safetyStock - left.quantity;
    const rightGap = right.safetyStock - right.quantity;
    return rightGap - leftGap;
  });
}

export async function getDashboardSummary(user: SessionUser) {
  const accessibleLocations = await getAccessibleLocations(user);
  const locationIds = accessibleLocations.map((location) => location.id);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const [itemCount, inventoryRows, recentLogs, todayTransactionCount] = await Promise.all([
    prisma.item.count({
      where: {
        isActive: true
      }
    }),
    prisma.inventory.findMany({
      where: {
        locationId: {
          in: locationIds
        }
      },
      select: {
        id: true,
        itemId: true,
        locationId: true,
        quantity: true,
        safetyStockOverride: true,
        alertEnabledOverride: true,
        item: {
          select: {
            name: true,
            sku: true,
            isActive: true,
            safetyStock: true,
            alertEnabled: true,
            category: {
              select: {
                name: true
              }
            },
            baseUnit: {
              select: {
                name: true,
                symbol: true
              }
            }
          }
        },
        location: {
          select: {
            name: true,
            isActive: true
          }
        }
      }
    }),
    getInventoryLogs(user, {
      take: 8
    }),
    prisma.inventoryChangeLog.count({
      where: {
        locationId: {
          in: locationIds
        },
        createdAt: {
          gte: startOfToday,
          lt: startOfTomorrow
        }
      }
    })
  ]);

  const mappedRows = inventoryRows.map((row) =>
    mapInventoryRow({
      ...row,
      lastOperator: null,
      lastTransactionAt: null,
      updatedAt: undefined
    })
  );
  const lowStockRows = mappedRows.filter((row) => row.isLowStock);

  return {
    stats: {
      itemCount,
      lowStockCount: lowStockRows.length,
      locationCount: accessibleLocations.length,
      todayTransactionCount
    },
    locations: accessibleLocations.map((location) => {
      const rows = mappedRows.filter((row) => row.locationId === location.id);
      return {
        id: location.id,
        name: location.name,
        type: location.type,
        typeLabel: locationTypeLabels[location.type],
        itemCount: rows.length,
        lowStockCount: rows.filter((row) => row.isLowStock).length
      };
    }),
    recentTransactions: recentLogs.slice(0, 8),
    replenishmentList: lowStockRows
      .sort((left, right) => right.safetyStock - right.quantity - (left.safetyStock - left.quantity))
      .slice(0, 8)
  };
}

export async function getStocktakes(user: SessionUser, locationId?: string) {
  if (locationId) {
    assertLocationReadable(user, locationId);
  }

  const accessibleLocations = await getAccessibleLocations(user);
  const locationIds = locationId ? [locationId] : accessibleLocations.map((location) => location.id);

  const stocktakes = await prisma.stocktake.findMany({
    where: {
      locationId: {
        in: locationIds
      }
    },
    include: {
      location: true,
      createdBy: true,
      completedBy: true,
      items: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 50
  });

  return stocktakes.map((stocktake) => ({
    id: stocktake.id,
    stocktakeNo: stocktake.stocktakeNo,
    locationId: stocktake.locationId,
    locationName: stocktake.location.name,
    status: stocktake.status,
    lineCount: stocktake.items.length,
    createdByName: stocktake.createdBy.displayName,
    completedByName: stocktake.completedBy?.displayName ?? null,
    createdAt: stocktake.createdAt.toISOString(),
    completedAt: stocktake.completedAt?.toISOString() ?? null,
    notes: stocktake.notes
  }));
}

export async function getStocktakeDetail(user: SessionUser, stocktakeId: string) {
  const stocktake = await prisma.stocktake.findUnique({
    where: {
      id: stocktakeId
    },
    include: {
      location: true,
      createdBy: true,
      completedBy: true,
      items: {
        include: {
          item: true,
          unit: true
        },
        orderBy: {
          item: {
            name: "asc"
          }
        }
      }
    }
  });

  if (!stocktake) {
    throw new AppError("盘点单不存在", 404);
  }

  assertLocationReadable(user, stocktake.locationId);

  return {
    id: stocktake.id,
    stocktakeNo: stocktake.stocktakeNo,
    locationId: stocktake.locationId,
    locationName: stocktake.location.name,
    status: stocktake.status,
    createdByName: stocktake.createdBy.displayName,
    completedByName: stocktake.completedBy?.displayName ?? null,
    createdAt: stocktake.createdAt.toISOString(),
    completedAt: stocktake.completedAt?.toISOString() ?? null,
    notes: stocktake.notes,
    items: stocktake.items.map((line) => ({
      id: line.id,
      itemId: line.itemId,
      itemName: line.item.name,
      unitName: line.unit.symbol ?? line.unit.name,
      systemQuantity: toNumber(line.systemQuantity) ?? 0,
      countedQuantity: toNumber(line.countedQuantity) ?? 0,
      differenceQuantity: toNumber(line.differenceQuantity) ?? 0,
      notes: line.notes
    }))
  };
}

export async function getUsers(user: SessionUser) {
  assertAdmin(user);

  const users = await prisma.user.findMany({
    include: {
      role: true,
      defaultLocation: true
    },
    orderBy: [{ isActive: "desc" }, { username: "asc" }]
  });

  return users.map((record) => ({
    id: record.id,
    username: record.username,
    email: record.email,
    displayName: record.displayName,
    roleId: record.roleId,
    roleName: record.role.name,
    defaultLocationId: record.defaultLocationId,
    defaultLocationName: record.defaultLocation?.name ?? null,
    isActive: record.isActive
  }));
}

export async function getLocations(
  user: SessionUser,
  filters?: {
    active?: string;
    query?: string;
  }
) {
  assertAdmin(user);

  const rows = await prisma.location.findMany({
    where: {
      isActive:
        filters?.active === "true" ? true : filters?.active === "false" ? false : undefined,
      OR: filters?.query
        ? [
            {
              name: {
                contains: filters.query,
                mode: "insensitive"
              }
            },
            {
              code: {
                contains: filters.query,
                mode: "insensitive"
              }
            }
          ]
        : undefined
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    type: row.type,
    typeLabel: locationTypeLabels[row.type],
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    remark: row.remark,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }));
}

export async function getUnits(
  user: SessionUser,
  filters?: {
    active?: string;
    query?: string;
  }
) {
  assertAdmin(user);

  const rows = await prisma.unit.findMany({
    where: {
      isActive:
        filters?.active === "true" ? true : filters?.active === "false" ? false : undefined,
      OR: filters?.query
        ? [
            {
              name: {
                contains: filters.query,
                mode: "insensitive"
              }
            },
            {
              code: {
                contains: filters.query,
                mode: "insensitive"
              }
            },
            {
              symbol: {
                contains: filters.query,
                mode: "insensitive"
              }
            }
          ]
        : undefined
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    symbol: row.symbol,
    precision: row.precision,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    remark: row.remark,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }));
}

export async function getInventorySnapshotForLocation(user: SessionUser, locationId: string) {
  assertLocationReadable(user, locationId);

  const rows = await prisma.inventory.findMany({
    where: {
      locationId,
      item: {
        isActive: true
      }
    },
    include: {
      item: {
        include: {
          baseUnit: true,
          category: true
        }
      }
    },
    orderBy: {
      item: {
        name: "asc"
      }
    }
  });

  return rows.map((row) => ({
    itemId: row.itemId,
    itemName: row.item.name,
    categoryName: row.item.category.name,
    systemQuantity: toNumber(row.quantity) ?? 0,
    unitName: row.item.baseUnit.symbol ?? row.item.baseUnit.name
  }));
}

export async function searchQuickAdjustItems(
  user: SessionUser,
  input: {
    locationId: string;
    query?: string;
    limit?: number;
  }
) {
  assertLocationReadable(user, input.locationId);

  const location = await prisma.location.findUnique({
    where: {
      id: input.locationId
    }
  });

  if (!location) {
    throw new AppError("地点不存在", 404);
  }

  if (!location.isActive) {
    throw new AppError("停用地点不能进行新的快速出入库", 400);
  }

  const items = await prisma.item.findMany({
    where: {
      isActive: true,
      OR: input.query
        ? [
            {
              name: {
                contains: input.query,
                mode: "insensitive"
              }
            },
            {
              sku: {
                contains: input.query,
                mode: "insensitive"
              }
            }
          ]
        : undefined
    },
    include: {
      category: true,
      baseUnit: true,
      inventories: {
        where: {
          locationId: input.locationId
        },
        take: 1
      }
    },
    orderBy: [{ name: "asc" }],
    take: input.limit ?? 20
  });

  return items.map((item) => {
    const inventory = item.inventories[0];
    const quantity = toNumber(inventory?.quantity) ?? 0;
    const threshold = toNumber(inventory?.safetyStockOverride ?? item.safetyStock) ?? 0;
    const alertEnabled = inventory?.alertEnabledOverride ?? item.alertEnabled;

    return {
      itemId: item.id,
      itemName: item.name,
      sku: item.sku,
      categoryName: item.category.name,
      unitName: item.baseUnit.symbol ?? item.baseUnit.name,
      locationId: input.locationId,
      currentQuantity: quantity,
      safetyStock: threshold,
      isLowStock: lowStockValue(quantity, threshold, alertEnabled)
    };
  });
}

export async function getQuickAdjustRecentItems(
  user: SessionUser,
  locationId: string,
  limit = 6
) {
  assertLocationReadable(user, locationId);

  const logs = await prisma.inventoryChangeLog.findMany({
    where: {
      locationId,
      operatorId: user.id
    },
    orderBy: {
      createdAt: "desc"
    },
    distinct: ["itemId"],
    take: limit
  });

  if (logs.length === 0) {
    return [];
  }

  const itemIds = logs.map((log) => log.itemId);
  const inventoryRows = await prisma.inventory.findMany({
    where: {
      locationId,
      itemId: {
        in: itemIds
      }
    },
    include: {
      item: {
        include: {
          category: true,
          baseUnit: true
        }
      }
    }
  });

  return logs
    .map((log) => inventoryRows.find((row) => row.itemId === log.itemId))
    .filter(Boolean)
    .map((row) => {
      const inventory = row!;
      const quantity = toNumber(inventory.quantity) ?? 0;
      const threshold = getThresholdValue(inventory);
      const alertEnabled = getAlertEnabledValue(inventory);

      return {
        itemId: inventory.itemId,
        itemName: inventory.item.name,
        sku: inventory.item.sku,
        categoryName: inventory.item.category.name,
        unitName: inventory.item.baseUnit.symbol ?? inventory.item.baseUnit.name,
        locationId,
        currentQuantity: quantity,
        safetyStock: threshold,
        isLowStock: lowStockValue(quantity, threshold, alertEnabled)
      };
    });
}

export async function getStoreReport(
  user: SessionUser,
  filters?: {
    locationId?: string;
    categoryId?: string;
    lowStock?: string;
    sort?: string;
  },
  options?: PaginationOptions
) {
  const { page, pageSize, skip } = sanitizePagination(options);
  const inventoryRows = await getInventoryList(user, {
    locationId: filters?.locationId,
    categoryId: filters?.categoryId,
    lowStock: filters?.lowStock
  });
  const recentLogs = await getInventoryLogs(user, {
    locationId: filters?.locationId,
    take: 12
  });

  const sortedRows = [...inventoryRows].sort((left, right) => {
    switch (filters?.sort) {
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

  const categoryMap = new Map<
    string,
    { categoryName: string; itemCount: number; lowStockCount: number; totalQuantity: number }
  >();
  const locationMap = new Map<
    string,
    { locationId: string; locationName: string; itemCount: number; lowStockCount: number }
  >();

  for (const row of sortedRows) {
    const categoryEntry = categoryMap.get(row.categoryName) ?? {
      categoryName: row.categoryName,
      itemCount: 0,
      lowStockCount: 0,
      totalQuantity: 0
    };
    categoryEntry.itemCount += 1;
    categoryEntry.totalQuantity += row.quantity;
    if (row.isLowStock) {
      categoryEntry.lowStockCount += 1;
    }
    categoryMap.set(row.categoryName, categoryEntry);

    const locationEntry = locationMap.get(row.locationId) ?? {
      locationId: row.locationId,
      locationName: row.locationName,
      itemCount: 0,
      lowStockCount: 0
    };
    locationEntry.itemCount += 1;
    if (row.isLowStock) {
      locationEntry.lowStockCount += 1;
    }
    locationMap.set(row.locationId, locationEntry);
  }

  return {
    stats: {
      inventoryRowCount: sortedRows.length,
      lowStockCount: sortedRows.filter((row) => row.isLowStock).length,
      locationCount: locationMap.size
    },
    inventoryRows: sortedRows.slice(skip, skip + pageSize),
    categorySummary: Array.from(categoryMap.values()).sort((left, right) =>
      left.categoryName.localeCompare(right.categoryName, "zh-CN")
    ),
    locationSummary: Array.from(locationMap.values()).sort((left, right) =>
      left.locationName.localeCompare(right.locationName, "zh-CN")
    ),
    recentLogs: recentLogs.slice(0, 12),
    replenishmentList: sortedRows.filter((row) => row.isLowStock).slice(0, 12),
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(sortedRows.length / pageSize))
  };
}
