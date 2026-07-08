import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis, redisConfigurado } from "@/lib/redis";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfiguracoesPerfilForm } from "@/components/admin/configuracoes-perfil-form";
import { ConfiguracoesNotificacoesForm } from "@/components/admin/configuracoes-notificacoes-form";
import { ConfiguracoesCategorias } from "@/components/admin/configuracoes-categorias";
import { ConfiguracoesFinanceiroForm } from "@/components/admin/configuracoes-financeiro-form";
import { SistemaAcoes } from "@/components/admin/sistema-acoes";
import { getConfiguracaoFinanceira } from "@/lib/configuracao-financeira";

type JobStatus = { executadoEm: string; [key: string]: unknown } | null;

async function getJobStatus(key: string): Promise<JobStatus> {
  if (!redisConfigurado) return null;
  const raw = await redis.get<string>(key).catch(() => null);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function getWebhookLastReceived(key: string): Promise<string | null> {
  if (!redisConfigurado) return null;
  return await redis.get<string>(key).catch(() => null);
}

function mascarar(valor: string | undefined): string {
  if (!valor) return "Não configurado";
  if (valor.length <= 6) return "•".repeat(valor.length);
  return `${valor.slice(0, 3)}${"•".repeat(8)}${valor.slice(-3)}`;
}

async function getDbStatus(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function getRedisStatus(): Promise<boolean> {
  if (!redisConfigurado) return false;
  try {
    await redis.set("healthcheck", new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

export default async function AdminConfiguracoesPage() {
  const session = await auth();
  const admin = await prisma.user.findUniqueOrThrow({ where: { id: session!.user.id } });
  const notificacoes = await prisma.configuracaoNotificacao.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  const financeiro = await getConfiguracaoFinanceira();

  const [
    dbOk,
    redisOk,
    integracoesAtivas,
    ultimoWebhookMl,
    ultimoWebhookShopee,
    jobSync,
    jobFaturas,
    jobAlertas,
  ] = await Promise.all([
    getDbStatus(),
    getRedisStatus(),
    prisma.integracao.groupBy({ by: ["plataforma"], where: { ativa: true }, _count: true }),
    getWebhookLastReceived("webhook:ml:lastReceived"),
    getWebhookLastReceived("webhook:shopee:lastReceived"),
    getJobStatus("jobStatus:syncPedidos"),
    getJobStatus("jobStatus:gerarFaturas"),
    getJobStatus("jobStatus:alertasVencimento"),
  ]);

  const mlAtivas = integracoesAtivas.find((i) => i.plataforma === "MERCADOLIVRE")?._count ?? 0;
  const shopeeAtivas = integracoesAtivas.find((i) => i.plataforma === "SHOPEE")?._count ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Configurações</h1>

      <Tabs defaultValue="perfil">
        <TabsList>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <Card>
            <CardContent className="pt-6">
              <ConfiguracoesPerfilForm initialName={admin.name} initialEmail={admin.email} />
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="financeiro">
          <Card>
            <CardContent className="pt-6">
              <ConfiguracoesFinanceiroForm
                initialMargemPadrao={Number(financeiro.margemPadrao)}
                initialMargemOperacional={Number(financeiro.margemOperacional)}
                initialTipoVendedorShopee={financeiro.tipoVendedorShopee}
                initialCepOrigem={financeiro.cepOrigem}
                initialValorAssinaturaAtacado={Number(financeiro.valorAssinaturaAtacado)}
                initialTaxaServicoPadraoAtacado={Number(financeiro.taxaServicoPadraoAtacado)}
                initialExigirAssinaturaAtacado={financeiro.exigirAssinaturaAtacado}
                initialLoopDescansoInicio={financeiro.loopDescansoInicio}
                initialLoopDescansoFim={financeiro.loopDescansoFim}
                initialPrecoListaFornecedores={Number(financeiro.precoListaFornecedores)}
                initialPrecoCatalogosSemContato={Number(financeiro.precoCatalogosSemContato)}
                initialPrecoUpsellComunidade={Number(financeiro.precoUpsellComunidade)}
                initialMargemSegurancaFrete={Number(financeiro.margemSegurancaFrete)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes">
          <Card>
            <CardContent className="pt-6">
              <ConfiguracoesNotificacoesForm
                initialEmailNovoPedido={notificacoes.emailNovoPedido}
                initialEmailLojistaAprovado={notificacoes.emailLojistaAprovado}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorias">
          <Card>
            <CardContent className="pt-6">
              <ConfiguracoesCategorias />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sistema">
          <Card>
            <CardContent className="flex max-w-xl flex-col gap-4 pt-6 text-sm">
              <Campo label="Banco de dados" valor={dbOk ? "Conectado" : "Falhou"} />
              <Campo label="Redis" valor={redisOk ? "Conectado" : "Falhou"} />
              <Campo
                label="Última sincronização (cron)"
                valor={jobSync ? `${formatDateTime(jobSync.executadoEm)} — ${jobSync.synced} novo(s)` : "Nunca executado"}
              />
              <Campo
                label="Última geração de faturas"
                valor={
                  jobFaturas
                    ? `${formatDateTime(jobFaturas.executadoEm)} — ${jobFaturas.geradas} gerada(s)`
                    : "Nunca executado"
                }
              />
              <Campo
                label="Último alerta de vencimento"
                valor={
                  jobAlertas
                    ? `${formatDateTime(jobAlertas.executadoEm)} — ${jobAlertas.alertadas} alertada(s)`
                    : "Nunca executado"
                }
              />

              <div className="pt-2">
                <SistemaAcoes />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-2.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs">{valor}</span>
    </div>
  );
}
