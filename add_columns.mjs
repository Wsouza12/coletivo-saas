import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log("Adding columns...")
    await prisma.$executeRawUnsafe(`ALTER TABLE "RodadaAtacado" ADD COLUMN IF NOT EXISTS "loopAtivo" BOOLEAN NOT NULL DEFAULT false;`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "RodadaAtacado" ADD COLUMN IF NOT EXISTS "loopIntervaloHoras" INTEGER NOT NULL DEFAULT 12;`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "RodadaAtacado" ADD COLUMN IF NOT EXISTS "ultimoLoopEnviadoEm" TIMESTAMP(3);`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "RodadaAtacado" ADD COLUMN IF NOT EXISTS "codigoRastreio" TEXT;`)
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "RodadaAtacado_codigoRastreio_key" ON "RodadaAtacado"("codigoRastreio");`)
    console.log("Columns added successfully!")
  } catch(e) {
    console.error("Error adding columns:", e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
