"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TimelineContent } from "@/components/ui/timeline-animation";
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal";
import { cn } from "@/lib/utils";
import { CheckCheck, Store, ShoppingCart, BarChart3, Users, MessageCircle, Receipt, ShieldCheck, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { Link } from "@/lib/compat/wouter";

const plans = [
  {
    name: "Essai",
    description: "Parfait pour découvrir StockPlus sans engagement",
    price: 0,
    yearlyPrice: 0,
    buttonText: "Rejoindre la liste",
    buttonVariant: "outline" as const,
    popular: false,
    features: [
      { text: "POS complet", icon: <ShoppingCart size={20} /> },
      { text: "Gestion des produits & stock", icon: <Store size={20} /> },
      { text: "Dashboard & rapports", icon: <BarChart3 size={20} /> },
    ],
    includes: [
      "Ce qui est inclus :",
      "Impression de facture thermique",
      "Gestion des clients",
      "IA Awa basique",
      "2 gérants",
    ],
  },
  {
    name: "Basic",
    description: "Pour les boutiques qui veulent passer au numérique",
    price: 10000,
    yearlyPrice: 99000,
    buttonText: "Choisir Basic",
    buttonVariant: "default" as const,
    popular: true,
    features: [
      { text: "Tout l'Essai", icon: <CheckCheck size={20} /> },
      { text: "Sauvegarde cloud auto", icon: <ShieldCheck size={20} /> },
      { text: "Notifications stock faible", icon: <MessageCircle size={20} /> },
    ],
    includes: [
      "Tout l'Essai, plus :",
      "Historique illimité",
      "Produits illimités",
      "Rapports de ventes détaillés",
      "2 gérants (propriétaire + 1)",
    ],
  },
  {
    name: "Pro",
    description: "La solution complète pour les commerçants ambitieux",
    price: 25000,
    yearlyPrice: 249000,
    buttonText: "Choisir Pro",
    buttonVariant: "outline" as const,
    popular: false,
    features: [
      { text: "Tout le plan Basic", icon: <CheckCheck size={20} /> },
      { text: "Prix de gros & crédit", icon: <Receipt size={20} /> },
      { text: "Multi-panier & IA avancée", icon: <BarChart3 size={20} /> },
    ],
    includes: [
      "Tout le Basic, plus :",
      "Rapports avancés & exports PDF/Excel",
      "Scan IA des produits (photo)",
      "Scan facture fournisseurs (auto-stock)",
      "CRM & relance automatique clients",
      "Comptabilité simple & export comptable",
      "Jusqu'à 20 gérants",
      "Support prioritaire 7j/7",
    ],
  },
];

const PricingSwitch = ({
  onSwitch,
  className,
}: {
  onSwitch: (value: string) => void;
  className?: string;
}) => {
  const [selected, setSelected] = useState("0");

  const handleSwitch = (value: string) => {
    setSelected(value);
    onSwitch(value);
  };

  return (
    <div className={cn("flex justify-center", className)}>
      <div className="relative z-10 mx-auto flex w-fit rounded-xl bg-neutral-50 border border-gray-200 p-1">
        <button
          onClick={() => handleSwitch("0")}
          className={cn(
            "relative z-10 w-fit cursor-pointer h-12 rounded-xl sm:px-6 px-3 sm:py-2 py-1 font-medium transition-colors sm:text-base text-sm",
            selected === "0"
              ? "text-white"
              : "text-muted-foreground hover:text-black",
          )}
        >
          {selected === "0" && (
            <motion.span
              layoutId={"switch"}
              className="absolute top-0 left-0 h-12 w-full rounded-xl border-4 shadow-sm shadow-orange-600 border-orange-600 bg-gradient-to-t from-orange-500 via-orange-400 to-orange-600"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative">Mensuel</span>
        </button>

        <button
          onClick={() => handleSwitch("1")}
          className={cn(
            "relative z-10 w-fit cursor-pointer h-12 flex-shrink-0 rounded-xl sm:px-6 px-3 sm:py-2 py-1 font-medium transition-colors sm:text-base text-sm",
            selected === "1"
              ? "text-white"
              : "text-muted-foreground hover:text-black",
          )}
        >
          {selected === "1" && (
            <motion.span
              layoutId={"switch"}
              className="absolute top-0 left-0 h-12 w-full rounded-xl border-4 shadow-sm shadow-orange-600 border-orange-600 bg-gradient-to-t from-orange-500 via-orange-400 to-orange-600"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            Annuel
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-black">
              -17%
            </span>
          </span>
        </button>
      </div>
    </div>
  );
};

export default function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);
  const pricingRef = useRef<HTMLDivElement>(null);

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.4,
        duration: 0.5,
      },
    }),
    hidden: {
      filter: "blur(10px)",
      y: -20,
      opacity: 0,
    },
  };

  const togglePricingPeriod = (value: string) =>
    setIsYearly(Number.parseInt(value) === 1);

  const formatPrice = (price: number) => {
    if (price === 0) return "Gratuit";
    return `${price.toLocaleString("fr-FR")} FCFA`;
  };

  return (
    <div
      className="px-4 pt-20 pb-32 min-h-screen max-w-7xl mx-auto relative"
      ref={pricingRef}
    >
      <article className="text-left mb-6 space-y-4 max-w-2xl">
        <h2 className="md:text-6xl text-4xl capitalize font-medium text-gray-900 mb-4">
          <VerticalCutReveal
            splitBy="words"
            staggerDuration={0.15}
            staggerFrom="first"
            reverse={true}
            containerClassName="justify-start"
            transition={{
              type: "spring",
              stiffness: 250,
              damping: 40,
              delay: 0,
            }}
          >
            Un tarif juste pour votre croissance
          </VerticalCutReveal>
        </h2>

        <TimelineContent
          as="p"
          animationNum={0}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="md:text-base text-sm text-gray-600 w-[80%]"
        >
          Simple, transparent, payable via Wave ou Orange Money. Pas de frais cachés.
        </TimelineContent>

        <TimelineContent
          as="div"
          animationNum={1}
          timelineRef={pricingRef}
          customVariants={revealVariants}
        >
          <PricingSwitch onSwitch={togglePricingPeriod} className="w-fit" />
        </TimelineContent>
      </article>

      <div className="grid md:grid-cols-3 gap-4 py-6">
        {plans.map((plan, index) => (
          <TimelineContent
            key={plan.name}
            as="div"
            animationNum={2 + index}
            timelineRef={pricingRef}
            customVariants={revealVariants}
          >
            <Card
              className={`relative border border-neutral-200 h-full flex flex-col ${
                plan.popular
                  ? "ring-2 ring-orange-500 bg-orange-50"
                  : "bg-white"
              }`}
            >
              <CardHeader className="text-left">
                <div className="flex justify-between items-start">
                  <h3 className="xl:text-3xl md:text-2xl text-3xl font-semibold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  {plan.popular && (
                    <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Recommandé
                    </span>
                  )}
                </div>
                <p className="xl:text-sm md:text-xs text-sm text-gray-600 mb-4">
                  {plan.description}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-semibold text-gray-900">
                    {plan.price === 0 ? "Gratuit" : (
                      <>{isYearly ? formatPrice(plan.yearlyPrice) : formatPrice(plan.price)}</>
                    )}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-600 text-sm">
                      /{isYearly ? "an" : "mois"}
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0 flex flex-col flex-1">
                <Link href="/waitlist">
                  <button
                    className={`w-full mb-4 p-4 text-xl rounded-xl font-bold ${
                      plan.popular
                        ? "bg-gradient-to-t from-orange-500 to-orange-600 shadow-lg shadow-orange-500 border border-orange-400 text-white"
                        : plan.buttonVariant === "outline"
                          ? "bg-gradient-to-t from-neutral-900 to-neutral-600 shadow-lg shadow-neutral-900 border border-neutral-700 text-white"
                          : "bg-white text-black border border-gray-200 shadow-lg"
                    }`}
                  >
                    {plan.buttonText}
                  </button>
                </Link>

                <div className="space-y-3 pt-4 border-t border-neutral-200 flex-1">
                  <h4 className="font-medium text-base text-gray-900 mb-3">
                    {plan.includes[0]}
                  </h4>
                  <ul className="space-y-2 font-semibold">
                    {plan.includes.slice(1).map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <span className="h-6 w-6 bg-white border border-orange-500 rounded-full grid place-content-center mt-0.5 mr-3 shrink-0">
                          <CheckCheck className="h-4 w-4 text-orange-500" />
                        </span>
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Features icons row */}
                <div className="mt-6 pt-4 border-t border-neutral-100">
                  <div className="flex gap-3 justify-center">
                    {plan.features.map((feat, i) => (
                      <div key={i} className="flex flex-col items-center gap-1 text-center">
                        <span className="text-orange-500">{feat.icon}</span>
                        <span className="text-[10px] font-medium text-gray-500 leading-tight max-w-[80px]">{feat.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TimelineContent>
        ))}
      </div>

      {/* Addon Boutique en ligne */}
      <TimelineContent
        as="div"
        animationNum={5}
        timelineRef={pricingRef}
        customVariants={revealVariants}
      >
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-[3rem] p-10 md:p-12 text-center relative overflow-hidden">
          <div className="relative z-10 max-w-3xl mx-auto">
            <span className="inline-block bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4">ADDON</span>
            <div className="flex items-center justify-center gap-3 mb-4">
              <Globe className="h-8 w-8 text-blue-500" />
              <h3 className="text-3xl md:text-4xl font-headline font-bold text-gray-900">Boutique en ligne</h3>
            </div>
            <p className="text-gray-600 font-medium mb-6 max-w-xl mx-auto">
              Site e-commerce complet relié à votre stock StockPlus. Paiements Wave/OM, catalogue automatique.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="text-center">
                <div className="text-4xl font-headline font-bold text-gray-900">79 000 FCFA</div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Paiement unique</div>
              </div>
              <Link href="/waitlist">
                <button className="h-14 px-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg shadow-xl shadow-blue-500/30 transition-all">
                  Ajouter à mon abonnement
                </button>
              </Link>
            </div>
            <p className="text-xs text-gray-400 mt-4">✨ Hébergement & domaine inclus</p>
          </div>
        </div>
      </TimelineContent>
    </div>
  );
}