"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ArrowRight, Loader2, Target } from "lucide-react";

type Answers = {
  vendeMarketplace?: boolean;
  desafioPrincipal?: string;
  metaFaturamento?: string;
  nome?: string;
  telefone?: string;
};

export function QuizFlow() {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Link fixo da comunidade (pode ser ajustado se no futuro vier do DB)
  const whatsappLink = "https://chat.whatsapp.com/Lh61vF8hO9qEInuTnfhH9n"; // Link de exemplo, atualize para o real

  const handleAnswer = (key: keyof Answers, value: any) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    nextStep();
  };

  const nextStep = () => {
    setStep((s) => s + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!answers.nome || !answers.telefone || answers.telefone.length < 10) {
      alert("Por favor, preencha seu nome e um WhatsApp válido.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: answers.nome,
          telefone: answers.telefone,
          vendeMarketplace: answers.vendeMarketplace,
          desafioPrincipal: answers.desafioPrincipal,
          metaFaturamento: answers.metaFaturamento,
        }),
      });

      // Sucesso na captura, vai para tela de análise
      setStep(5);
      setIsSubmitting(false);
      setIsAnalyzing(true);
      
      // Simula análise de perfil
      setTimeout(() => {
        setIsAnalyzing(false);
        setStep(6);
      }, 2500);
      
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
      alert("Erro ao enviar dados. Tente novamente.");
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-4 md:p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 relative overflow-hidden">
      {/* Barra de progresso */}
      {step < 5 && (
        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100 dark:bg-slate-800">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(step / 4) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6"
          >
            <div className="space-y-2 text-center mt-4">
              <span className="text-primary text-sm font-semibold tracking-wider uppercase">Passo 1 de 4</span>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                Você já vende em algum marketplace?
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                (Mercado Livre, Shopee, Amazon, etc)
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 mt-6">
              <Button 
                variant="outline" 
                className="h-16 text-lg justify-start px-6 border-2 hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => handleAnswer('vendeMarketplace', true)}
              >
                ✅ Sim, já vendo
              </Button>
              <Button 
                variant="outline" 
                className="h-16 text-lg justify-start px-6 border-2 hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => handleAnswer('vendeMarketplace', false)}
              >
                🚀 Não, quero começar agora
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && answers.vendeMarketplace === true && (
          <motion.div
            key="step2-yes"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6"
          >
            <div className="space-y-2 text-center mt-4">
              <span className="text-primary text-sm font-semibold tracking-wider uppercase">Passo 2 de 4</span>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                Qual o seu principal desafio hoje?
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 mt-6">
              <Button 
                variant="outline" 
                className="h-16 text-lg justify-start px-6 border-2 hover:border-primary hover:bg-primary/5 text-left whitespace-normal h-auto py-4"
                onClick={() => handleAnswer('desafioPrincipal', 'Falta de fornecedor barato')}
              >
                📦 Achar fornecedor mais barato para ter margem
              </Button>
              <Button 
                variant="outline" 
                className="h-16 text-lg justify-start px-6 border-2 hover:border-primary hover:bg-primary/5 text-left whitespace-normal h-auto py-4"
                onClick={() => handleAnswer('desafioPrincipal', 'Falta de dinheiro para estoque')}
              >
                💰 Falta de capital para comprar estoque
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && answers.vendeMarketplace === false && (
          <motion.div
            key="step2-no"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6"
          >
            <div className="space-y-2 text-center mt-4">
              <span className="text-primary text-sm font-semibold tracking-wider uppercase">Passo 2 de 4</span>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                O que te impede de começar a vender?
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 mt-6">
              <Button 
                variant="outline" 
                className="h-16 text-lg justify-start px-6 border-2 hover:border-primary hover:bg-primary/5 text-left whitespace-normal h-auto py-4"
                onClick={() => handleAnswer('desafioPrincipal', 'Não sei o que vender')}
              >
                🤔 Não sei quais produtos vendem bem
              </Button>
              <Button 
                variant="outline" 
                className="h-16 text-lg justify-start px-6 border-2 hover:border-primary hover:bg-primary/5 text-left whitespace-normal h-auto py-4"
                onClick={() => handleAnswer('desafioPrincipal', 'Tenho pouco dinheiro')}
              >
                💸 Tenho pouco dinheiro para investir agora
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6"
          >
            <div className="space-y-2 text-center mt-4">
              <span className="text-primary text-sm font-semibold tracking-wider uppercase">Passo 3 de 4</span>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                Qual a sua meta de faturamento mensal?
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Isso nos ajuda a saber qual plano de ação te passar.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 mt-6">
              <Button 
                variant="outline" 
                className="h-16 text-lg justify-start px-6 border-2 hover:border-primary hover:bg-primary/5"
                onClick={() => handleAnswer('metaFaturamento', 'Até R$ 5.000')}
              >
                🥉 Até R$ 5.000
              </Button>
              <Button 
                variant="outline" 
                className="h-16 text-lg justify-start px-6 border-2 hover:border-primary hover:bg-primary/5"
                onClick={() => handleAnswer('metaFaturamento', 'R$ 5.000 a R$ 20.000')}
              >
                🥈 De R$ 5.000 a R$ 20.000
              </Button>
              <Button 
                variant="outline" 
                className="h-16 text-lg justify-start px-6 border-2 hover:border-primary hover:bg-primary/5"
                onClick={() => handleAnswer('metaFaturamento', 'Mais de R$ 20.000')}
              >
                🥇 Mais de R$ 20.000
              </Button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6"
          >
            <div className="space-y-2 text-center mt-4">
              <span className="text-primary text-sm font-semibold tracking-wider uppercase">Último Passo</span>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                Para onde enviamos o seu convite?
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Preencha seus dados para receber o acesso VIP ao grupo de Compras Coletivas.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-base">Seu Nome</Label>
                <Input 
                  id="nome" 
                  placeholder="João Silva" 
                  className="h-12 text-lg"
                  value={answers.nome || ''}
                  onChange={(e) => setAnswers({...answers, nome: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone" className="text-base">WhatsApp</Label>
                <Input 
                  id="telefone" 
                  placeholder="(11) 99999-9999" 
                  type="tel"
                  className="h-12 text-lg"
                  value={answers.telefone || ''}
                  onChange={(e) => setAnswers({...answers, telefone: e.target.value})}
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-14 text-lg mt-4 shadow-lg shadow-primary/30"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    Ver Meu Perfil <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-slate-400 mt-2">
                Seus dados estão seguros. Não enviamos spam.
              </p>
            </form>
          </motion.div>
        )}

        {step === 5 && isAnalyzing && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-12 gap-6 text-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 animate-ping rounded-full" />
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center relative">
                <Target className="w-12 h-12 text-primary animate-pulse" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold">Analisando seu perfil...</h2>
              <p className="text-slate-500">
                Buscando as melhores oportunidades de Rateio para você!
              </p>
            </div>
          </motion.div>
        )}

        {step === 6 && (
          <motion.div
            key="step6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-8 gap-8 text-center"
          >
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-500" />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Perfil Aprovado! 🎉</h2>
              <p className="text-slate-600 dark:text-slate-300 text-lg max-w-md">
                O seu perfil é ideal para as nossas Compras Coletivas. Você economizará muito dinheiro pegando carona nos nossos pedidos de fábrica.
              </p>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl w-full border border-slate-100 dark:border-slate-800">
              <p className="font-medium mb-4 text-slate-900 dark:text-white text-lg">Último passo:</p>
              <a 
                href={whatsappLink} 
                target="_blank" 
                rel="noreferrer"
                className="w-full"
              >
                <Button size="lg" className="w-full h-16 text-xl bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-xl shadow-green-500/20">
                  ENTRAR NO GRUPO VIP
                </Button>
              </a>
              <p className="text-sm text-slate-500 mt-4">
                O grupo é fechado e 100% focado em negócios.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
