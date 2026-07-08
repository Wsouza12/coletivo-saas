"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Loader2, LogOut, RefreshCcw, Smartphone, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";

type ConnectionState = {
  state: string;
  qrCodeBase64: string | null;
};

export function WhatsappConnectionPanel() {
  const [data, setData] = useState<ConnectionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/admin/evolution/connection");
      if (!res.ok) throw new Error("Erro ao buscar status");
      const { data: result } = await res.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Polling a cada 3 segundos se estiver desconectado, para atualizar assim que o QR Code for lido
  useEffect(() => {
    if (data && data.state !== "open") {
      const interval = setInterval(() => fetchState(true), 3000);
      return () => clearInterval(interval);
    }
  }, [data, fetchState]);

  const handleLogout = async () => {
    if (!confirm("Tem certeza que deseja desconectar este WhatsApp? Você precisará ler um novo QR Code.")) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/admin/evolution/connection", { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao desconectar");
      toast.success("WhatsApp desconectado com sucesso");
      await fetchState();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desconectar");
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardContent className="flex flex-col items-center justify-center p-12">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Carregando status do WhatsApp...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-8 border border-destructive/50 bg-destructive/10 text-destructive rounded-lg p-4 flex gap-3">
        <AlertCircle className="size-5 shrink-0 mt-0.5" />
        <div className="flex flex-col items-start gap-3 w-full">
          <h5 className="font-semibold leading-none tracking-tight">Erro de Conexão</h5>
          <div className="text-sm">
            <p>{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchState()}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  const isConnected = data?.state === "open";

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="size-5" />
          Conexão do WhatsApp
        </CardTitle>
        <CardDescription>
          Gerencie o número de WhatsApp usado para enviar mensagens de Atacado Coletivo.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex flex-col items-center gap-6">
        {isConnected ? (
          <div className="flex flex-col items-center text-center space-y-4 py-6">
            <div className="size-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="size-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-700">Conectado</h3>
              <p className="text-muted-foreground mt-1">
                Sua instância está pronta para enviar mensagens.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-bold text-amber-600">Desconectado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Abra o WhatsApp no celular, vá em "Aparelhos conectados" e leia o QR Code abaixo.
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-xl border shadow-sm relative overflow-hidden min-h-[256px] min-w-[256px] flex items-center justify-center">
              {data?.qrCodeBase64 ? (
                <Image 
                  src={data.qrCodeBase64} 
                  alt="QR Code do WhatsApp" 
                  width={256} 
                  height={256}
                  className="rounded-md"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="size-6 animate-spin" />
                  <span className="text-sm">Gerando QR Code...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between border-t bg-muted/50 p-6">
        <Button variant="outline" onClick={() => fetchState(true)} disabled={loading}>
          <RefreshCcw className={`size-4 mr-2 ${loading && data ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
        
        {isConnected && (
          <Button variant="destructive" onClick={handleLogout} disabled={loading}>
            <LogOut className="size-4 mr-2" />
            Desconectar
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
