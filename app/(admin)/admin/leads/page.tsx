import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Leads Capturados (Quiz) | Admin",
};

export default async function LeadsAdminPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  const leads = await prisma.leadQuiz.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Leads do Quiz</h2>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Base de Contatos Capturados</CardTitle>
            <CardDescription>
              Pessoas que responderam ao Quiz para entrar no Grupo VIP. Total de {leads.length} leads.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                Nenhum lead capturado ainda. Envie tráfego para a página do Quiz!
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Desafio / Motivo</TableHead>
                      <TableHead>Meta de Faturamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(lead.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium">{lead.nome}</TableCell>
                        <TableCell>
                          <a 
                            href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-primary hover:underline"
                          >
                            {lead.telefone}
                          </a>
                        </TableCell>
                        <TableCell>
                          {lead.vendeMarketplace ? (
                            <Badge variant="default" className="bg-green-600">Já Vende</Badge>
                          ) : (
                            <Badge variant="secondary">Iniciante</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={lead.desafioPrincipal || "-"}>
                          {lead.desafioPrincipal || "-"}
                        </TableCell>
                        <TableCell>{lead.metaFaturamento || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
