import React, { useState, useEffect } from 'react';
import { 
  Satellite, 
  Activity, 
  Rocket, 
  Award, 
  FileText, 
  Cpu, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  Radio,
  Clock
} from 'lucide-react';

export type NavTab = 'mission-control' | 'simulator' | 'challenge' | 'research' | 'architecture';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onLaunchJudgeDemo?: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onLaunchJudgeDemo,
  soundEnabled,
  onToggleSound,
}) => {
  const [utcTime, setUtcTime] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toTimeString().split(' ')[0] + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'mission-control', label: 'Mission Control', icon: Activity },
    { id: 'simulator', label: 'Simulator', icon: Rocket },
    { id: 'challenge', label: 'Challenge', icon: Award },
    { id: 'research', label: 'Research', icon: FileText },
    { id: 'architecture', label: 'Architecture', icon: Cpu },
  ];

  return (
    <header className="w-full bg-[#030712]/95 border-b border-cyan-500/20 backdrop-blur-md sticky top-0 z-40 select-none">
      <div className="max-w-[1720px] mx-auto px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Logo & Mission Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 shadow-sm shadow-cyan-950">
              <Satellite className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-base tracking-wider text-slate-100">
                  FUSE-X
                </span>
                <span className="text-[10px] font-mono-code text-cyan-400">
                  // RECOVERY ENGINE
                </span>
              </div>
              <div className="text-[10px] font-mono-code text-slate-400 hidden sm:block">
                Autonomous Self-Healing Satellite Digital Twin
              </div>
            </div>
          </div>

          {/* Live Orbit Status Indicator */}
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-800 text-[11px] font-mono-code text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-300">LEO 540KM SSO</span>
            <span className="text-slate-600">·</span>
            <span className="text-cyan-400/90">{utcTime}</span>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800/80">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono-code transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Header Utilities */}
        <div className="flex items-center gap-2">
          {onLaunchJudgeDemo && (
            <button
              onClick={onLaunchJudgeDemo}
              className="px-2.5 py-1.5 rounded text-xs font-display font-semibold tracking-wider bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white flex items-center gap-1.5 shadow border border-cyan-400/40 transition-all"
            >
              <Award className="w-3.5 h-3.5 text-cyan-200" />
              <span>JUDGE DEMO</span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute aerospace sounds' : 'Enable aerospace sounds'}
            className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-cyan-400 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-cyan-400 transition-colors hidden sm:block"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
