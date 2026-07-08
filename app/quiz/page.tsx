import { Metadata } from "next";
import { QuizFlow } from "@/components/quiz/quiz-flow";
import { PackageSearch } from "lucide-react";

export const metadata: Metadata = {
  title: "Acesso à Comunidade VIP | DropyAtacado",
  description: "Responda a este rápido quiz para liberar o seu acesso à nossa comunidade exclusiva de compras coletivas.",
};

export default function QuizPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Navbar Minimalista */}
      <header className="w-full py-6 px-4 md:px-8 flex justify-center md:justify-start bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 absolute top-0 z-10">
        <div className="flex items-center gap-2 text-primary">
          <PackageSearch className="w-6 h-6 md:w-8 md:h-8" />
          <span className="font-bold text-xl md:text-2xl tracking-tight text-slate-900 dark:text-white">
            Dropy<span className="text-primary">Atacado</span>
          </span>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col items-center justify-center pt-24 pb-12 px-4 relative">
        {/* Elementos de fundo (decoração) */}
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10" />

        <div className="text-center mb-8 max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
            Descubra o seu perfil de <span className="text-primary">Revendedor</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400">
            Responda 3 perguntas rápidas para liberarmos o seu acesso exclusivo aos nossos lotes de fábrica.
          </p>
        </div>

        <div className="w-full z-10">
          <QuizFlow />
        </div>
      </main>
      
      {/* Footer Minimalista */}
      <footer className="py-6 text-center text-slate-500 text-sm">
        <p>© {new Date().getFullYear()} DropyAtacado. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
