import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { formatDate, initials } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { LojistasFiltroStatus } from "@/components/admin/lojistas-filtro-status";
import { LojistaStatusActions } from "@/components/admin/lojista-status-actions";
import { PaginationControls } from "@/components/shared/pagination-controls";

export default async function AdminLojistasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const status = sp.status;
  const page = Math.max(1, Number(sp.page ?? "1"));
  const pageSize = Number(sp.pageSize ?? "25");

  const where = status ? { user: { status: status as "PENDING" | "ACTIVE" | "SUSPENDED" } } : {};

  const [lojistas, total] = await Promise.all([
    prisma.lojista.findMany({
      where,
      include: { user: true, _count: { select: { anuncios: true, pedidos: true } } },
      orderBy: { user: { createdAt: "desc" } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.lojista.count({ where }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Lojistas</h1>

      <LojistasFiltroStatus />

      <Card>
        <CardContent className="p-0">
          {lojistas.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Nenhum lojista encontrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead># Anúncios</TableHead>
                  <TableHead># Pedidos</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lojistas.map((lojista) => (
                  <TableRow key={lojista.id}>
                    <TableCell>
                      <Avatar>
                        <AvatarFallback>{initials(lojista.storeName)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/lojistas/${lojista.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {lojista.storeName}
                      </Link>
                    </TableCell>
                    <TableCell>{lojista.user.email}</TableCell>
                    <TableCell>
                      <StatusBadge status={lojista.user.status} />
                    </TableCell>
                    <TableCell>{lojista._count.anuncios}</TableCell>
                    <TableCell>{lojista._count.pedidos}</TableCell>
                    <TableCell>{formatDate(lojista.user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <LojistaStatusActions lojistaId={lojista.id} status={lojista.user.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <PaginationControls page={page} pageSize={pageSize} total={total} />
        </CardContent>
      </Card>
    </div>
  );
}
