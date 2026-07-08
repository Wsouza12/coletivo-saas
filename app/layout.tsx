import type { Metadata } from "next";
import { APP_NAME } from "@/lib/brand";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { Suspense } from "react";

import { FacebookPixel } from "@/components/shared/facebook-pixel";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: ` — Compras Coletivas`,
  description: "Plataforma de dropshipping B2B2C",
  verification: {
    other: {
      "facebook-domain-verification": "44bxoztet4sn5hgzm8mfgmpd6jnr5r",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
        <Suspense fallback={null}>
          <FacebookPixel />
        </Suspense>
      </body>
    </html>
  );
}
