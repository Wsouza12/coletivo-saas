import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { catalogoFornecedorItemSchema, preCadastroItemCatalogoSchema } from "@/lib/validations";
import { uploadProdutoImagem } from "@/lib/storage";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const catalogo = await prisma.catalogoFornecedor.findUnique({ where: { id } });
  if (!catalogo) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";

  // Pré-cadastro: vem como multipart (pode ter foto recortada da página) e
  // cria um ProdutoAtacado de verdade, já vinculado a este fornecedor.
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const raw = Object.fromEntries(formData.entries());
    const parsed = preCadastroItemCatalogoSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
    }

    // Dentro do MESMO catálogo, código repetido — em vez de bloquear, retornamos
    // 409 com o preço atual e o novo, pra o componente perguntar ao admin se
    // quer ATUALIZAR o preço (cliente reenvia com ?confirmarAtualizacao=true).
    const confirmarAtualizacao = new URL(req.url).searchParams.get("confirmarAtualizacao") === "true";
    const produtoIdBase = formData.get("produtoIdBase") as string | null;

    if (parsed.data.codigo && !confirmarAtualizacao) {
      const jaNesteCatalogo = await prisma.catalogoFornecedorItem.findFirst({
        where: { catalogoId: id, codigo: parsed.data.codigo },
        include: { produtoAtacado: { select: { id: true, custoUnitario: true, precoCatalogo: true } } },
      });
      // Só alerta conflito se o produto encontrado for DIFERENTE do que estamos editando
      if (jaNesteCatalogo && (!produtoIdBase || jaNesteCatalogo.produtoAtacado?.id !== produtoIdBase)) {
        const atualCusto = jaNesteCatalogo.produtoAtacado
          ? Number(jaNesteCatalogo.produtoAtacado.custoUnitario)
          : null;
        const novoCusto = parsed.data.custoUnitario;
        const precoMudou = atualCusto !== null && Math.abs(atualCusto - novoCusto) > 0.001;
        return NextResponse.json(
          {
            error: {
              code: "JA_EXISTE",
              message: `Já existe o produto ${parsed.data.codigo} neste catálogo`,
              jaExiste: {
                produtoId: jaNesteCatalogo.produtoAtacado?.id ?? null,
                custoAtual: atualCusto,
                custoNovo: novoCusto,
                precoCatalogoAtual: jaNesteCatalogo.produtoAtacado?.precoCatalogo
                  ? Number(jaNesteCatalogo.produtoAtacado.precoCatalogo)
                  : null,
                precoCatalogoNovo: parsed.data.precoCatalogo ?? null,
                precoMudou,
              },
            },
          },
          { status: 409 }
        );
      }
    }

    // Quando confirmado, apaga a entrada antiga deste catálogo pra reaproveitar
    // o produto existente (se houver) via casamento por código+fornecedor abaixo.
    if (parsed.data.codigo && confirmarAtualizacao) {
      await prisma.catalogoFornecedorItem.deleteMany({
        where: { catalogoId: id, codigo: parsed.data.codigo },
      });
    }

    // Casamento prioritário pelo rascunho sendo editado
    let existente = null;
    if (produtoIdBase) {
      existente = await prisma.produtoAtacado.findUnique({ where: { id: produtoIdBase } });
    }

    // Se não encontrou pelo ID base, tenta casamento por (codigo + fornecedor): 
    // se o produto já existe de um catálogo anterior do mesmo fornecedor, ATUALIZA 
    // os preços em vez de duplicar (caso de subir um catálogo novo do fornecedor).
    if (!existente && parsed.data.codigo && catalogo.fornecedorId) {
      existente = await prisma.produtoAtacado.findFirst({
        where: { codigo: parsed.data.codigo, fornecedorId: catalogo.fornecedorId },
      });
    }

    let produto;
    let acao: "criado" | "atualizado";

    if (existente) {
      if (existente.isRascunho) {
        produto = await prisma.produtoAtacado.update({
          where: { id: existente.id },
          data: {
            isRascunho: false, // <-- Remove a flag de rascunho
            nome: parsed.data.nomeProduto,
            categoria: parsed.data.categoria,
            marca: parsed.data.marca,
            voltagem: parsed.data.voltagem,
            codigoAnatel: parsed.data.codigoAnatel,
            custoUnitario: parsed.data.custoUnitario,
            precoCatalogo: parsed.data.precoCatalogo,
            precoVendaSugerido: parsed.data.precoVendaSugerido,
            unidadesPorCaixa: parsed.data.unidadesPorCaixa,
            ...(parsed.data.pesoKg ? { pesoKg: parsed.data.pesoKg } : {}),
            ...(parsed.data.comprimentoCm ? { comprimentoCm: parsed.data.comprimentoCm } : {}),
            ...(parsed.data.larguraCm ? { larguraCm: parsed.data.larguraCm } : {}),
            ...(parsed.data.alturaCm ? { alturaCm: parsed.data.alturaCm } : {}),
          },
        });
      } else {
        // Só os preços são sobrescritos — nome/foto/medidas/Anatel ficam intactos
        // pra não apagar o que o admin já ajustou em produtos ativos.
        produto = await prisma.produtoAtacado.update({
          where: { id: existente.id },
          data: {
            custoUnitario: parsed.data.custoUnitario,
            ...(parsed.data.precoCatalogo ? { precoCatalogo: parsed.data.precoCatalogo } : {}),
            ...(parsed.data.precoVendaSugerido ? { precoVendaSugerido: parsed.data.precoVendaSugerido } : {}),
          },
        });
      }
      acao = "atualizado";
    } else {
      produto = await prisma.produtoAtacado.create({
        data: {
          codigo: parsed.data.codigo,
          nome: parsed.data.nomeProduto,
          // Descrição começa vazia — NUNCA referenciar fornecedor/catálogo/página
          // aqui, porque este campo aparece nas páginas públicas (vitrine e
          // checkout). O vínculo interno com o catálogo/página fica no
          // CatalogoFornecedorItem (uso admin), não no produto público.
          descricao: "",
          categoria: parsed.data.categoria,
          marca: parsed.data.marca,
          voltagem: parsed.data.voltagem,
          codigoAnatel: parsed.data.codigoAnatel,
          custoUnitario: parsed.data.custoUnitario,
          precoCatalogo: parsed.data.precoCatalogo,
          precoVendaSugerido: parsed.data.precoVendaSugerido,
          minimoUnidadesPadrao: parsed.data.minimoUnidadesPadrao,
          reservaLojaPadrao: parsed.data.reservaLojaPadrao,
          unidadesPorCaixa: parsed.data.unidadesPorCaixa,
          coresVariadas: parsed.data.coresVariadas ?? false,
          ...(parsed.data.pesoKg ? { pesoKg: parsed.data.pesoKg } : {}),
          ...(parsed.data.comprimentoCm ? { comprimentoCm: parsed.data.comprimentoCm } : {}),
          ...(parsed.data.larguraCm ? { larguraCm: parsed.data.larguraCm } : {}),
          ...(parsed.data.alturaCm ? { alturaCm: parsed.data.alturaCm } : {}),
          fornecedorId: catalogo.fornecedorId,
        },
      });
      acao = "criado";
    }

    // Foto: permite subir/sobrescrever se for produto novo, se for rascunho, ou se ainda não tiver foto.
    const imagem = formData.get("imagem");
    const podeAtualizarFoto = acao === "criado" || (existente && (existente.isRascunho || !existente.imagemUrl));
    
    if (podeAtualizarFoto && imagem instanceof File && imagem.size > 0) {
      const imagemUrl = await uploadProdutoImagem(imagem, produto.id);
      await prisma.produtoAtacado.update({ where: { id: produto.id }, data: { imagemUrl } });
    }

    // Variacões dinâmicas criadas junto com o produto
    // Primeiro limpamos as existentes se for rascunho
    if (existente && existente.isRascunho) {
      await prisma.produtoAtacadoCor.deleteMany({
        where: { produtoAtacadoId: produto.id }
      });
    }

    const variacoesCountStr = formData.get("variacoesCount") as string;
    const variacoesCount = variacoesCountStr ? parseInt(variacoesCountStr, 10) : 0;
    
    if (variacoesCount > 0 && (acao === "criado" || (existente && existente.isRascunho))) {
      for (let i = 0; i < variacoesCount; i++) {
        const tipoRaw = String(formData.get(`variacao_${i}_tipo`) ?? "COR").toUpperCase();
        const tipo = (["COR", "TAMANHO", "VOLTAGEM"].includes(tipoRaw) ? tipoRaw : "COR") as "COR" | "TAMANHO" | "VOLTAGEM";
        const nome = String(formData.get(`variacao_${i}_nome`) ?? "").trim();
        if (!nome) continue;

        let imagemUrl = String(formData.get(`variacao_${i}_imagemUrl`) ?? "") || null;
        const varImagem = formData.get(`variacao_${i}_imagem`);
        if (varImagem instanceof File && varImagem.size > 0) {
          try {
            imagemUrl = await uploadProdutoImagem(varImagem, `atacado-${produto.id}-var-${i}`);
          } catch (err) {
            console.error(`Falha no upload da variacao ${i}:`, err);
          }
        }

        await prisma.produtoAtacadoCor.create({
          data: {
            produtoAtacadoId: produto.id,
            tipo,
            nome,
            imagemUrl,
            ordem: i
          }
        });
      }
    }

    let item;
    if (produtoIdBase) {
      // Se estamos editando, já deve existir um item neste catálogo apontando pra ele
      item = await prisma.catalogoFornecedorItem.findFirst({
        where: { catalogoId: id, produtoAtacadoId: produto.id }
      });
    }

    if (item) {
      item = await prisma.catalogoFornecedorItem.update({
        where: { id: item.id },
        data: {
          pagina: parsed.data.pagina,
          codigo: parsed.data.codigo,
          nomeProduto: parsed.data.nomeProduto,
        }
      });
    } else {
      item = await prisma.catalogoFornecedorItem.create({
        data: {
          catalogoId: id,
          pagina: parsed.data.pagina,
          codigo: parsed.data.codigo,
          nomeProduto: parsed.data.nomeProduto,
          produtoAtacadoId: produto.id,
        },
      });
    }

    return NextResponse.json({ data: { item, acao } }, { status: 201 });
  }

  // Item de índice simples — só referência de página, sem virar produto.
  const parsed = catalogoFornecedorItemSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }

  const item = await prisma.catalogoFornecedorItem.create({
    data: { catalogoId: id, ...parsed.data },
  });
  return NextResponse.json({ data: item }, { status: 201 });
}
