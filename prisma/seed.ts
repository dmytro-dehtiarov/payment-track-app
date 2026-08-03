import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

async function main() {
  const existing = await prisma.settings.findFirst();
  if (existing) {
    console.log("Settings row already exists, skipping seed.");
    return;
  }

  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!initialPassword) {
    throw new Error("ADMIN_INITIAL_PASSWORD is not set in the environment.");
  }

  const passwordHash = await bcrypt.hash(initialPassword, 12);

  await prisma.settings.create({
    data: {
      theme: "light",
      language: "ru",
      currencySymbol: "грн",
      passwordHash,
    },
  });

  console.log("Seeded initial Settings row.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
