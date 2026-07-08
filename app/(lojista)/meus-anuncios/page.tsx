import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDate } from "@/lib/format";
import { StatusBadge, PlataformaBadge } from "@/components/shared/status-badge";
import { AnunciosTabs } from "@/components/lojista/anuncios-tabs";
import { AnuncioAcoes } from "@/components/lojista/anuncio-acoes";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function MeusAnunciosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.lojistaId) redirect("/login");

  const sp = await searchParams;
  const plataforma = sp.plataforma;

  const anuncios = await prisma.anuncio.findMany({
    where: {
      lojistaId: session.user.lojistaId,
      ...(plataforma ? { plataforma: plataforma as "MERCADOLIVRE" | "SHOPEE" } : {}),
    },
    include: {
      produto: { include: { imagens: { where: { principal: true }, take: 1 } } },
      kit: { include: { itens: { include: { produto: { select: { precoAtacado: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Meus Anúncios</h1>

      <AnunciosTabs />

      <Card>
        <CardContent className="p-0">
          {anuncios.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Nenhum anúncio nesta categoria.{" "}
              <Link href="/catalogo" className="text-primary hover:underline">
                Publicar produto
              </Link>
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Imagem</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Preço venda</TableHead>
                  <TableHead>Margem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Publicado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {anuncios.map((anuncio) => {
                  const custoBase = anuncio.kit
                    ? anuncio.kit.itens.reduce((soma, i) => soma + i.quantidade * Number(i.produto.precoAtacado), 0)
                    : Number(anuncio.produto?.precoAtacado ?? 0);
                  const margem = Number(anuncio.precoVenda) - custoBase;
                  return (
                    <TableRow key={anuncio.id}>
                      <TableCell>
                        <div className="relative size-10 overflow-hidden rounded-md bg-muted">
                          {anuncio.produto?.imagens[0] && (
                            <Image
                              src={anuncio.produto.imagens[0].url}
                              alt={anuncio.produto.nome}
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{anuncio.produto?.nome ?? `Kit: ${anuncio.kit?.nome}`}</TableCell>
                      <TableCell>
                        <PlataformaBadge plataforma={anuncio.plataforma} />
                      </TableCell>
                      <TableCell className="max-w-48 truncate">{anuncio.titulo}</TableCell>
                      <TableCell>{formatBRL(anuncio.precoVenda.toString())}</TableCell>
                      <TableCell className="text-success">{formatBRL(margem)}</TableCell>
                      <TableCell>
                        <StatusBadge status={anuncio.status} />
                      </TableCell>
                      <TableCell>
                        {anuncio.publicadoEm ? formatDate(anuncio.publicadoEm) : "—"}
                      </TableCell>
                      <TableCell>
                        <AnuncioAcoes anuncioId={anuncio.id} status={anuncio.status} url={anuncio.url} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
