import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js usa .env.local para segredos locais — carregamos o mesmo arquivo
// aqui para que `prisma db push` / `prisma db seed` usem a mesma DATABASE_URL.
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
