import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/format";
import { ProdutosFiltros } from "@/components/admin/produtos-filtros";
import { ProdutoAtivoToggle } from "@/components/admin/produto-ativo-toggle";
import { ProdutoExcluirButton } from "@/components/admin/produto-excluir-button";
import { CursorPaginationControls } from "@/components/shared/cursor-pagination-controls";

const PAGE_SIZE = 25;

export default async function AdminProdutosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const categoria = sp.categoria;
  const ativo = sp.ativo;
  const cursor = sp.cursor;

  const where = {
    ...(q
      ? {
          OR: [
            { nome: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(categoria ? { categoria } : {}),
    ...(ativo ? { ativo: ativo === "true" } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.produto.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { imagens: { where: { principal: true }, take: 1 } },
    }),
    prisma.produto.count({ where }),
  ]);

  const hasMore = items.length > PAGE_SIZE;
  const produtos = hasMore ? items.slice(0, PAGE_SIZE) : items;
  const nextCursor = hasMore ? produtos[produtos.length - 1].id : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Produtos</h1>
        <Button render={<Link href="/admin/produtos/novo" />}>
          <Plus className="size-4" />
          Novo Produto
        </Button>
      </div>

      <ProdutosFiltros />

      <Card>
        <CardContent className="p-0">
          {produtos.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Imagem</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço atacado</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((produto) => (
                  <TableRow key={produto.id}>
                    <TableCell>
                      <div className="relative size-10 overflow-hidden rounded-md bg-muted">
                        {produto.imagens[0] && (
                          <Image
                            src={produto.imagens[0].url}
                            alt={produto.imagens[0].alt ?? produto.nome}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{produto.sku}</TableCell>
                    <TableCell className="font-medium">{produto.nome}</TableCell>
                    <TableCell>{produto.categoria}</TableCell>
                    <TableCell>{formatBRL(produto.precoAtacado.toString())}</TableCell>
                    <TableCell
                      className={
                        produto.estoque <= produto.estoqueMinimo
                          ? "font-medium text-destructive"
                          : undefined
                      }
                    >
                      {produto.estoque}
                    </TableCell>
                    <TableCell>
                      <ProdutoAtivoToggle produtoId={produto.id} ativo={produto.ativo} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/produtos/${produto.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Editar
                        </Link>
                        <ProdutoExcluirButton produtoId={produto.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex items-center justify-between px-2">
            <span className="px-4 py-3 text-sm text-muted-foreground">
              {total} {total === 1 ? "produto" : "produtos"}
            </span>
            <CursorPaginationControls nextCursor={nextCursor} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
