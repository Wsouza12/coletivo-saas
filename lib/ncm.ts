import { prisma } from "@/lib/prisma";

// Busca real na Tabela NCM oficial (Siscomex) carregada no banco — usada no
// cadastro de produto em vez de depender de sugestão de IA.
export async function buscarNcm(query: string) {
  const termo = query.trim();
  if (!termo) return [];

  return prisma.ncmCodigo.findMany({
    where: {
      OR: [
        { codigo: { contains: termo, mode: "insensitive" } },
        { descricao: { contains: termo, mode: "insensitive" } },
      ],
    },
    orderBy: { codigo: "asc" },
    take: 20,
  });
}
