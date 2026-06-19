import React from 'react';
import { Compass, Eye, Shield } from 'lucide-react';
import BrutalistLogo from './BrutalistLogo';

export default function Navigation({ activeTab, onTabChange, onGoHome }) {
  return (
    <nav className="w-full bg-brutalist-bg border-b-3 border-brutalist-ink flex flex-col md:flex-row justify-between items-center px-8 py-5 select-none relative z-10">
      
      {/* Brand Identity Logo */}
      <div 
        onClick={onGoHome}
        className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity"
      >
        <span className="bg-brutalist-ink text-brutalist-bg p-1.5 font-mono text-xs font-bold leading-none select-none tracking-tighter">
          DM
        </span>
        <h1 className="text-xl font-editorial font-black tracking-[0.1em] uppercase leading-none">
          <BrutalistLogo />
        </h1>
      </div>

      {/* Tabs / Subsections */}
      <div className="flex gap-4 md:gap-8 my-4 md:my-0">
        {[
          { id: 'workspace', label: 'RESEARCH CONSOLE', icon: Compass },
          { id: 'observatory', label: 'THE OBSERVATORY', icon: Eye },
          { id: 'laboratory', label: 'AI LABORATORY', icon: Shield }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase border-b-2 py-1 transition-all ${
                isActive 
                  ? 'border-brutalist-ink text-brutalist-ink scale-105' 
                  : 'border-transparent text-brutalist-muted hover:text-brutalist-ink hover:border-brutalist-ink/30'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* System Status Tag */}
      <div>
        <div className="flex items-center gap-2 border-2 border-brutalist-ink bg-brutalist-bg text-brutalist-ink font-mono text-[10px] px-3.5 py-1.5 font-bold">
          <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span>
          <span>DOCMIND ENGINE // ACTIVE</span>
        </div>
      </div>

    </nav>
  );
}
