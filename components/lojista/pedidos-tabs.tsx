"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { value: "todos", label: "Todos" },
  { value: "novos", label: "Novos" },
  { value: "processamento", label: "Em processamento" },
  { value: "enviados", label: "Enviados" },
  { value: "entregues", label: "Entregues" },
];

export function PedidosTabsLojista() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const tab = status ? "novos" : searchParams.get("tab") ?? "todos";

  function setTab(value: string | null) {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    params.set("tab", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        {TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
