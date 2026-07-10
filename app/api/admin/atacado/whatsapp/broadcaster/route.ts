import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enviarImagemMassaComLegendas } from "@/lib/evolution";
import { uploadProdutoImagem } from "@/lib/storage";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const formData = await req.formData();
  const imagem = formData.get("imagem");
  const fornecedorId = formData.get("fornecedorId") as string;
  const grupoAvisosId = formData.get("grupoAvisosId") as string | null;
  const grupoPedidosId = formData.get("grupoPedidosId") as string | null;
  const texto = formData.get("texto") as string;
  const dadosRaw = formData.get("dados") as string;

  if (!imagem || !(imagem instanceof File)) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Imagem ausente" } }, { status: 422 });
  }

  const dados = JSON.parse(dadosRaw);

  try {
    let isNovoProduto = false;
    // 1. Verifica se já existe um produto com este código para este fornecedor
    let produto = await prisma.produtoAtacado.findFirst({
      where: {
        codigo: dados.codigo,
        fornecedorId: fornecedorId
      }
    });

    if (produto) {
      produto = await prisma.produtoAtacado.update({
        where: { id: produto.id },
        data: {
          custoUnitario: dados.precoUnitario,
          // Mantém nome, categoria, unidades originais do cadastro para não bagunçar a vitrine
        }
      });
    } else {
      isNovoProduto = true;
      if (!dados.pesoKg || !dados.comprimentoCm || !dados.larguraCm || !dados.alturaCm) {
        return NextResponse.json(
          { error: { code: "VALIDATION", message: "Peso e dimensões são obrigatórios" } },
          { status: 422 }
        );
      }
      produto = await prisma.produtoAtacado.create({
        data: {
          nome: dados.nome,
          codigo: dados.codigo,
          categoria: dados.categoria,
          custoUnitario: dados.precoUnitario,
          unidadesPorCaixa: dados.unidadesPorCaixa,
          pesoKg: dados.pesoKg,
          comprimentoCm: dados.comprimentoCm,
          larguraCm: dados.larguraCm,
          alturaCm: dados.alturaCm,
          descricao: "Rascunho criado via extração de catálogo (Broadcaster)",
          fornecedorId: fornecedorId,
          isRascunho: true,
          ativo: false,
        },
      });
    }

    // 2. Faz o upload da imagem extraída (sempre faz upload para poder enviar no grupo)
    // Se for novo, usa o id do produto, se já existir, faz um upload solto com timestamp
    const nomeArquivoUpload = isNovoProduto ? produto.id : `${produto.id}-broadcaster-${Date.now()}`;
    const imagemExtraidaUrl = await uploadProdutoImagem(imagem, nomeArquivoUpload);

    // 3. Só atualiza a imagem oficial do produto se for um produto novo
    if (isNovoProduto || !produto.imagemUrl) {
      await prisma.produtoAtacado.update({
        where: { id: produto.id },
        data: { imagemUrl: imagemExtraidaUrl },
      });
    }

    // 4. Dispara a imagem + legenda POR GRUPO:
    //    - Avisos da Comunidade → texto + link do grupo de Pedidos (lá ninguém
    //      responde, então leva o link pra pessoa ir mandar o código).
    //    - Pedidos (Solicitações) → só o texto/código (a pessoa já está no grupo).
    const gruposParaDisparar = [grupoAvisosId, grupoPedidosId].filter(Boolean) as string[];

    const vinculos = await prisma.grupoWhatsappCategoria.findMany({
      where: { grupoId: { in: gruposParaDisparar } },
    });
    const linkPedidos = vinculos.find((v) => v.grupoId === grupoPedidosId)?.linkConvite;

    // Garante unicidade caso o usuário selecione o mesmo grupo nos dois dropdowns
    const jidsUnicos = Array.from(new Set(gruposParaDisparar));

    const itens = jidsUnicos.map((jid) => {
      const ehAvisos = jid === grupoAvisosId;
      const legenda =
        ehAvisos && linkPedidos
          ? `${texto}\n\n👉 *Link para pedir:* ${linkPedidos}`
          : texto;
      return { jid, legenda };
    });

    await enviarImagemMassaComLegendas(itens, imagemExtraidaUrl);

    return NextResponse.json({ data: { ok: true, produtoId: produto.id } }, { status: 200 });
  } catch (err) {
    console.error("Erro no Broadcaster:", err);
    return NextResponse.json({ error: { code: "INTERNAL", message: err instanceof Error ? err.message : "Erro interno" } }, { status: 500 });
  }
}
