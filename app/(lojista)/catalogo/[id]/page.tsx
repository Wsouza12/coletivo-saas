import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ProdutoGaleria } from "@/components/lojista/produto-galeria";
import { PublicarPanel } from "@/components/lojista/publicar-panel";

export default async function CatalogoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.lojistaId) redirect("/login");

  const { id } = await params;
  const produto = await prisma.produto.findUnique({
    where: { id },
    include: { imagens: { orderBy: { ordem: "asc" } } },
  });

  if (!produto || !produto.ativo) notFound();

  const [anunciosExistentes, integracoes] = await Promise.all([
    prisma.anuncio.findMany({
      where: { produtoId: id, lojistaId: session.user.lojistaId },
    }),
    prisma.integracao.findMany({
      where: { lojistaId: session.user.lojistaId, ativa: true },
      select: { plataforma: true },
    }),
  ]);

  const atributos = (produto.atributos as Record<string, string> | null) ?? {};
  const dimensoes = produto.dimensoes as
    | { comprimento: number; largura: number; altura: number }
    | null;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <ProdutoGaleria imagens={produto.imagens} nome={produto.nome} />
      </div>

      <div className="flex flex-col gap-4 lg:col-span-1">
        <div>
          <Badge variant="secondary">{produto.categoria}</Badge>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{produto.nome}</h1>
          <p className="font-mono text-xs text-muted-foreground">{produto.sku}</p>
        </div>

        <p className="text-sm text-muted-foreground">{produto.descricao}</p>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Preço atacado" value={formatBRL(produto.precoAtacado.toString())} />
          <Info
            label="Estoque disponível"
            value={produto.estoque > 0 ? String(produto.estoque) : "Sem estoque"}
          />
          <Info label="Peso" value={`${produto.pesoKg.toString()} kg`} />
          {dimensoes && (
            <Info
              label="Dimensões"
              value={`${dimensoes.comprimento}×${dimensoes.largura}×${dimensoes.altura} cm`}
            />
          )}
        </div>

        {produto.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {produto.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {Object.keys(atributos).length > 0 && (
          <div className="flex flex-col gap-1 text-sm">
            {Object.entries(atributos).map(([chave, valor]) => (
              <div key={chave} className="flex justify-between border-b border-border py-1">
                <span className="text-muted-foreground">{chave}</span>
                <span className="font-medium text-foreground">{valor}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-1">
        <PublicarPanel
          produtoId={produto.id}
          nomeProduto={produto.nome}
          precoAtacado={Number(produto.precoAtacado)}
          semEstoque={produto.estoque <= 0}
          plataformasConectadas={integracoes.map((i) => i.plataforma)}
          anunciosExistentes={anunciosExistentes}
        />
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}
