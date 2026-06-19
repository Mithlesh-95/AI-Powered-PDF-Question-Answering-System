import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import BrutalistLogo from './BrutalistLogo';

export default function LandingPage({ onEnterWorkspace, onFileDropped }) {
  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      if (onFileDropped) onFileDropped(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="h-screen w-full bg-brutalist-bg text-brutalist-ink select-none relative brutalist-grid flex flex-col justify-between p-12 overflow-hidden border-b-3 border-brutalist-ink">
      
      {/* Top Header Row */}
      <div className="flex justify-between items-start font-mono text-[10px] tracking-wider">
        <span>SYSTEM VER: 1.0.0</span>
        <span>AWARDS RECIPIENT // VIRTUAL RESEARCH</span>
      </div>

      {/* Center Branding & Action Workspace */}
      <div className="my-auto flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6">
        
        {/* Brand Header Title - Scaled down for high-end luxury feel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-4"
        >
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-editorial font-black leading-none tracking-[0.12em] uppercase">
            <BrutalistLogo />
          </h1>
          <div className="w-16 h-[2px] bg-brutalist-ink mx-auto my-4"></div>
        </motion.div>

        {/* Subtitle Information */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <p className="text-xs md:text-sm font-mono uppercase tracking-widest text-brutalist-muted max-w-md mx-auto leading-relaxed">
            Editorial cognitive RAG interface // Powered by OpenRouter & Qdrant database index
          </p>
        </motion.div>

        {/* Direct Entry CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col items-center gap-4 pt-6"
        >
          <button
            onClick={onEnterWorkspace}
            className="inline-flex items-center gap-3 bg-brutalist-ink text-brutalist-bg px-8 py-4 text-xs font-mono font-bold hover:bg-brutalist-active hover:text-brutalist-bg transition-all shadow-[4px_4px_0px_rgba(5,8,22,0.15)] hover:shadow-[6px_6px_0px_#050816] active:translate-y-0.5 active:shadow-[2px_2px_0px_#050816] w-full sm:w-auto"
          >
            ENTER WORKSPACE <ArrowRight className="w-3.5 h-3.5" />
          </button>
          
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="hidden sm:block mt-2 border border-dashed border-brutalist-ink/30 px-6 py-2.5 text-[9px] font-mono text-brutalist-muted uppercase hover:border-brutalist-ink transition-colors cursor-pointer"
            onClick={onEnterWorkspace}
          >
            or drop research PDF here to ingest directly
          </div>
        </motion.div>

      </div>

      {/* Bottom Footer Status & Animated Ticker */}
      <div className="w-full flex flex-col gap-6">
        
        {/* Status indicator row */}
        <div className="flex justify-between items-center text-[10px] font-mono tracking-wider">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-brutalist-active rounded-full animate-ping"></span>
            <span>SYSTEM ONBOARDING ACTIVE</span>
          </div>
          <span className="opacity-75">QDRANT CORE</span>
        </div>

        {/* Marquee scroll footer */}
        <div className="w-full border-2 border-brutalist-ink bg-white overflow-hidden py-2.5 relative shadow-[2px_2px_0px_#050816]">
          <div className="flex whitespace-nowrap animate-marquee">
            <span className="font-mono text-[9px] uppercase tracking-widest mx-4">
              [ KNOWLEDGE INDEXED IN VECTOR SPACE ] // [ OPENROUTER COGNITIVE RETRIEVAL PIPELINE ACTIVE ] // [ QDRANT CLUSTER SECURED ] // [ BRUTALIST INTERACTIVE WORKSTATION ] //
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest mx-4">
              [ KNOWLEDGE INDEXED IN VECTOR SPACE ] // [ OPENROUTER COGNITIVE RETRIEVAL PIPELINE ACTIVE ] // [ QDRANT CLUSTER SECURED ] // [ BRUTALIST INTERACTIVE WORKSTATION ] //
            </span>
          </div>
        </div>

      </div>
      
      {/* Scroll Marquee Custom Animation Style */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 35s linear infinite;
        }
      `}</style>

    </div>
  );
}
