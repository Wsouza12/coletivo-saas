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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-card rounded-xl p-6 shadow-sm border border-border">
        {benefits.map((benefit, i) => (
          <div key={i} className="flex flex-col items-center text-center p-4">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <benefit.icon className="size-6" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">{benefit.title}</h3>
            <p className="text-sm text-muted-foreground">{benefit.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
