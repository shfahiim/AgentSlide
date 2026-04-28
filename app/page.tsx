"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Menu, 
  X, 
  ArrowUpRight,
  SquareStack,
  BarChart,
  Network,
  Terminal,
  LayoutTemplate,
  FileJson,
  Play
} from 'lucide-react';
import { Logo } from '@/components/logo';

// Custom Hook for Mouse Position
const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const updateMousePosition = (ev: MouseEvent) => {
      setMousePosition({ x: ev.clientX, y: ev.clientY });
    };
    window.addEventListener('mousemove', updateMousePosition);
    return () => window.removeEventListener('mousemove', updateMousePosition);
  }, []);
  return mousePosition;
};

const CustomCursor = () => {
  const { x, y } = useMousePosition();
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('a')) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };
    window.addEventListener('mouseover', handleMouseOver);
    return () => window.removeEventListener('mouseover', handleMouseOver);
  }, []);

  return (
    <div 
      className={`fixed top-0 left-0 w-8 h-8 rounded-full border border-black pointer-events-none z-[9999] transition-transform duration-200 ease-out hidden md:block ${isHovered ? 'scale-[2.5] bg-black/5' : 'scale-100'}`}
      style={{ transform: `translate3d(${x - 16}px, ${y - 16}px, 0) scale(${isHovered ? 2.5 : 1})` }}
    />
  );
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <nav className="fixed w-full z-50 flex justify-between items-center px-6 py-8 md:px-12 text-black bg-[#F9F9F9]/80 backdrop-blur-sm">
      <Link href="/" className="hover:opacity-80 transition-opacity">
        <Logo className="h-16" />
      </Link>
      
      <div className="hidden md:flex items-center space-x-12 font-medium uppercase text-xs tracking-[0.2em]">
        <Link href="/studio" className="hover:line-through">Studio</Link>
        <span className="opacity-50 hover:line-through cursor-not-allowed">Docs</span>
        <span className="opacity-50">Light Mode</span>
        <Link href="/studio" className="bg-black text-white px-6 py-3 rounded-full font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-black/10">
          Quick Create <Play size={14} className="fill-white" />
        </Link>
      </div>

      <button onClick={() => setIsOpen(!isOpen)} className="md:hidden">
        {isOpen ? <X size={32} /> : <Menu size={32} />}
      </button>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 bg-white text-black transition-transform duration-700 ease-in-out ${isOpen ? 'translate-y-0' : '-translate-y-full'} flex flex-col justify-center items-center space-y-8 z-[-1]`}>
        <Link href="/studio" onClick={() => setIsOpen(false)} className="text-5xl font-black uppercase tracking-tighter">Open Studio</Link>
        <span onClick={() => setIsOpen(false)} className="text-5xl font-black uppercase tracking-tighter opacity-50">Documentation</span>
      </div>
    </nav>
  );
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F9F9F9] text-[#1A1A1A] selection:bg-black selection:text-white font-sans overflow-x-hidden">
      <CustomCursor />
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-end px-6 md:px-12 pb-24 border-b border-black/10 pt-40">
        <div className="max-w-[1400px]">
          <h1 className="text-[13vw] md:text-[10vw] font-black leading-[0.85] tracking-tighter uppercase">
            Engineered<br />
            <span className="text-transparent stroke-black stroke-1" style={{ WebkitTextStroke: '2px #1A1A1A' }}>Not Generated</span><br />
            Slides
          </h1>
          <div className="mt-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
            <p className="max-w-xl text-xl md:text-2xl font-medium leading-tight">
              AI-powered slide and web generation. AgentSlide turns a prompt into a validated deck spec, then renders consistent PPTX and web slides.
            </p>
            <div className="flex flex-col items-start gap-4">
              <span className="text-xs uppercase tracking-widest font-bold opacity-40">Scroll to Explore IR</span>
              <div className="w-px h-24 bg-black/20 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-black animate-bounce origin-top scale-y-50"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Services */}
      <section className="py-32 px-6 md:px-12">
        <div className="flex flex-col md:flex-row justify-between items-baseline mb-20 gap-4">
          <h2 className="text-7xl md:text-8xl font-black uppercase tracking-tighter">Core<br/>Architecture</h2>
          <p className="text-sm uppercase tracking-[0.3em] font-bold opacity-30">DeckSpec JSON / 01</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[300px] md:auto-rows-[400px]">
          {/* Bento Item 1: DUAL OUTPUT */}
          <div className="md:col-span-2 md:row-span-1 bg-white border border-black/10 p-10 flex flex-col justify-between group hover:bg-black hover:text-white transition-colors duration-500">
            <div className="flex gap-4">
              <LayoutTemplate size={48} className="opacity-40" />
              <Terminal size={48} className="opacity-40" />
            </div>
            <div>
              <h3 className="text-4xl font-black uppercase mb-2">PPTX + Web Output</h3>
              <p className="font-medium opacity-60">The same IR renders to interactive web presentations and native PowerPoint files seamlessly.</p>
            </div>
          </div>

          {/* Bento Item 2: VEGA CHARTS */}
          <div className="md:col-span-1 md:row-span-2 bg-[#EFEFEF] p-10 flex flex-col justify-between relative overflow-hidden group">
            <div className="z-10">
              <span className="text-xs font-bold uppercase tracking-widest block mb-4">Data Viz</span>
              <h3 className="text-4xl font-black uppercase leading-none">Theme<br/>Aware<br/>Vega</h3>
            </div>
            <div className="absolute -right-10 -bottom-10 text-[15rem] font-black opacity-5 leading-none select-none group-hover:scale-110 transition-transform duration-700 italic">V</div>
            <BarChart className="z-10" size={40} />
          </div>

          {/* Bento Item 3: ZOD VALIDATED */}
          <div className="md:col-span-1 md:row-span-1 border border-black p-10 flex flex-col items-center justify-center text-center bg-black text-white">
            <FileJson size={48} className="mb-6 text-white" />
            <h3 className="text-2xl font-black uppercase">Zod<br/>Validated</h3>
            <p className="text-xs mt-2 opacity-60 font-medium uppercase tracking-widest">Strict Schema Limits</p>
          </div>

          {/* Bento Item 4: DETERMINISTIC LAYOUTS */}
          <div className="md:col-span-2 md:row-span-1 bg-white border border-black/10 p-10 flex flex-col justify-between group hover:shadow-2xl transition-all duration-500">
            <div className="flex justify-between items-start">
              <span className="bg-black text-white text-[10px] font-black px-3 py-1 uppercase rounded-full">Quality Assurance</span>
              <ArrowUpRight size={32} className="opacity-40 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <h3 className="text-4xl font-black uppercase mb-2">Deterministic Layouts</h3>
              <p className="font-medium opacity-60 max-w-md">Hard limits + QA compression prevent crowded slides. Your layouts stay readable across every render.</p>
            </div>
          </div>

          {/* Bento Item 5: KNOWLEDGE GRAPHS */}
          <div className="md:col-span-1 md:row-span-1 bg-black text-white p-10 flex flex-col justify-between">
            <Network size={40} />
            <div>
              <h3 className="text-2xl font-black uppercase mb-2">Knowledge Graphs</h3>
              <p className="text-sm leading-relaxed opacity-70 font-medium">
                Explore topics as connected concepts — great for study maps and research.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Text Section */}
      <section className="bg-black text-white py-40 px-6 md:px-12 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-4">
            <span className="inline-block text-xs font-bold tracking-[0.5em] uppercase text-white/40 mb-8 border-b border-white/20 pb-2">The Pipeline</span>
            <p className="text-[7vw] md:text-7xl font-black leading-[1.1] tracking-tighter uppercase">
              AGENTSLIDE TURNS A PROMPT INTO A <span className="text-white/30 italic">VALIDATED DECK SPEC</span>, THEN RENDERS <span className="underline decoration-4">CONSISTENT PPTX</span> WITH CHARTS THAT MATCH YOUR THEME.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 px-6 md:px-12 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-32">
          <div>
            <h2 className="text-[12vw] md:text-9xl font-black tracking-tighter leading-[0.8] mb-12">BUILD.</h2>
            <Link href="/studio" className="group flex w-fit items-center gap-6 text-2xl font-black uppercase hover:translate-x-4 transition-transform duration-300">
              Launch Studio <ArrowRight className="group-hover:rotate-[-45deg] transition-transform" />
            </Link>
          </div>
          <div className="flex flex-col justify-between">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-6">Pipeline</h4>
                <ul className="space-y-4 font-black uppercase text-lg">
                  <li className="hover:line-through cursor-pointer">Prompt Engine</li>
                  <li className="hover:line-through cursor-pointer">Zod Validation</li>
                  <li className="hover:line-through cursor-pointer">Local Render</li>
                </ul>
              </div>
            </div>
            <div className="mt-16 pt-16 border-t border-black/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-bold uppercase tracking-widest opacity-40">
              <p>&copy; 2026 AgentSlide</p>
              <p>Engineered, not generated.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
