import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Award, 
  CheckCircle2, 
  AlertTriangle,
  Sparkles,
  X
} from 'lucide-react';

interface JudgeDemoControllerProps {
  isActive: boolean;
  stepIndex: number;
  totalSteps: number;
  stepDescription: string;
  isPaused: boolean;
  onStart: () => void;
  onPauseToggle: () => void;
  onSkip: () => void;
  onRestart: () => void;
  onClose: () => void;
}

export const JudgeDemoController: React.FC<JudgeDemoControllerProps> = ({
  isActive,
  stepIndex,
  totalSteps,
  stepDescription,
  isPaused,
  onStart,
  onPauseToggle,
  onSkip,
  onRestart,
  onClose,
}) => {
  if (!isActive) return null;

  const progressPercent = Math.round((stepIndex / totalSteps) * 100);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-3xl bg-slate-950/95 border-2 border-cyan-400/80 rounded-xl p-3 shadow-2xl backdrop-blur-xl text-slate-100">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-900/60">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-cyan-500/20 text-cyan-400">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-display uppercase tracking-widest text-cyan-300">
                JUDGE EVALUATION DEMO MODE
              </span>
              <span className="text-[10px] font-mono-code px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-700/50">
                45s AUTONOMOUS FLIGHT RUN
              </span>
            </div>
            <p className="text-[10px] font-mono-code text-slate-400">
              Choreographed research showcase for academic review & competition judging
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded transition-colors"
          title="Exit Judge Demo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress & Current Step Banner */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono-code mb-1">
          <span className="text-cyan-300 font-semibold">
            PHASE {stepIndex} OF {totalSteps}: {stepDescription}
          </span>
          <span className="text-slate-400 font-mono-code">{progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <button
            onClick={onPauseToggle}
            className="px-3 py-1.5 rounded text-xs font-mono-code font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 shadow transition-colors"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            <span>{isPaused ? 'RESUME' : 'PAUSE'}</span>
          </button>

          <button
            onClick={onSkip}
            className="px-3 py-1.5 rounded text-xs font-mono-code bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>SKIP STEP</span>
          </button>

          <button
            onClick={onRestart}
            className="px-3 py-1.5 rounded text-xs font-mono-code bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESTART</span>
          </button>
        </div>

        <div className="text-[10px] font-mono-code text-slate-400 hidden sm:block">
          STATUS: <span className="text-emerald-400 font-bold">{isPaused ? 'PAUSED' : 'EXECUTING LIVE SEQUENCE'}</span>
        </div>
      </div>
    </div>
  );
};
