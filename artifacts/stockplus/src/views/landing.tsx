import { Link } from "@/lib/compat/wouter"
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
import Lottie from "lottie-react"
import { cn } from "@/lib/utils"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import ClassyHero from "@/components/ui/classy-hero"
import { TextRevealByWord } from "@/components/ui/text-reveal"
import { KineticNavigation } from "@/components/ui/sterling-gate-kinetic-navigation"
import GradientMenu from "@/components/ui/gradient-menu"

export default function LandingPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [referData, setReferData] = useState<any>(null)
  const [featuresLottieData, setFeaturesLottieData] = useState<any>(null)
  const [ctaLottieData, setCtaLottieData] = useState<any>(null)
  const [problemLottieData, setProblemLottieData] = useState<any>(null)
  const [solutionLottieData, setSolutionLottieData] = useState<any>(null)

  useEffect(() => {
    setIsMounted(true)
    fetch("/landing-hero.json")
      .then(res => res.ok && res.json())
      .then(data => data && setReferData(data))
      .catch(() => {})
    fetch("/landing-features.json")
      .then(res => res.ok && res.json())
      .then(data => data && setFeaturesLottieData(data))
      .catch(() => {})
    fetch("/landing-cta.json")
      .then(res => res.ok && res.json())
      .then(data => data && setCtaLottieData(data))
      .catch(() => {})
    fetch("/landing-problem.json")
      .then(res => res.ok && res.json())
      .then(data => data && setProblemLottieData(data))
      .catch(() => {})
    // Nouveau Lottie pour la section Solution
    fetch("https://lottie.host/05c4e044-e2ad-4888-9795-6bd248d68a56/FtRsfbmGYZ.json")
      .then(res => res.ok && res.json())
      .then(data => data && setSolutionLottieData(data))
      .catch(() => {})
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
      <a 
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 z-[60] bg-[#25D366] text-white p-4 rounded-full shadow-[0_20px_50px_rgba(37,211,102,0.4)] hover:scale-110 transition-transform active:scale-95 group"
      >
        <MessageCircle className="h-8 w-8 fill-white" />
        <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border pointer-events-none">
          Besoin d'aide ? Contactez-nous
        </span>
      </a>

      <main className="flex-1">
        {/* HERO SECTION */}
        <ClassyHero />

        {/* SECTION 2: LE PROBLÈME */}
        <section id="problemes" className="py-16 md:py-24 lg:py-32 bg-gray-50/50 relative overflow-hidden">
          {problemLottieData && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[400px] sm:h-[400px] lg:w-[500px] lg:h-[500px] opacity-20 sm:opacity-30 pointer-events-none">
              <Lottie animationData={problemLottieData} loop={true} className="w-full h-full" />
            </div>
          )}
          <div className="container px-6 mx-auto relative z-10">
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

              <div className="relative h-[400px] sm:h-[500px] md:h-[650px] bg-orange-50 rounded-[2rem] md:rounded-[3rem] p-1.5 flex items-center justify-center overflow-hidden shadow-2xl">
                <div className="relative w-full h-full rounded-[1.8rem] md:rounded-[2.8rem] overflow-hidden flex items-center justify-center bg-gradient-to-br from-orange-50 to-white">
                  {solutionLottieData ? (
                    <Lottie animationData={solutionLottieData} loop={true} className="w-full h-full p-4 md:p-8" />
                  ) : featuresLottieData ? (
                    <Lottie animationData={featuresLottieData} loop={true} className="w-full h-full p-4 md:p-8" />
                  ) : solutionImage?.imageUrl ? (
                    <img src={solutionImage.imageUrl} alt="StockPlus Mobile" className="object-cover" />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent opacity-80" />
                  <div className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 w-full px-4 md:px-8">
                    <div className="glass-card p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] text-center border-white/20">
                      <div className="h-10 w-10 md:h-14 md:w-14 bg-primary rounded-xl flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-2xl shadow-orange-500/50">
                        <ShieldCheck className="h-5 w-5 md:h-7 md:w-7 text-white" />
                      </div>
                      <p className="text-lg md:text-2xl font-headline font-bold text-gray-900 leading-tight">
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
            {/* 🎁 Offre de lancement */}
            <div className="max-w-4xl mx-auto mb-16">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-100 rounded-[2.5rem] p-8 md:p-12 text-center space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                    🎁 Offre de lancement
                  </div>
                  <h3 className="text-3xl md:text-4xl font-headline font-bold text-gray-900 tracking-tighter mb-3">
                    1 mois gratuit pour les 50 premières boutiques
                  </h3>
                  <p className="text-gray-600 font-medium text-lg max-w-2xl mx-auto">
                    Sans frais d'abonnement pendant cette période. Profitez de toutes les fonctionnalités StockPlus gratuitement.
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm font-bold text-primary">Places limitées — Bêta privée</span>
                  </div>
                </div>
              </div>
            </div>

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
                  period: "30 jours",
                  color: "border-gray-100 bg-white hover:bg-orange-50/20 shadow-sm",
                  btnClass: "bg-gray-100 text-gray-900 hover:bg-orange-100",
                  features: [
                    "POS complet",
                    "Gestion des produits et du stock",
                    "Dashboard & rapports",
                    "Impression de facture thermique",
                    "Gestion des clients",
                    "IA Awa basique",
                    "2 gérants",
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
                    "Rapports de ventes détaillés",
                    "2 gérants (propriétaire + 1)",
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
                    "IA Awa avancée & prévisions",
                    "Analyse des bénéfices et ruptures",
                    "Rapports avancés & exports PDF/Excel",
                    "Scan IA des produits (photo)",
                    "Scan facture fournisseurs (auto-stock)",
                    "CRM & relance automatique clients",
                    "Comptabilité simple & export comptable",
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
                    <Link href="/waitlist">
                      {plan.name === "ESSAI" ? "Rejoindre la liste" : `Choisir ${plan.name}`}
                    </Link>
                  </Button>
                </div>
              ))}
            </div>

            {/* 🎁 Message cadeau sous les tarifs */}
            <div className="max-w-3xl mx-auto mt-12 text-center">
              <div className="inline-flex items-center gap-3 bg-gray-50 rounded-2xl px-6 py-4">
                <span className="text-2xl">🎁</span>
                <p className="text-sm font-medium text-gray-600 text-left">
                  Les <strong className="text-gray-900">50 premières boutiques</strong> bénéficient d'<strong className="text-primary">1 mois gratuit</strong>, sans frais d'abonnement pendant cette période.
                </p>
              </div>
            </div>

            {/* Types de boutiques compatibles */}
            <div className="mt-24 max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <Badge className="bg-blue-50 text-blue-600 border-none px-6 py-2 rounded-full font-black text-xs tracking-widest uppercase mb-4">Boutiques compatibles</Badge>
                <h3 className="text-3xl md:text-4xl font-headline font-bold text-gray-900 tracking-tighter">
                  StockPlus s'adapte à votre commerce
                </h3>
                <p className="text-lg text-gray-500 font-medium mt-3">
                  Conçu pour tous les types de boutiques au Sénégal et en Afrique de l'Ouest.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: "Épicerie & Alimentation", emoji: "🛒", desc: "Gestion du stock, péremption, ventes en gros & détail" },
                  { name: "Textile & Wax", emoji: "🧵", desc: "Vente au mètre, lots, gestion des coloris et tailles" },
                  { name: "Cosmétiques & Beauté", emoji: "💄", desc: "Catalogue produit, fidélité clients, ventes à crédit" },
                  { name: "Électronique & Téléphonie", emoji: "📱", desc: "Numéros de série, garantie, accessoires" },
                  { name: "Restaurant & Restauration", emoji: "🍽️", desc: "Menu, caisse rapide, gestion des tables" },
                  { name: "Quincaillerie & Bricolage", emoji: "🔨", desc: "Vente au kilo, au mètre, stock en gros" },
                  { name: "Pharmacie & Santé", emoji: "💊", desc: "Lots, dates de péremption, ordonnances" },
                  { name: "Boutique générale", emoji: "🏪", desc: "Multi-catégories, tout type de produits" },
                ].map((shop, i) => (
                  <div key={i} className="p-6 rounded-2xl border border-gray-100 bg-white hover:border-orange-200 hover:shadow-lg transition-all text-center group">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{shop.emoji}</div>
                    <p className="font-bold text-gray-900 text-sm mb-2">{shop.name}</p>
                    <p className="text-xs text-gray-400 font-medium leading-relaxed">{shop.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-gray-400 font-medium mt-8">
                + Boutiques de chaussures, librairie, pièces auto, accessoires mode, et bien d'autres...
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
                  <div className="bg-white p-6 sm:p-10 md:p-12 rounded-[2rem] md:rounded-[4rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] border-none space-y-8 md:space-y-10 relative overflow-hidden text-center hover:bg-orange-50/20 transition-colors duration-700 group">
                     <div className="absolute top-0 left-0 w-full h-3 sena-gradient" />
                     {referData ? (
                       <div className="h-32 w-32 sm:h-40 sm:w-40 md:h-48 md:w-48 mx-auto group-hover:scale-110 transition-transform duration-500">
                         <Lottie animationData={referData} loop={true} className="w-full h-full" />
                       </div>
                     ) : (
                       <div className="h-20 w-24 sm:h-24 sm:w-28 bg-orange-50 rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-500 shadow-inner">
                          <Smartphone className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                       </div>
                     )}
                    <div className="space-y-3 md:space-y-4">
                      <h3 className="text-2xl md:text-3xl font-headline font-bold text-gray-900 leading-tight">Rejoignez les commerçants qui réussissent.</h3>
                      <p className="text-gray-500 font-medium text-base md:text-lg leading-relaxed">
                        Plus qu'un simple logiciel, StockPlus est l'allié digital de votre boutique pour maximiser vos profits.
                      </p>
                    </div>
                    <Button size="lg" className="h-16 md:h-20 px-8 md:px-12 rounded-full sena-gradient text-white w-full font-bold text-lg md:text-xl shadow-2xl shadow-orange-500/30 hover:scale-[1.03] transition-transform duration-300" asChild>
                      <Link href="/waitlist">Rejoindre la liste d'attente</Link>
                    </Button>
                    <p className="text-center text-xs text-gray-400 font-medium">
                      🔒 Bêta privée — Inscriptions limitées
                    </p>
                  </div>
              </div>
           </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-white border-t border-gray-100 py-24">
           <div className="container px-6 mx-auto">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-16">
                 <div className="space-y-8 col-span-1 lg:col-span-1">
                    <div className="flex items-center gap-3">
                       <img src="/logo.png" alt="StockPlus" className="h-12 w-12 object-contain" />
                       <span className="text-3xl font-headline font-bold text-gray-900 tracking-tighter">StockPlus</span>
                    </div>
                    <p className="text-gray-400 font-medium text-lg leading-relaxed">
                       La plateforme de gestion intelligente pour les commerçants ambitieux au Sénégal.
                    </p>
                 </div>
                 <div>
                    <h5 className="font-bold text-gray-900 mb-8 text-lg">Plateforme</h5>
                    <ul className="space-y-6">
                       <li><Link href="#solution" className="text-gray-400 hover:text-primary transition-colors font-medium">Fonctionnalités</Link></li>
                       <li><Link href="#prix" className="text-gray-400 hover:text-primary transition-colors font-medium">Tarification</Link></li>
                       <li><Link href="#demo" className="text-gray-400 hover:text-primary transition-colors font-medium">Démonstration</Link></li>
                    </ul>
                 </div>
                 <div>
                    <h5 className="font-bold text-gray-900 mb-8 text-lg">Société</h5>
                    <ul className="space-y-6">
                       <li><Link href="#" className="text-gray-400 hover:text-primary transition-colors font-medium">À propos</Link></li>
                       <li><Link href="#" className="text-gray-400 hover:text-primary transition-colors font-medium">Contact</Link></li>
                       <li><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors font-medium">Support WhatsApp</a></li>
                    </ul>
                 </div>
                 <div>
                    <h5 className="font-bold text-gray-900 mb-8 text-lg">Légal</h5>
                    <ul className="space-y-6">
                       <li><Link href="#" className="text-gray-400 hover:text-primary transition-colors font-medium">Confidentialité</Link></li>
                       <li><Link href="#" className="text-gray-400 hover:text-primary transition-colors font-medium">Conditions d'utilisation</Link></li>
                    </ul>
                 </div>
              </div>
              <div className="mt-24 pt-12 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-8">
                 <p className="text-gray-400 font-medium">© 2024 StockPlus par Keur'Geek Digital. Tous droits réservés.</p>
                 <div className="flex items-center gap-10">
                    <span className="text-gray-300 font-bold tracking-widest text-xs uppercase">Dakar, Sénégal</span>
                 </div>
              </div>
           </div>
        </footer>
      </main>
    </div>
  )
}
