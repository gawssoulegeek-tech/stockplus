
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { 
  Zap,
  ChevronRight,
  BrainCircuit,
  ShoppingCart,
  LayoutGrid,
  MessageSquare
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

const Lottie = dynamic(() => import("lottie-react"), { ssr: false })
const AWA_AVATAR_URL = "https://lottie.host/79c5c707-6a2e-4b6e-b394-47867664658a/woman-avatar.json"

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isMounted, setIsMounted] = useState(false)
  const [shopName, setShopName] = useState("")
  const [selectedPlan, setSelectedPlan] = useState("Basic")
  
  const [businessInfo, setBusinessInfo] = useState({
    sector: "",
    teamSize: "",
    expectation: ""
  })

  useEffect(() => {
    setIsMounted(true)
    setShopName(localStorage.getItem("shop_name") || "votre boutique")
    setSelectedPlan(localStorage.getItem("selected_plan") || "Basic")
  }, [])

  const handleNextStep = () => {
    if (step < 3) {
      setStep(step + 1)
    } else {
      localStorage.setItem("onboarding_complete", "true")
      localStorage.setItem("business_sector", businessInfo.sector)
      router.push("/dashboard")
    }
  }

  if (!isMounted) return null

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="noise-overlay" />
      
      <div className="w-full max-w-4xl space-y-12 relative z-10">
        <div className="space-y-6 text-center">
          <div className="inline-flex h-24 w-24 rounded-[2rem] sena-gradient items-center justify-center mb-2 overflow-hidden shadow-2xl shadow-orange-500/20">
            <Lottie path={AWA_AVATAR_URL} loop={true} className="w-full h-full scale-125" />
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-headline font-bold text-gray-900 tracking-tighter">Initialisons StockPlus</h1>
            <p className="text-gray-400 font-medium">L'IA Awa personnalise ses outils pour {shopName}.</p>
          </div>
          <div className="max-w-md mx-auto space-y-4">
            <Progress value={(step / 3) * 100} className="h-1.5 bg-gray-100" />
            <div className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">Étape {step} / 3</div>
          </div>
        </div>

        {step === 1 && (
          <Card className="border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] rounded-[4rem] bg-white overflow-hidden p-12">
            <CardContent className="p-0 space-y-10">
              <div className="flex items-center gap-6">
                 <div className="h-14 w-14 rounded-2xl bg-orange-50 flex items-center justify-center"><BrainCircuit className="text-primary h-7 w-7" /></div>
                 <div>
                    <h2 className="text-2xl font-headline font-bold text-gray-900">Le profil de {shopName}</h2>
                    <p className="text-sm text-gray-400 font-medium">Awa a besoin de savoir ce que vous vendez.</p>
                 </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Secteur d'activité</Label>
                  <Select onValueChange={(val) => setBusinessInfo({...businessInfo, sector: val})}>
                    <SelectTrigger className="h-16 rounded-[1.5rem] border-gray-100 bg-gray-50/50 font-bold">
                      <SelectValue placeholder="Choisir un secteur" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                      <SelectItem value="textile">Textile & Wax</SelectItem>
                      <SelectItem value="electronics">Électronique & Téléphonie</SelectItem>
                      <SelectItem value="grocery">Épicerie & Alimentation</SelectItem>
                      <SelectItem value="cosmetics">Cosmétiques</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Taille de l'équipe</Label>
                  <Select onValueChange={(val) => setBusinessInfo({...businessInfo, teamSize: val})}>
                    <SelectTrigger className="h-16 rounded-[1.5rem] border-gray-100 bg-gray-50/50 font-bold">
                      <SelectValue placeholder="Nombre de gérants" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                      <SelectItem value="solo">Moi uniquement</SelectItem>
                      <SelectItem value="small">2 à 5 gérants</SelectItem>
                      <SelectItem value="large">Plus de 5 gérants</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                disabled={!businessInfo.sector || !businessInfo.teamSize}
                onClick={handleNextStep}
                className="w-full h-20 sena-gradient text-white font-headline font-bold text-2xl rounded-[2.5rem] shadow-2xl shadow-orange-500/20"
              >
                Passer au didacticiel
                <ChevronRight className="ml-2 h-8 w-8" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <Card className="border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] rounded-[4rem] bg-white overflow-hidden p-12 space-y-10">
              <div className="space-y-4">
                <h2 className="text-4xl font-headline font-bold text-gray-900 tracking-tighter">Comment ça marche</h2>
                <p className="text-gray-400 font-medium">Découvrez les 3 piliers de votre nouvelle gestion.</p>
              </div>

              <div className="space-y-8">
                {[
                  { 
                    icon: ShoppingCart, 
                    title: "La Caisse Mobile", 
                    desc: "Vendez en un clic. Scannez ou sélectionnez vos produits, Awa s'occupe du reste.",
                    color: "bg-orange-50 text-primary"
                  },
                  { 
                    icon: LayoutGrid, 
                    title: "Le Contrôle Patron", 
                    desc: "Vous voyez chaque vente en direct. Le papier ne vous ment plus car il n'existe plus.",
                    color: "bg-blue-50 text-blue-600"
                  },
                  { 
                    icon: MessageSquare, 
                    title: "L'Analyse Awa", 
                    desc: "Awa vous dit ce qui se vend le mieux et quand vous devez recommander du stock.",
                    color: "bg-green-50 text-green-600"
                  }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 group">
                    <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", item.color)}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-gray-900">{item.title}</h4>
                      <p className="text-xs text-gray-400 leading-relaxed font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={handleNextStep} className="w-full h-18 sena-gradient text-white font-headline font-bold text-xl rounded-[2rem]">
                Continuer l'activation
                <ChevronRight className="ml-2 h-6 w-6" />
              </Button>
            </Card>

            <div className="space-y-6">
               <Card className="bg-gray-900 text-white p-10 rounded-[4rem] space-y-6 border-none shadow-2xl relative overflow-hidden">
                  <h3 className="text-2xl font-headline font-bold tracking-tight">Le saviez-vous ?</h3>
                  <p className="text-gray-400 text-sm font-medium leading-relaxed">
                    Les boutiques utilisant StockPlus économisent en moyenne 15 heures par semaine sur leurs inventaires.
                  </p>
                  <div className="pt-4 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-500">Optimisation active</span>
                  </div>
               </Card>
            </div>
          </div>
        )}

        {step === 3 && (
          <Card className="border-none shadow-[0_60px_150px_-30px_rgba(0,0,0,0.15)] rounded-[5rem] bg-white overflow-hidden p-16 text-center space-y-12 relative">
            <div className="absolute top-0 left-0 w-full h-3 sena-gradient" />
            
            <div className="space-y-8">
              <div className="h-40 w-40 rounded-[3rem] sena-gradient flex items-center justify-center mx-auto shadow-2xl shadow-orange-500/30 overflow-hidden">
                <Lottie path={AWA_AVATAR_URL} loop={true} className="w-full h-full scale-125" />
              </div>
              <div className="space-y-4">
                <h2 className="text-5xl font-headline font-bold text-gray-900 tracking-tighter">Votre boutique est prête !</h2>
                <p className="text-gray-400 font-medium text-lg">
                  Le plan <strong>{selectedPlan}</strong> a été configuré avec succès pour {shopName}.
                </p>
              </div>
            </div>

            <Button 
              onClick={handleNextStep}
              className="w-full h-24 sena-gradient text-white font-headline font-bold text-3xl rounded-[2.5rem] shadow-2xl shadow-orange-500/40 py-8 active:scale-95 transition-all"
            >
              Lancer StockPlus
            </Button>
            
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.6em] pt-4">
              Keur'Geek Digital Technology
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
