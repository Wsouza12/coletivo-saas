const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const configs = await prisma.configApp.findMany({
    select: { chave: true }
  });
  console.log("Chaves salvas no banco:");
  configs.forEach(c => console.log("- " + c.chave));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
