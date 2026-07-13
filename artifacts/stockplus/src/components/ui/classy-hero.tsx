'use client'
import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from '@/lib/compat/wouter'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { 
    Sparkles, 
    ArrowRight, 
    ShoppingCart, 
    Package, 
    TrendingUp, 
    CheckCircle2,
    Smartphone
} from 'lucide-react'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const TextRotator = ({ words }: { words: string[] }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % words.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [words.length]);

    return (
        <span className="relative inline-block w-full h-[1.1em] overflow-hidden">
            <AnimatePresence mode="wait">
                <motion.span
                    key={currentIndex}
                    initial={{ y: 30, opacity: 0, filter: "blur(10px)" }}
                    animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                    exit={{ y: -30, opacity: 0, filter: "blur(10px)" }}
                    transition={{ duration: 0.6, ease: "circOut" }}
                    className="absolute inset-0 flex items-center justify-center sena-gradient-text italic whitespace-nowrap"
                >
                    {words[currentIndex]}
                </motion.span>
            </AnimatePresence>
        </span>
    );
};

const HeroBackground = () => (
    <div className="absolute inset-0 z-0 overflow-hidden bg-gray-950">
        <div className="absolute inset-0 opacity-15 bg-[url('/noise.svg')] mix-blend-overlay" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
        <motion.div
            animate={{ opacity: [0.1, 0.4, 0.1], scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-[-15%] right-[-15%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[140px]"
        />
        <motion.div
            animate={{ opacity: [0.05, 0.2, 0.05], scale: [1.2, 1, 1.2] }}
            transition={{ duration: 10, repeat: Infinity, delay: 1 }}
            className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]"
        />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.07) 1px, transparent 0)', backgroundSize: '48px 48px' }} />
    </div>
);

const ClassyHero = () => {
    const rotatingWords = ["l'Inventaire", "les Ventes", "la Croissance"];

    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden py-24 sm:py-32">
            <HeroBackground />

            <div className="z-20 text-center px-4 sm:px-6 max-w-6xl mx-auto -mt-8">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, delay: 0.4 }}
                    className="space-y-8 sm:space-y-10"
                >
                    <h1 className="text-white text-5xl xs:text-6xl md:text-8xl lg:text-9xl font-headline font-bold leading-[0.85] tracking-tighter">
                        Gérez votre boutique <br />
                        <TextRotator words={rotatingWords} />
                    </h1>

                    <p className="text-white/60 text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto font-medium leading-relaxed px-4">
                        Libérez-vous du cahier papier. StockPlus automatise votre gestion pour vous concentrer sur ce qui compte : <span className="text-white font-bold">vendre plus.</span>
                    </p>

                    <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center justify-center pt-8 px-6">
                        <Link href="/waitlist" className="w-full sm:w-auto h-16 sm:h-20 px-10 sm:px-16 rounded-[2rem] sena-gradient text-white flex items-center justify-center font-bold text-xl sm:text-2xl shadow-[0_20px_50px_rgba(255,136,0,0.5)] hover:scale-105 active:scale-95 transition-all group">
                            Rejoindre la liste d'attente
                            <ArrowRight className="ml-4 h-6 w-6 sm:h-8 sm:w-8 group-hover:translate-x-2 transition-transform" />
                        </Link>
                        <Link href="https://wa.me/221783636466" target="_blank" className="w-full sm:w-auto h-16 sm:h-20 px-10 sm:px-16 rounded-[2rem] bg-white/5 border-2 border-white/10 text-white flex items-center justify-center font-bold text-xl sm:text-2xl backdrop-blur-2xl hover:bg-white/15 hover:border-primary/50 transition-all">
                            Voir la démo
                        </Link>
                    </div>

                    {/* Badge Bêta privée */}
                    <div className="flex justify-center pt-6">
                      <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-full">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-xs font-black text-primary uppercase tracking-widest">Bêta privée — Ouverture prochaine</span>
                      </div>
                    </div>
                </motion.div>
            </div>

            {/* Left Modules Card */}
            <motion.div
                className="absolute bottom-12 left-12 z-30 hidden 2xl:block"
                initial={{ opacity: 0, x: -120 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1.2, delay: 1.5 }}
            >
                <div className="bg-gray-900/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-10 w-96 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] hover:bg-gray-800 transition-all duration-500 group">
                    <h3 className="text-white text-3xl font-headline font-bold mb-8 group-hover:text-primary transition-colors">Modules Pro</h3>
                    <div className="space-y-6">
                        {[
                            { icon: Package, title: "Stock Intelligent", color: "bg-orange-500" },
                            { icon: ShoppingCart, title: "Caisse Tactile", color: "bg-blue-500" },
                            { icon: TrendingUp, title: "Analyse IA Awa", color: "bg-green-500" }
                        ].map((m, i) => (
                            <div key={i} className="flex items-center gap-6 group/item">
                                <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg group-hover/item:scale-110 transition-all duration-300", m.color)}>
                                    <m.icon className="h-7 w-7 text-white" />
                                </div>
                                <span className="text-white/80 font-bold text-xl">{m.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Right Impact Card */}
            <motion.div
                className="absolute bottom-12 right-12 z-30 hidden 2xl:block"
                initial={{ opacity: 0, x: 120 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1.2, delay: 1.2 }}
            >
                <div className="bg-gray-900/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-10 w-96 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] hover:bg-gray-800 transition-all duration-500 group">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="text-white text-2xl font-bold">Performance</h3>
                            <p className="text-primary text-[10px] tracking-[0.3em] uppercase font-black mt-2">Impact Direct</p>
                        </div>
                        <div className="h-14 w-14 rounded-full sena-gradient flex items-center justify-center shadow-[0_10px_20px_rgba(255,136,0,0.4)]">
                            <TrendingUp className="h-7 w-7 text-white" />
                        </div>
                    </div>
                    <div className="space-y-8">
                        {[
                            { label: "Augmentation Profit", value: "+32%", progress: 100, color: "from-orange-500 to-orange-400" },
                            { label: "Temps Gagné / Semaine", value: "15h", progress: 85, color: "from-blue-500 to-blue-400" },
                        ].map((s, i) => (
                            <div key={i} className="space-y-3">
                                <div className="flex justify-between text-xs font-black uppercase tracking-wider">
                                    <span className="text-white/50">{s.label}</span>
                                    <span className="text-primary">{s.value}</span>
                                </div>
                                <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${s.progress}%` }}
                                        transition={{ duration: 2.5, delay: 2 }}
                                        className={cn("h-full rounded-full bg-gradient-to-r shadow-[0_0_15px_rgba(255,136,0,0.3)]", s.color)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-8 mt-10 pt-10 border-t border-white/10">
                        <div className="text-center group/stat">
                            <div className="text-white font-headline font-bold text-3xl group-hover/stat:text-primary transition-colors">500+</div>
                            <div className="text-white/30 text-[10px] uppercase font-black tracking-widest mt-1">Boutiques</div>
                        </div>
                        <div className="text-center group/stat">
                            <div className="text-white font-headline font-bold text-3xl group-hover/stat:text-primary transition-colors">99%</div>
                            <div className="text-white/30 text-[10px] uppercase font-black tracking-widest mt-1">Satisfaction</div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ClassyHero