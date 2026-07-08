import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log("Updating database schema...")
    await prisma.$executeRawUnsafe(`ALTER TABLE "ReservaAtacado" ALTER COLUMN "assinaturaId" DROP NOT NULL;`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ConfiguracaoFinanceira" ADD COLUMN IF NOT EXISTS "exigirAssinaturaAtacado" BOOLEAN NOT NULL DEFAULT true;`)
    console.log("Schema updated successfully!")
  } catch(e) {
    console.error("Error updating schema:", e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
