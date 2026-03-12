import { PrismaClient } from "@prisma/client";
import { clearOperationalData } from "./seed-core";

const prisma = new PrismaClient();

async function main() {
  await clearOperationalData(prisma);
  console.log("Operational demo data cleared.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
