import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, ArrowRight, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

function mascararCpf(cpf: string) {
  if (cpf.length !== 11) return cpf;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

export default async function RastreioCpfPage({ params }: { params: Promise<{ cpf: string }> }) {
  const { cpf } = await params;
  
  if (!cpf || cpf.length !== 11) {
    notFound();
  }

  // Find all boxes where this CPF has at least one PAGO reservation
  const rodadas = await prisma.rodadaAtacado.findMany({
    where: {
      reservas: {
        some: {
          compradorDoc: cpf,
          status: "PAGO"
        }
      }
    },
    include: {
      produtoAtacado: {
        select: {
          nome: true,
          imagemUrl: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8 space-y-6 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Badge className="mb-2 bg-emerald-600 hover:bg-emerald-700 text-white">Atacado Coletivo</Badge>
          <h1 className="text-2xl font-bold tracking-tight">Minhas Caixas</h1>
          <p className="text-sm text-muted-foreground">Rastreio por CPF: <span className="font-semibold text-foreground">{mascararCpf(cpf)}</span></p>
        </div>
        <Link 
          href="/atacado/rastreio" 
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-4"
        >
          Nova Busca
        </Link>
      </div>

      {rodadas.length === 0 ? (
        <Card className="border-dashed bg-slate-50 dark:bg-slate-900/50">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full">
              <XCircle className="size-8 text-slate-400" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Nenhuma caixa encontrada</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Não localizamos nenhuma caixa paga vinculada a este CPF. Certifique-se de que o pagamento já foi aprovado ou tente buscar pelo código da caixa.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rodadas.map((rodada) => (
            <Card key={rodada.id} className="flex flex-col overflow-hidden hover:border-emerald-500/50 transition-colors">
              <CardContent className="p-0 flex flex-col sm:flex-row h-full">
                {/* Produto Imagem */}
                <div className="bg-slate-100 sm:w-32 sm:h-auto h-40 shrink-0 relative flex items-center justify-center">
                  {rodada.produtoAtacado.imagemUrl ? (
                    <Image
                      src={rodada.produtoAtacado.imagemUrl}
                      alt={rodada.produtoAtacado.nome}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <Package className="size-8 text-slate-300" />
                  )}
                </div>
                
                {/* Detalhes */}
                <div className="p-4 flex flex-col justify-between flex-1 gap-4">
                  <div className="space-y-1">
                    <Badge variant={rodada.status === "CANCELADA" ? "destructive" : "secondary"} className="text-[10px] mb-1">
                      {rodada.status}
                    </Badge>
                    <h3 className="font-semibold text-sm line-clamp-2 leading-snug" title={rodada.produtoAtacado.nome}>
                      {rodada.produtoAtacado.nome}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      CÓD: {rodada.codigoRastreio}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto">
                    {rodada.envioCodigo && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                        <Truck className="size-3" />
                        <span>Enviada</span>
                      </div>
                    )}
                    
                    <Link
                      href={`/atacado/rastreio/${rodada.codigoRastreio}`}
                      className="text-xs font-semibold bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition flex items-center gap-1.5 ml-auto"
                    >
                      Acompanhar
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
