import { ShieldCheck, Truck, Users, CreditCard } from "lucide-react";

export function VitrineBenefits() {
  const benefits = [
    {
      icon: Users,
      title: "Compras Coletivas",
      description: "Junte-se a outros lojistas para garantir o melhor preço direto do fabricante.",
    },
    {
      icon: Truck,
      title: "Frete Barato",
      description: "Enviamos para todo o Brasil com as melhores transportadoras e Correios.",
    },
    {
      icon: ShieldCheck,
      title: "Compra Garantida",
      description: "Receba o produto que está esperando ou devolvemos o seu dinheiro.",
    },
    {
      icon: CreditCard,
      title: "Pagamento Facilitado",
      description: "Pague no Pix, Boleto ou em até 12x no cartão de crédito.",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 relative z-10 -mt-16">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white/[0.03] backdrop-blur rounded-2xl p-6 shadow-xl border border-white/10">
        {benefits.map((benefit, i) => (
          <div key={i} className="flex flex-col items-center text-center p-4">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-purple-900/40 text-amber-400 border border-purple-500/20">
              <benefit.icon className="size-6" />
            </div>
            <h3 className="font-semibold text-white mb-2">{benefit.title}</h3>
            <p className="text-sm text-white/60">{benefit.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
