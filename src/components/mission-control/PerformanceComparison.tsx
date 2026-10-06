import React from 'react';
import { PipelineStage, FaultType } from '../../types/satellite';
import { CheckCircle2, AlertTriangle, RotateCw, Activity, ArrowRight, ShieldCheck } from 'lucide-react';

interface PerformanceComparisonProps {
  stage: PipelineStage;
  activeFault: FaultType;
  beforePerformance: number;
  afterFaultPerformance: number | null;
  afterReconfigPerformance: number | null;
  currentPerformance: number;
}

export const PerformanceComparison: React.FC<PerformanceComparisonProps> = ({
  stage,
  activeFault,
  beforePerformance,
  afterFaultPerformance,
  afterReconfigPerformance,
  currentPerformance,
}) => {
  const isRecovered = stage === 'RECOVERED';
  const isReconfiguring = stage === 'RECONFIGURE' || stage === 'VERIFY';
  const isFaultActive = stage !== 'IDLE' && stage !== 'RECOVERED';

  let statusBadge = (
    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
      <CheckCircle2 className="w-3.5 h-3.5" /> NOMINAL — MONITORING
    </span>
  );

  if (isRecovered) {
    statusBadge = (
      <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/50">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> ✓ RECOVERY VERIFIED
      </span>
    );
  } else if (stage === 'FAILED') {
    statusBadge = (
      <span className="flex items-center gap-1.5 text-rose-400 font-bold bg-rose-950/70 px-2 py-0.5 rounded border border-rose-500/50">
        <AlertTriangle className="w-3.5 h-3.5" /> RECOVERY FAILED
      </span>
    );
  } else if (isReconfiguring) {
    statusBadge = (
      <span className="flex items-center gap-1.5 text-cyan-300 font-bold bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-500/50 animate-pulse">
        <RotateCw className="w-3.5 h-3.5 animate-spin text-cyan-400" /> RECONFIGURING SYSTEM
      </span>
    );
  } else if (isFaultActive) {
    statusBadge = (
      <span className="flex items-center gap-1.5 text-amber-300 font-bold bg-amber-950/70 px-2 py-0.5 rounded border border-amber-500/50">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-bounce" /> FAULT DETECTED
      </span>
    );
  }

  return (
    <div className="bg-slate-900/70 border border-slate-800/90 rounded-lg p-3 backdrop-blur text-slate-200">
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold tracking-wider font-display uppercase text-slate-100">
            BEFORE & AFTER RECOVERY COMPARISON
          </h3>
        </div>
        <div className="text-[10px] font-mono-code">{statusBadge}</div>
      </div>

      {/* 3 Simple Stage Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono-code">
        {/* 1. BEFORE FAULT */}
        <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span className="font-semibold text-slate-300">BEFORE FAULT</span>
            <span className="text-emerald-400">NOMINAL</span>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-[10px] text-slate-500">Mission performance:</span>
            <span className="text-xl font-bold text-emerald-400">
              {beforePerformance}%
            </span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded overflow-hidden">
            <div
              className="bg-emerald-400 h-full transition-all duration-500"
              style={{ width: `${beforePerformance}%` }}
            />
          </div>
        </div>

        {/* 2. AFTER FAULT */}
        <div
          className={`p-2.5 rounded border transition-all flex flex-col justify-between ${
            isFaultActive
              ? 'bg-rose-950/40 border-rose-500/70 shadow-sm shadow-rose-950/40'
              : afterFaultPerformance !== null
              ? 'bg-slate-950/70 border-slate-800/80'
              : 'bg-slate-950/40 border-slate-900 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="font-semibold text-slate-300">AFTER FAULT</span>
            <span className={afterFaultPerformance !== null ? 'text-rose-400 font-bold' : 'text-slate-500'}>
              {afterFaultPerformance !== null ? 'DEGRADED' : 'PENDING'}
            </span>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-[10px] text-slate-500">Mission performance:</span>
            <span
              className={`text-xl font-bold ${
                afterFaultPerformance !== null ? 'text-rose-400' : 'text-slate-600'
              }`}
            >
              {afterFaultPerformance !== null ? `${afterFaultPerformance}%` : '—'}
            </span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded overflow-hidden">
            <div
              className="bg-rose-500 h-full transition-all duration-500"
              style={{ width: `${afterFaultPerformance ?? 0}%` }}
            />
          </div>
        </div>

        {/* 3. AFTER RECONFIGURATION */}
        <div
          className={`p-2.5 rounded border transition-all flex flex-col justify-between ${
            isRecovered
              ? 'bg-emerald-950/40 border-emerald-500/70 shadow-sm shadow-emerald-950/40 ring-1 ring-emerald-500/30'
              : isReconfiguring
              ? 'bg-cyan-950/40 border-cyan-500/60 animate-pulse'
              : 'bg-slate-950/40 border-slate-900 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="font-semibold text-slate-300">AFTER RECONFIGURATION</span>
            <span className={isRecovered ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {isRecovered ? 'RESTORED' : isReconfiguring ? 'ADAPTING...' : 'PENDING'}
            </span>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-[10px] text-slate-500">Mission performance:</span>
            <span
              className={`text-xl font-bold ${
                afterReconfigPerformance !== null
                  ? 'text-emerald-300'
                  : 'text-slate-600'
              }`}
            >
              {afterReconfigPerformance !== null ? `${afterReconfigPerformance}%` : '—'}
            </span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded overflow-hidden">
            <div
              className="bg-cyan-400 h-full transition-all duration-500"
              style={{ width: `${afterReconfigPerformance ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Autonomous Principle Disclaimer (Never claim physical repair) */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono-code text-slate-400">
        <span className="flex items-center gap-1.5 text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>FUSE-X applies <strong>software-defined reconfiguration</strong> for continued operation without physical repair.</span>
        </span>
        <span className="text-cyan-300 font-bold shrink-0 hidden md:inline">
          LIVE TELEMETRY: {currentPerformance.toFixed(0)}%
        </span>
      </div>
    </div>
  );
};
