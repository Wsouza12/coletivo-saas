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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white rounded-md p-4 sm:p-6 shadow-sm border border-gray-100">
        {benefits.map((benefit, i) => (
          <div key={i} className="flex flex-row sm:flex-col items-center sm:items-center text-left sm:text-center p-2 sm:p-4 gap-4 sm:gap-0">
            <div className="shrink-0 sm:mb-4 flex size-12 sm:size-14 items-center justify-center rounded-full bg-blue-50 text-[#3483FA]">
              <benefit.icon className="size-5 sm:size-6" />
            </div>
            <div>
              <h3 className="font-semibold text-[#333] mb-1 sm:mb-2 text-sm sm:text-base">{benefit.title}</h3>
              <p className="text-xs sm:text-sm text-gray-500">{benefit.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
