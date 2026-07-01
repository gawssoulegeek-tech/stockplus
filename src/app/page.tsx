'use client'

import Link from "next/link"
import Image from "next/image"
import { 
  Sparkles, 
  CheckCircle2, 
  Package, 
  Zap, 
  ShieldAlert, 
  Clock, 
  Receipt, 
  ShieldCheck, 
  MessageCircle, 
  Smartphone, 
  Check, 
  ShoppingCart, 
  TrendingUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import ClassyHero from "@/components/ui/classy-hero"
import { TextRevealByWord } from "@/components/ui/text-reveal"
import { KineticNavigation } from "@/components/ui/sterling-gate-kinetic-navigation"
import GradientMenu from "@/components/ui/gradient-menu"

export default function LandingPage() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) return null

  const solutionImage = PlaceHolderImages.find(img => img.id === 'mobile-pos-context')
  const WHATSAPP_NUMBER = "+221783636466"
  const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=Bonjour, je souhaite avoir une démonstration de StockPlus.`

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDFD]">
      <div className="noise-overlay" />
      
      <KineticNavigation />

      {/* FLOATING WHATSAPP BUTTON */}
      <Link 
        href={WHATSAPP_URL}
        target="_blank"
        className="fixed bottom-8 right-8 z-[60] bg-[#25D366] text-white p-4 rounded-full shadow-[0_20px_50px_rgba(37,211,102,0.4)] hover:scale-110 transition-transform active:scale-95 group"
      >
        <MessageCircle className="h-8 w-8 fill-white" />
        <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border pointer-events-none">
          Besoin d'aide ? Contactez-nous
        </span>
      </Link>

      <main className="flex-1">
        {/* HERO SECTION */}
        <ClassyHero />

        {/* SECTION 2: LE PROBLÈME */}
        <section id="problemes" className="py-24 md:py-32 bg-gray-50/50">
          <div className="container px-6 mx-auto">
            <div className="max-w-3xl mx-auto text-center space-y-8 mb-20">
              <h2 className="text-4xl md:text-5xl font-headline font-bold text-gray-900 tracking-tighter leading-tight">
                Chaque jour, des boutiques <br />
                <span className="italic text-primary">perdent de l'argent sans le savoir.</span>
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { 
                  title: "Stock inconnu", 
                  desc: "Vous ne connaissez pas votre stock réel et ratez des ventes par manque d'articles.",
                  icon: Package,
                  color: "bg-red-500 text-white"
                },
                { 
                  title: "Ventes oubliées", 
                  desc: "Des ventes sont oubliées ou mal enregistrées sur le cahier papier.",
                  icon: Zap,
                  color: "bg-orange-500 text-white"
                },
                { 
                  title: "Manque de contrôle", 
                  desc: "Vous ne savez pas toujours ce que font vos gérants quand vous n'êtes pas là.",
                  icon: ShieldAlert,
                  color: "bg-blue-500 text-white"
                },
                { 
                  title: "Temps perdu", 
                  desc: "Vous passez trop de temps à compter et vérifier au lieu de vendre.",
                  icon: Clock,
                  color: "bg-green-500 text-white"
                }
              ].map((item, i) => (
                <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm hover:shadow-[0_30px_60px_-15px_rgba(255,136,0,0.2)] hover:bg-orange-50/30 transition-all duration-500 border border-gray-100 group">
                  <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform duration-500", item.color)}>
                    <item.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-headline font-bold text-gray-900 mb-4">{item.title}</h3>
                  <p className="text-gray-500 font-medium leading-relaxed text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* REVEAL TRANSITION 1 */}
        <section className="bg-white">
          <TextRevealByWord text="Il est temps d'abandonner les cahiers papier et de transformer votre boutique en un business intelligent." />
        </section>

        {/* SECTION 3: LA SOLUTION */}
        <section id="solution" className="py-24 md:py-32 bg-white">
          <div className="container px-6 mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 md:gap-24 items-center">
              <div className="space-y-10">
                <div className="space-y-6">
                  <Badge className="bg-primary/10 text-primary border-none px-5 py-2 rounded-full font-black text-xs tracking-widest uppercase">La Solution</Badge>
                  <h2 className="text-4xl md:text-6xl font-headline font-bold text-gray-900 leading-[0.95] tracking-tighter">
                    Une boutique mieux organisée <br />
                    <span className="sena-gradient-text italic">en quelques clics.</span>
                  </h2>
                </div>

                <div className="grid gap-8">
                  {[
                    { icon: Package, title: "Gestion de Stock", desc: "Ajoutez vos produits et suivez les quantités en temps réel." },
                    { icon: ShoppingCart, title: "Vente Rapide", desc: "Validez une vente en quelques secondes sur mobile." },
                    { icon: Receipt, title: "Factures Automatiques", desc: "Générez et imprimez des factures professionnelles immédiatement." },
                    { icon: ShieldCheck, title: "Contrôle des Gérants", desc: "Suivez les ventes même lorsque vous n'êtes pas sur place." }
                  ].map((feat, i) => (
                    <div key={i} className="flex gap-6 group">
                      <div className="h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 transition-all group-hover:bg-primary group-hover:text-white group-hover:shadow-xl group-hover:shadow-orange-500/30">
                        <feat.icon className="h-7 w-7" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xl font-bold text-gray-900">{feat.title}</h4>
                        <p className="text-gray-400 text-base font-medium leading-relaxed">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative h-[500px] md:h-[650px] bg-orange-50 rounded-[3rem] p-1.5 flex items-center justify-center overflow-hidden shadow-2xl">
                <div className="relative w-full h-full rounded-[2.8rem] overflow-hidden">
                  {solutionImage?.imageUrl && (
                    <Image src={solutionImage.imageUrl} alt="StockPlus Mobile" fill className="object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent opacity-80" />
                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full px-8">
                    <div className="glass-card p-8 rounded-[2rem] text-center border-white/20">
                      <div className="h-14 w-14 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-orange-500/50">
                        <ShieldCheck className="h-7 w-7 text-white" />
                      </div>
                      <p className="text-2xl font-headline font-bold text-gray-900 leading-tight">
                        "Reprenez le contrôle total de vos profits."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* REVEAL TRANSITION 2 */}
        <section className="bg-gray-50/50">
          <TextRevealByWord text="L'intelligence Awa analyse chaque mouvement pour vous aider à commander au bon moment." />
        </section>

        {/* SECTION 4: DÉMONSTRATION */}
        <section id="demo" className="py-24 md:py-32 bg-gray-950 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 blur-[120px] rounded-full" />
          <div className="container px-6 mx-auto relative z-10">
            <div className="text-center mb-24 max-w-2xl mx-auto space-y-4">
              <Badge className="bg-primary/20 text-primary border-none px-6 py-2 rounded-full font-bold">Démonstration</Badge>
              <h2 className="text-5xl md:text-6xl font-headline font-bold tracking-tighter leading-none">Comment ça marche ?</h2>
              <p className="text-gray-400 text-lg font-medium">Quatre étapes simples pour moderniser votre commerce.</p>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12">
              {[
                { step: "01", title: "Ajoutez un produit", desc: "Scannez via l'IA ou entrez les informations manuellement." },
                { step: "02", title: "Effectuez une vente", desc: "Validez la transaction en un clic sur votre smartphone." },
                { step: "03", title: "Facture automatique", desc: "Le reçu est généré instantanément pour votre client." },
                { step: "04", title: "Stock à jour", desc: "Votre inventaire est calculé et mis à jour en temps réel." }
              ].map((item, i) => (
                <div key={i} className="space-y-8 relative group">
                  <div className="text-9xl font-headline font-bold text-white/5 absolute -top-12 left-0 group-hover:text-primary/10 transition-colors duration-700">{item.step}</div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-full w-0 bg-primary group-hover:w-full transition-all duration-1000 ease-in-out" />
                  </div>
                  <div className="space-y-4 relative z-10">
                    <h3 className="text-2xl font-headline font-bold group-hover:text-primary transition-colors">{item.title}</h3>
                    <p className="text-gray-400 text-base font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* REVEAL TRANSITION 3 */}
        <section className="bg-white">
          <TextRevealByWord text="Un investissement rentable dès la première semaine pour propulser votre boutique vers le futur." />
        </section>

        {/* SECTION 5: TARIFICATION */}
        <section id="prix" className="py-24 md:py-32 bg-white">
          <div className="container px-6 mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
              <Badge className="bg-primary/10 text-primary border-none px-6 py-2 rounded-full font-black text-xs tracking-widest uppercase">Tarification</Badge>
              <h2 className="text-5xl md:text-7xl font-headline font-bold tracking-tighter text-gray-900 leading-[0.9]">
                Un tarif juste pour <br /><span className="text-gray-300 italic">votre croissance.</span>
              </h2>
              <p className="text-xl text-gray-500 font-medium">Simple, transparent, payable via Wave ou Orange Money.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
              {[
                { 
                  name: "ESSAI", 
                  price: "Gratuit", 
                  period: "14 jours",
                  color: "border-gray-100 bg-white hover:bg-orange-50/20 shadow-sm",
                  btnClass: "bg-gray-100 text-gray-900 hover:bg-orange-100",
                  features: [
                    "POS complet",
                    "Gestion des produits et du stock",
                    "Dashboard & rapports",
                    "Impression de facture thermique",
                    "Gestion des clients",
                    "IA Awa basique",
                    "1 gérant",
                  ] 
                },
                { 
                  name: "BASIC", 
                  price: "10 000", 
                  period: "/mois",
                  recommended: true,
                  color: "border-primary/20 bg-white hover:border-primary shadow-2xl shadow-orange-500/10 scale-105 md:scale-110 z-10",
                  btnClass: "sena-gradient text-white hover:brightness-110",
                  features: [
                    "Tout l'Essai",
                    "Sauvegarde cloud automatique",
                    "Notifications de stock faible",
                    "Historique illimité",
                    "Produits illimités",
                    "Rapports de ventes",
                    "",
                  ] 
                },
                { 
                  name: "PRO", 
                  price: "25 000", 
                  period: "/mois",
                  color: "bg-gray-100 border-gray-200 hover:bg-white hover:border-primary/30 transition-all",
                  btnClass: "bg-gray-900 text-white hover:bg-gray-800",
                  features: [
                    "Tout le plan Basic",
                    "Prix de gros & vente à crédit",
                    "Multi-panier (caisses simultanées)",
                    "IA avancée & prévisions",
                    "Analyse des bénéfices et ruptures",
                    "Rapports avancés",
                    "Scan IA des produits",
                    "Import & Export Excel/PDF",
                    "Scan facture fournisseurs (auto-stock)",
                    "Jusqu'à 20 gérants",
                    "Support prioritaire 7j/7",
                  ] 
                }
              ].map((plan, i) => (
                <div key={i} className={cn(
                  "p-12 rounded-[3.5rem] border transition-all duration-500 relative group flex flex-col scale-100 hover:scale-[1.02]",
                  plan.color
                )}>
                  {plan.recommended && (
                    <Badge className="absolute top-8 right-8 bg-primary text-white border-none font-black text-[10px] tracking-[0.2em] px-6 h-9 rounded-full uppercase shadow-xl shadow-orange-500/40">RECOMMANDÉ</Badge>
                  )}
                  <div className="mb-10">
                    <h3 className={cn("text-xl font-headline font-bold mb-2 uppercase tracking-[0.2em]", plan.recommended ? "text-primary" : "text-gray-400")}>{plan.name}</h3>
                  </div>
                  <div className="flex items-baseline gap-3 mb-12">
                    <span className="text-6xl md:text-7xl font-headline font-bold">{plan.price}</span>
                    <span className={cn("text-xs font-bold uppercase tracking-[0.2em]", plan.recommended ? "opacity-60" : "opacity-40")}>{plan.period}</span>
                  </div>
                  <ul className="space-y-6 mb-12 flex-1">
                    {plan.features.filter(f => f).map((f, j) => (
                      <li key={j} className="flex items-center gap-4 text-base font-bold">
                        <div className={cn("h-6 w-6 rounded-full flex items-center justify-center shrink-0", plan.recommended ? "bg-primary/20 text-primary" : "bg-orange-100 text-primary")}>
                           <Check className="h-3.5 w-3.5" />
                        </div>
                        <span className={plan.recommended ? "text-gray-300" : "text-gray-600"}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className={cn(
                    "w-full h-20 rounded-[2rem] font-bold text-xl transition-all shadow-2xl",
                    plan.btnClass
                  )} asChild>
                    <Link href={plan.name === "ESSAI" ? "/register?plan=Basic" : `/register?plan=${plan.name}`}>
                      {plan.name === "ESSAI" ? "Essayer gratuitement" : `Choisir ${plan.name}`}
                    </Link>
                  </Button>
                </div>
              ))}
            </div>

            {/* Modules Premium */}
            <div className="mt-24 max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <Badge className="bg-blue-50 text-blue-600 border-none px-6 py-2 rounded-full font-black text-xs tracking-widest uppercase mb-4">Modules Premium</Badge>
                <h3 className="text-3xl md:text-4xl font-headline font-bold text-gray-900 tracking-tighter">
                  Personnalisez votre boutique
                </h3>
                <p className="text-lg text-gray-500 font-medium mt-3">
                  Ajoutez des fonctionnalités à la carte, quel que soit votre plan.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: "Import Chine", price: "2 500", emoji: "🌍" },
                  { name: "Unités de mesure", price: "2 500", emoji: "📏" },
                  { name: "Multi-panier", price: "2 500", emoji: "🛒" },
                  { name: "Rapports avancés", price: "2 500", emoji: "📊" },
                  { name: "Fidélité", price: "2 500", emoji: "⭐" },
                  { name: "WhatsApp Business", price: "2 500", emoji: "💬" },
                  { name: "Restaurant", price: "5 000", emoji: "🍽️" },
                  { name: "Multi-boutiques", price: "10 000", emoji: "🏪" },
                ].map((mod, i) => (
                  <div key={i} className="p-6 rounded-2xl border border-gray-100 bg-white hover:border-blue-200 transition-all text-center group">
                    <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{mod.emoji}</div>
                    <p className="font-bold text-gray-900 text-sm mb-1">{mod.name}</p>
                    <p className="text-primary font-headline font-bold text-lg">{mod.price} <span className="text-[10px] text-gray-400 uppercase tracking-widest">CFA</span></p>
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-gray-400 font-medium mt-8">
                + Scanner code-barres, Paiement Wave, Orange Money, SMS, Pharmacie, Balance, Étiquettes...
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 6: POURQUOI STOCKPLUS */}
        <section className="py-24 md:py-32 bg-gray-50/50">
           <div className="container px-6 mx-auto">
              <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 md:gap-24 items-center">
                 <div className="space-y-12">
                    <h2 className="text-4xl md:text-5xl font-headline font-bold text-gray-900 tracking-tighter leading-none">Pourquoi choisir StockPlus ?</h2>
                    <div className="space-y-10">
                       {[
                         { title: "Développé pour le Sénégal", desc: "Conçu spécifiquement pour les réalités des boutiques de Dakar, Saint-Louis et partout au Sénégal." },
                         { title: "Simple à utiliser", desc: "Aucune compétence technique nécessaire. Si vous savez utiliser WhatsApp, vous savez utiliser StockPlus." },
                         { title: "Accessible partout", desc: "Consultez vos ventes depuis votre smartphone, tablette ou ordinateur où que vous soyez." },
                         { title: "Support local réactif", desc: "Une équipe à Dakar prête à vous accompagner en cas de besoin par téléphone ou sur place." }
                       ].map((item, i) => (
                         <div key={i} className="flex gap-6 group">
                            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1 shadow-[0_10px_20px_rgba(255,136,0,0.3)] group-hover:scale-110 transition-transform">
                               <Check className="h-6 w-6 text-white" />
                            </div>
                            <div>
                               <h4 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h4>
                               <p className="text-gray-500 text-lg font-medium leading-relaxed">{item.desc}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
                 <div className="bg-white p-12 rounded-[4rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] border-none space-y-10 relative overflow-hidden text-center hover:bg-orange-50/20 transition-colors duration-700 group">
                    <div className="absolute top-0 left-0 w-full h-3 sena-gradient" />
                    <div className="h-24 w-28 bg-orange-50 rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-500 shadow-inner">
                       <Smartphone className="h-12 w-12 text-primary" />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-3xl font-headline font-bold text-gray-900 leading-tight">Rejoignez les commerçants qui réussissent.</h3>
                      <p className="text-gray-500 font-medium text-lg leading-relaxed">
                        Plus qu'un simple logiciel, StockPlus est l'allié digital de votre boutique pour maximiser vos profits.
                      </p>
                    </div>
                    <Button size="lg" className="h-20 px-12 rounded-full sena-gradient text-white w-full font-bold text-xl shadow-2xl shadow-orange-500/30 hover:scale-[1.03] transition-transform duration-300" asChild>
                       <Link href="/register">Démarrer mon essai gratuit</Link>
                    </Button>
                 </div>
              </div>
           </div>
        </section>

        {/* SECTION 7: COMMUNAUTÉ */}
        <section className="py-24 bg-white text-center space-y-10">
          <div className="space-y-4">
            <Badge variant="outline" className="border-primary text-primary font-bold">Communauté</Badge>
            <h2 className="text-4xl font-headline font-bold">Suivez l'aventure StockPlus</h2>
            <p className="text-gray-400 font-medium">Découvrez nos tutoriels, coulisses et actus sur tous nos réseaux.</p>
          </div>
          <GradientMenu />
        </section>

        {/* SECTION 8: CTA FINAL */}
        <section className="py-24 md:py-40 bg-white relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 blur-[150px] rounded-full pointer-events-none" />
          <div className="container px-6 mx-auto text-center relative z-10">
            <div className="max-w-4xl mx-auto space-y-12">
              <h2 className="text-6xl md:text-8xl font-headline font-bold text-gray-900 tracking-tighter leading-[0.85]">
                Prenez le contrôle <br />
                <span className="sena-gradient-text italic">dès aujourd'hui.</span>
              </h2>
              <p className="text-xl md:text-2xl text-gray-500 font-medium max-w-2xl mx-auto leading-relaxed">
                Essayez StockPlus et simplifiez votre gestion. L'inscription prend moins de 2 minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-8 justify-center pt-8">
                <Button size="lg" className="h-24 px-16 rounded-[2.5rem] sena-gradient text-white border-none font-bold text-2xl shadow-[0_30px_60px_-10px_rgba(255,136,0,0.5)] hover:scale-105 transition-all duration-300" asChild>
                  <Link href="/register">
                    Essayer StockPlus
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="h-24 px-16 rounded-[2.5rem] border-2 border-gray-100 font-bold text-2xl hover:bg-gray-50 hover:border-primary transition-all duration-300" asChild>
                   <Link href={WHATSAPP_URL} target="_blank">
                     Démo WhatsApp
                   </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-24 px-8 bg-gray-950 text-white relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-full h-1 sena-gradient" />
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
          <div className="space-y-8 md:col-span-2">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl sena-gradient flex items-center justify-center shadow-2xl shadow-orange-500/40">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <span className="font-headline font-bold text-3xl tracking-tighter">StockPlus</span>
            </div>
            <p className="max-w-md text-gray-400 font-medium text-lg leading-relaxed">
              La solution de gestion intelligente pour les boutiques du Sénégal. 
              Propulsé par <span className="text-white font-bold">Keur'Geek Digital</span>.
            </p>
          </div>
          <div className="space-y-8">
            <h4 className="font-bold text-primary uppercase text-xs tracking-[0.3em]">Navigation</h4>
            <ul className="space-y-5 text-base font-bold text-gray-400">
              <li><Link href="#problemes" className="hover:text-white transition-colors">Problèmes</Link></li>
              <li><Link href="#solution" className="hover:text-white transition-colors">Solution</Link></li>
              <li><Link href="#prix" className="hover:text-white transition-colors">Tarifs</Link></li>
            </ul>
          </div>
          <div className="space-y-8">
            <h4 className="font-bold text-primary uppercase text-xs tracking-[0.3em]">Keur'Geek Digital</h4>
            <ul className="space-y-5 text-base font-bold text-gray-400">
              <li className="flex items-center gap-3 italic">Dakar, Sénégal</li>
              <li>contact@keurgeek.com</li>
              <li className="text-primary font-bold text-xl">+221 78 363 64 66</li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-black text-gray-500 uppercase tracking-[0.5em]">
           <p>© 2024 STOCKPLUS • TECHNOLOGY BY KEUR'GEEK DIGITAL</p>
           <div className="flex gap-10">
              <Link href="#" className="hover:text-white transition-all">Conditions</Link>
              <Link href="#" className="hover:text-white transition-all">Confidentialité</Link>
           </div>
        </div>
      </footer>
    </div>
  )
}
