import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extrairMultiplosProdutosDePagina } from "@/lib/groq";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const formData = await req.formData();
  const imagem = formData.get("imagem");
  const catalogoId = formData.get("catalogoId")?.toString();
  const paginaStr = formData.get("pagina")?.toString();

  if (!(imagem instanceof File) || imagem.size === 0) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Imagem da página ausente" } }, { status: 422 });
  }
  if (!catalogoId || !paginaStr) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Faltam parâmetros catalogoId ou pagina" } }, { status: 422 });
  }

  const catalogo = await prisma.catalogoFornecedor.findUnique({ where: { id: catalogoId } });
  if (!catalogo) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const pagina = parseInt(paginaStr, 10);
  const buffer = Buffer.from(await imagem.arrayBuffer());
  const dataUrl = `data:${imagem.type || "image/png"};base64,${buffer.toString("base64")}`;

  try {
    const dados = await extrairMultiplosProdutosDePagina(dataUrl);
    
    if (!dados.produtos || dados.produtos.length === 0) {
      return NextResponse.json({ message: "Nenhum produto identificado pela IA." }, { status: 200 });
    }

    // Cria rascunhos para todos os produtos identificados
    const resultados = await Promise.all(
      dados.produtos.map(async (p) => {
        // Se já existe neste exato catálogo, pula para não duplicar na mesma página
        if (p.codigo) {
          const jaNesteCatalogo = await prisma.catalogoFornecedorItem.findFirst({
            where: { catalogoId, codigo: p.codigo }
          });
          if (jaNesteCatalogo) return null;
        }

        // Se já existe de um catálogo anterior do mesmo fornecedor, atualiza e vincula
        const existente = (p.codigo && catalogo.fornecedorId) 
          ? await prisma.produtoAtacado.findFirst({
              where: { codigo: p.codigo, fornecedorId: catalogo.fornecedorId }
            })
          : null;

        if (existente) {
          return prisma.produtoAtacado.update({
            where: { id: existente.id },
            data: {
              custoUnitario: p.custoUnitario || existente.custoUnitario,
              itensCatalogo: {
                create: {
                  catalogoId,
                  pagina,
                  codigo: p.codigo,
                  nomeProduto: p.nome || existente.nome,
                }
              }
            }
          });
        }

        return prisma.produtoAtacado.create({
          data: {
            codigo: p.codigo,
            nome: p.nome || "Produto não identificado",
            categoria: p.categoria || "Geral",
            descricao: "Rascunho extraído em lote",
            custoUnitario: p.custoUnitario || 0,
            precoCatalogo: p.precoCatalogo,
            unidadesPorCaixa: p.unidadesPorCaixa || 1,
            marca: p.marca,
            voltagem: p.voltagem,
            codigoAnatel: p.codigoAnatel,
            pesoKg: p.pesoKg || 0.5,
            comprimentoCm: p.comprimentoCm || 20,
            larguraCm: p.larguraCm || 15,
            alturaCm: p.alturaCm || 10,
            // Status de Rascunho, aguardando edição/aprovação do Admin
            ativo: false,
            isRascunho: true,
            itensCatalogo: {
              create: {
                catalogoId,
                pagina,
                codigo: p.codigo,
                nomeProduto: p.nome || "Produto não identificado"
              }
            }
          }
        });
      })
    );

    const novosRascunhos = resultados.filter(Boolean);

    return NextResponse.json({ data: novosRascunhos, count: novosRascunhos.length }, { status: 200 });
  } catch (err) {
    console.error("Erro na extração em lote:", err);
    const message = err instanceof Error ? err.message : "Falha ao ler a página com IA";
    return NextResponse.json({ error: { code: "IA_FALHOU", message } }, { status: 422 });
  }
}
