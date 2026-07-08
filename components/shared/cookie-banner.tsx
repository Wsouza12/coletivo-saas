"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("lgpd_accepted");
    if (!accepted) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("lgpd_accepted", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.1)] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-600 flex-1">
          Utilizamos cookies e tecnologias semelhantes para melhorar a sua experiência em nossa plataforma, personalizar publicidade e recomendar conteúdos de seu interesse. Ao continuar navegando, você concorda com a nossa{" "}
          <Link href="/politica-de-entregas" className="text-[#3483FA] hover:underline">
            Política de Privacidade
          </Link>{" e "}
          <Link href="/politica-de-reembolso" className="text-[#3483FA] hover:underline">
            Termos de Uso
          </Link>.
        </div>
        <div className="shrink-0 w-full sm:w-auto">
          <button
            onClick={handleAccept}
            className="w-full sm:w-auto rounded-md bg-[#3483FA] px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2968c8]"
          >
            Entendi e Aceito
          </button>
        </div>
      </div>
    </div>
  );
}
