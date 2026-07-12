"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package } from "lucide-react";

export default function RastreioBuscaPage() {
  const [codigo, setCodigo] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCodigo = codigo.trim().toUpperCase();
    if (cleanCodigo) {
      const digitsOnly = cleanCodigo.replace(/\D/g, "");
      if (digitsOnly.length === 11) {
        router.push(`/atacado/rastreio/cliente/${digitsOnly}`);
      } else {
        router.push(`/atacado/rastreio/${cleanCodigo}`);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 md:p-8 dark:bg-slate-900">
      <Card className="w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-emerald-50 text-emerald-600 p-3 rounded-full w-fit dark:bg-emerald-950 dark:text-emerald-400">
            <Package className="size-8" />
          </div>
          <Badge className="mx-auto bg-emerald-600 hover:bg-emerald-700 text-white w-fit">
            Atacado Coletivo
          </Badge>
          <CardTitle className="text-2xl font-bold tracking-tight font-sans">Rastrear Caixa</CardTitle>
          <CardDescription>
            Insira o código da sua caixa coletiva ou o seu CPF para acompanhar as etapas de envio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Ex: CX-123456 ou 123.456.789-00"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="text-center text-lg font-semibold tracking-wider uppercase placeholder:normal-case placeholder:font-normal placeholder:tracking-normal"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center justify-center gap-2 py-6 text-base"
            >
              <Search className="size-5" />
              Buscar Rastreio
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
