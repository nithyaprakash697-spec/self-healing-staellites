/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar, NavTab } from './components/common/Navbar';
import { MissionControlView } from './components/mission-control/MissionControlView';
import { MissionSimulatorView } from './components/simulator/MissionSimulatorView';
import { ChallengeModeView } from './components/challenge/ChallengeModeView';
import { ResearchResultsView } from './components/research/ResearchResultsView';
import { ArchitectureView } from './components/architecture/ArchitectureView';
import { soundFX } from './utils/audio';
import { ShieldCheck, Database, Award, ExternalLink } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('mission-control');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const handleToggleSound = () => {
    soundFX.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  const handleLaunchJudgeDemo = () => {
    setCurrentTab('mission-control');
    // MissionControlView has an internal trigger, or user switches to Mission Control and triggers JUDGE DEMO
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans hud-grid-bg">
      {/* Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onLaunchJudgeDemo={handleLaunchJudgeDemo}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-4">
        {currentTab === 'mission-control' && <MissionControlView />}
        {currentTab === 'simulator' && <MissionSimulatorView />}
        {currentTab === 'challenge' && <ChallengeModeView />}
        {currentTab === 'research' && <ResearchResultsView />}
        {currentTab === 'architecture' && <ArchitectureView />}
      </main>

      {/* Mission Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/90 py-4 px-4 text-xs font-mono-code text-slate-500">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-slate-300">FUSE-X</span>
            <span>·</span>
            <span>Self-Healing Satellite Using Agentic AI</span>
            <span>·</span>
            <span className="text-cyan-400">Autonomous Spacecraft Recovery Research</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-slate-400">
              LEO 540km SSO Digital Twin · Rad-Hard Edge Inference
            </span>
            <span>·</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Closed-Loop Verified
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
