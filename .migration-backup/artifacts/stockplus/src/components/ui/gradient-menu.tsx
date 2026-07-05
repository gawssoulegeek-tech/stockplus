
'use client';

import React from 'react';
import { Home, Video, Camera, Share2, Heart } from 'lucide-react';
import { cn } from "@/lib/utils";

const menuItems = [
  { title: 'Accueil', icon: Home, gradientFrom: '#FF8800', gradientTo: '#FFAA44' },
  { title: 'Vidéos', icon: Video, gradientFrom: '#56CCF2', gradientTo: '#2F80ED' },
  { title: 'Photos', icon: Camera, gradientFrom: '#FF9966', gradientTo: '#FF5E62' },
  { title: 'Partager', icon: Share2, gradientFrom: '#80FF72', gradientTo: '#7EE8FA' },
  { title: 'Aimer', icon: Heart, gradientFrom: '#ffa9c6', gradientTo: '#f434e2' }
];

export default function GradientMenu() {
  return (
    <div className="flex justify-center items-center py-12 px-4">
      <ul className="flex flex-wrap justify-center gap-4 md:gap-6">
        {menuItems.map(({ title, icon: Icon, gradientFrom, gradientTo }, idx) => (
          <li
            key={idx}
            style={{ 
              ['--gradient-from' as any]: gradientFrom, 
              ['--gradient-to' as any]: gradientTo 
            }}
            className="relative w-[50px] h-[50px] md:w-[60px] md:h-[60px] bg-white shadow-xl rounded-full flex items-center justify-center transition-all duration-500 hover:w-[150px] md:hover:w-[180px] hover:shadow-none group cursor-pointer border border-gray-100"
          >
            <span className="absolute inset-0 rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] opacity-0 transition-all duration-500 group-hover:opacity-100"></span>
            <span className="absolute top-[10px] inset-x-0 h-full rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] blur-[15px] opacity-0 -z-10 transition-all duration-500 group-hover:opacity-50"></span>
            <span className="relative z-10 transition-all duration-500 group-hover:scale-0 delay-0">
              <Icon className="w-5 h-5 md:w-6 md:h-6 text-gray-500" />
            </span>
            <span className="absolute text-white uppercase tracking-[0.2em] font-black text-[9px] md:text-[10px] transition-all duration-500 scale-0 group-hover:scale-100 delay-150">
              {title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
