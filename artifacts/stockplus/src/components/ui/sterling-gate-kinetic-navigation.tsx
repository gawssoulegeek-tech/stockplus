'use client';

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { Sparkles } from "lucide-react";
import { Link } from "wouter";

if (typeof window !== "undefined") {
  gsap.registerPlugin(CustomEase);
}

export function KineticNavigation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!containerRef.current) return;

    try {
        if (!gsap.parseEase("main")) {
          CustomEase.create("main", "0.65, 0.01, 0.05, 0.99");
          gsap.defaults({ ease: "main", duration: 0.7 });
        }
    } catch (e) {
        gsap.defaults({ ease: "power2.out", duration: 0.7 });
    }

    const ctx = gsap.context(() => {
      const menuItems = containerRef.current!.querySelectorAll(".menu-list-item[data-shape]");
      const shapesContainer = containerRef.current!.querySelector(".ambient-background-shapes");
      
      menuItems.forEach((item) => {
        const shapeIndex = item.getAttribute("data-shape");
        const shape = shapesContainer ? shapesContainer.querySelector(`.bg-shape-${shapeIndex}`) : null;
        if (!shape) return;
        const shapeEls = shape.querySelectorAll(".shape-element");

        const onEnter = () => {
             if (shapesContainer) {
                 shapesContainer.querySelectorAll(".bg-shape").forEach((s) => s.classList.remove("active"));
             }
             shape.classList.add("active");
             gsap.fromTo(shapeEls, 
                { scale: 0.5, opacity: 0, rotation: -10 },
                { scale: 1, opacity: 1, rotation: 0, duration: 0.6, stagger: 0.08, ease: "back.out(1.7)", overwrite: "auto" }
             );
        };
        const onLeave = () => {
            gsap.to(shapeEls, {
                scale: 0.8, opacity: 0, duration: 0.3, ease: "power2.in",
                onComplete: () => shape.classList.remove("active"),
                overwrite: "auto"
            });
        };
        item.addEventListener("mouseenter", onEnter);
        item.addEventListener("mouseleave", onLeave);
        (item as any)._cleanup = () => {
            item.removeEventListener("mouseenter", onEnter);
            item.removeEventListener("mouseleave", onLeave);
        };
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
      if (!isMounted || !containerRef.current) return;
      const ctx = gsap.context(() => {
        const navWrap = containerRef.current!.querySelector(".nav-overlay-wrapper");
        const menu = containerRef.current!.querySelector(".menu-content");
        const overlay = containerRef.current!.querySelector(".overlay");
        const bgPanels = containerRef.current!.querySelectorAll(".backdrop-layer");
        const menuLinks = containerRef.current!.querySelectorAll(".nav-link");
        const fadeTargets = containerRef.current!.querySelectorAll("[data-menu-fade]");
        const menuButton = containerRef.current!.querySelector(".nav-close-btn");
        const menuButtonTexts = menuButton?.querySelectorAll("p");
        const menuButtonIcon = menuButton?.querySelector(".menu-button-icon");

        const tl = gsap.timeline();
        if (isMenuOpen) {
            if (navWrap) navWrap.setAttribute("data-nav", "open");
            tl.set(navWrap, { display: "block" })
              .set(menu, { xPercent: 0 }, "<")
              .fromTo(menuButtonTexts, { yPercent: 0 }, { yPercent: -100, stagger: 0.2 })
              .fromTo(menuButtonIcon, { rotate: 0 }, { rotate: 315 }, "<")
              .fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1 }, "<")
              .fromTo(bgPanels, { xPercent: 101 }, { xPercent: 0, stagger: 0.12, duration: 0.575 }, "<")
              .fromTo(menuLinks, { yPercent: 140, rotate: 10 }, { yPercent: 0, rotate: 0, stagger: 0.05 }, "<+=0.35");
            if (fadeTargets.length) {
                tl.fromTo(fadeTargets, { autoAlpha: 0, yPercent: 50 }, { autoAlpha: 1, yPercent: 0, stagger: 0.04, clearProps: "all" }, "<+=0.2");
            }
        } else {
            if (navWrap) navWrap.setAttribute("data-nav", "closed");
            tl.to(overlay, { autoAlpha: 0 })
              .to(menu, { xPercent: 120 }, "<")
              .to(menuButtonTexts, { yPercent: 0 }, "<")
              .to(menuButtonIcon, { rotate: 0 }, "<")
              .set(navWrap, { display: "none" });
        }
      }, containerRef);
      return () => ctx.revert();
  }, [isMenuOpen, isMounted]);

  const toggleMenu = () => setIsMenuOpen(prev => !prev);
  const closeMenu = () => setIsMenuOpen(false);

  if (!isMounted) return null;

  return (
    <div ref={containerRef} className="fixed top-0 left-0 w-full z-[100] pointer-events-none">
        <header className="w-full py-2 px-6 pointer-events-auto transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between h-12">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="h-6 w-6 md:h-8 md:w-8 rounded-lg sena-gradient flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Sparkles className="h-3 w-3 md:h-4 md:w-4 text-white" />
              </div>
              <span className="font-headline font-bold text-sm md:text-base tracking-tighter text-white drop-shadow-md">StockPlus</span>
            </Link>
            <div className="flex items-center gap-3">
              <button onClick={toggleMenu} className="nav-close-btn flex items-center gap-2 bg-black/10 backdrop-blur-md border border-white/10 py-1.5 px-4 md:px-5 rounded-full hover:bg-black/30 transition-all shadow-xl">
                <div className="h-3 overflow-hidden text-[8px] md:text-[9px] font-black text-white uppercase tracking-widest relative">
                  <p>Menu</p>
                  <p className="absolute top-full">Fermer</p>
                </div>
                <div className="menu-button-icon h-2 w-2 text-primary transition-transform">
                   <svg viewBox="0 0 16 16" fill="currentColor">
                      <path d="M7 16V0h2v16H7zM16 9H0V7h16v2z" />
                   </svg>
                </div>
              </button>
            </div>
          </div>
        </header>

      <section className="fullscreen-menu-container pointer-events-auto">
        <div data-nav="closed" className="nav-overlay-wrapper hidden fixed inset-0">
          <div className="overlay absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeMenu}></div>
          <nav className="menu-content absolute right-0 top-0 bottom-0 w-full md:w-[60%] lg:w-[45%] h-full bg-gray-950 overflow-hidden shadow-2xl">
            <div className="menu-bg absolute inset-0">
              <div className="backdrop-layer first absolute inset-0 bg-primary/15"></div>
              <div className="backdrop-layer second absolute inset-0 bg-orange-500/10"></div>
              <div className="backdrop-layer absolute inset-0 bg-gray-950"></div>
              <div className="ambient-background-shapes absolute inset-0 pointer-events-none opacity-40">
                <svg className="bg-shape bg-shape-1 absolute inset-0 w-full h-full" viewBox="0 0 400 400" fill="none">
                  <circle className="shape-element" cx="80" cy="120" r="40" fill="rgba(255,136,0,0.3)" />
                  <circle className="shape-element" cx="300" cy="80" r="60" fill="rgba(255,170,68,0.2)" />
                </svg>
                <svg className="bg-shape bg-shape-2 absolute inset-0 w-full h-full" viewBox="0 0 400 400" fill="none">
                  <path className="shape-element" d="M0 200 Q100 100, 200 200 T 400 200" stroke="rgba(255,136,0,0.4)" strokeWidth="60" fill="none" />
                </svg>
                <svg className="bg-shape bg-shape-5 absolute inset-0 w-full h-full" viewBox="0 0 400 400" fill="none">
                  <line className="shape-element" x1="0" y1="100" x2="300" y2="400" stroke="rgba(255,136,0,0.4)" strokeWidth="30" />
                </svg>
              </div>
            </div>
            <div className="menu-content-wrapper relative z-10 h-full flex flex-col justify-center p-8 md:p-16 lg:p-20">
              <ul className="menu-list space-y-6 md:space-y-8">
                {[
                  { label: "Accueil", href: "/", shape: "1" },
                  { label: "Problèmes", href: "#problemes", shape: "2" },
                  { label: "Solution", href: "#solution", shape: "3" },
                  { label: "Tarifs", href: "#prix", shape: "4" },
                  { label: "Connexion", href: "/login", shape: "5" }
                ].map((item, idx) => (
                  <li key={idx} className="menu-list-item overflow-hidden" data-shape={item.shape}>
                    <Link href={item.href} onClick={closeMenu} className="nav-link block group py-2">
                      <p className="nav-link-text text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-headline font-bold text-white group-hover:text-primary transition-colors tracking-tighter">
                        {item.label}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-12 md:mt-16 pt-8 md:pt-10 border-t border-white/10" data-menu-fade>
                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-4 md:mb-6">Suivez l'aventure</p>
                <div className="flex gap-6 md:gap-8 text-white font-medium text-sm md:text-base">
                  <a href="#" className="hover:text-primary transition-colors">WhatsApp</a>
                  <a href="#" className="hover:text-primary transition-colors">Instagram</a>
                  <a href="#" className="hover:text-primary transition-colors">LinkedIn</a>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </section>
    </div>
  );
}
