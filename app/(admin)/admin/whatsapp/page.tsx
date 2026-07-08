import { Metadata } from "next";
import { WhatsappConnectionPanel } from "@/components/admin/whatsapp-connection-panel";
import { WhatsappGruposPanel } from "@/components/admin/whatsapp-grupos-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "Conexão WhatsApp | DropSync Admin",
  description: "Gerencie a conexão do WhatsApp para disparo de mensagens.",
};

export default function WhatsappPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-[1600px] mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">WhatsApp</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie a conexão com a Evolution API e os vínculos de grupos por categoria do Atacado Coletivo.
            </p>
          </div>
          
          <Tabs defaultValue="conexao" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
              <TabsTrigger value="conexao">Conexão do Aparelho</TabsTrigger>
              <TabsTrigger value="grupos">Grupos Vinculados</TabsTrigger>
            </TabsList>
            <TabsContent value="conexao">
              <WhatsappConnectionPanel />
            </TabsContent>
            <TabsContent value="grupos">
              <WhatsappGruposPanel />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
