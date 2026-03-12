import { revalidatePath } from "next/cache";

type ManagedResource = "items" | "locations" | "units" | "users";

const resourceBasePaths: Record<ManagedResource, string> = {
  items: "/items",
  locations: "/locations",
  units: "/units",
  users: "/users"
};

export function revalidateManagedResource(resource: ManagedResource, id?: string) {
  const basePath = resourceBasePaths[resource];
  revalidatePath(basePath);

  if (id) {
    revalidatePath(`${basePath}/${id}`);
  }
}

const inventoryViewPaths = [
  "/",
  "/inventory",
  "/transactions",
  "/transfers",
  "/stocktakes",
  "/alerts",
  "/reports",
  "/quick-adjust"
] as const;

export function revalidateInventoryViews() {
  inventoryViewPaths.forEach((path) => {
    revalidatePath(path);
  });
}
