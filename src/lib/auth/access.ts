import { AppError } from "@/lib/api";
import type { SessionUser } from "@/types/domain";

export function isAdmin(user: SessionUser) {
  return user.roleCode === "ADMIN";
}

export function isStoreClerk(user: SessionUser) {
  return user.roleCode === "STORE_CLERK";
}

export function isWarehouseStaff(user: SessionUser) {
  return user.roleCode === "WAREHOUSE_STAFF";
}

export function assertAdmin(user: SessionUser) {
  if (!isAdmin(user)) {
    throw new AppError("只有管理员可以执行该操作", 403);
  }
}

export function getScopedLocationIds(user: SessionUser, allLocationIds: string[]) {
  if (isAdmin(user) || isWarehouseStaff(user)) {
    return allLocationIds;
  }

  return user.defaultLocationId ? [user.defaultLocationId] : [];
}

export function assertLocationReadable(user: SessionUser, locationId: string) {
  if (isAdmin(user) || isWarehouseStaff(user)) {
    return;
  }

  if (user.defaultLocationId !== locationId) {
    throw new AppError("无权查看该地点数据", 403);
  }
}

export function assertLocationManageable(user: SessionUser, locationId: string) {
  if (isAdmin(user)) {
    return;
  }

  if (isWarehouseStaff(user)) {
    if (user.defaultLocationId !== locationId) {
      throw new AppError("仓库人员只能直接管理所属仓库库存", 403);
    }

    return;
  }

  if (user.defaultLocationId !== locationId) {
    throw new AppError("店员只能操作所属门店库存", 403);
  }
}

export function assertTransferAllowed(
  user: SessionUser,
  sourceLocationId: string,
  targetLocationId: string
) {
  if (isAdmin(user)) {
    return;
  }

  if (isWarehouseStaff(user)) {
    if (user.defaultLocationId !== sourceLocationId && user.defaultLocationId !== targetLocationId) {
      throw new AppError("仓库人员只能操作涉及所属仓库的调拨", 403);
    }

    return;
  }

  if (user.defaultLocationId !== sourceLocationId && user.defaultLocationId !== targetLocationId) {
    throw new AppError("店员只能操作所属门店相关调拨", 403);
  }
}

