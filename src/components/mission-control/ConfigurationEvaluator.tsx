import React, { useState } from 'react';
import { CandidateConfig, PipelineStage } from '../../types/satellite';
import { CheckCircle2, XCircle, ShieldAlert, Cpu, Sparkles, Filter, Check } from 'lucide-react';

interface ConfigurationEvaluatorProps {
  candidates: CandidateConfig[];
  selectedConfigId?: string;
  stage: PipelineStage;
  onSelectManualCandidate?: (config: CandidateConfig) => void;
}

export const ConfigurationEvaluator: React.FC<ConfigurationEvaluatorProps> = ({
  candidates,
  selectedConfigId,
  stage,
  onSelectManualCandidate,
}) => {
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(
    selectedConfigId || (candidates[0]?.id ?? null)
  );

  const selectedCandidate = candidates.find(c => c.id === activeCandidateId) || candidates[0];

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 backdrop-blur text-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold tracking-wider font-display uppercase text-slate-100">
            CONSTRAINT EVALUATION & CONFIGURATION SELECTOR
          </h3>
        </div>
        <div className="text-[10px] font-mono-code text-slate-400">
          PAR-OPT ALGORITHM // {candidates.length} CANDIDATES
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 min-h-0">
        {/* Candidate List (Matrix) */}
        <div className="md:col-span-5 flex flex-col gap-1.5 overflow-y-auto max-h-[260px] pr-1">
          {candidates.map((cand) => {
            const isSelected = cand.id === (selectedConfigId || activeCandidateId);
            const isSafe = cand.status === 'safe';

            return (
              <button
                key={cand.id}
                onClick={() => {
                  setActiveCandidateId(cand.id);
                  if (onSelectManualCandidate) onSelectManualCandidate(cand);
                }}
                className={`w-full text-left p-2 rounded border transition-all text-xs font-mono-code flex items-center justify-between ${
                  isSelected
                    ? isSafe
                      ? 'bg-emerald-950/40 border-emerald-500/70 text-emerald-200 ring-1 ring-emerald-500/40'
                      : 'bg-rose-950/30 border-rose-500/60 text-rose-200'
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:border-slate-700/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[11px]">{cand.id}</span>
                  <span className="truncate max-w-[140px] text-slate-300">{cand.name}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isSafe ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 flex items-center gap-1 font-semibold">
                      <Check className="w-2.5 h-2.5" /> SAFE
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/60 flex items-center gap-1">
                      <XCircle className="w-2.5 h-2.5" /> REJECTED
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500">{cand.feasibilityScore}%</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Candidate Detailed Constraints */}
        {selectedCandidate && (
          <div className="md:col-span-7 bg-slate-950/70 border border-slate-800/70 rounded p-2.5 flex flex-col justify-between text-xs font-mono-code">
            <div>
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800/60">
                <div>
                  <span className="text-cyan-400 font-bold mr-1.5">{selectedCandidate.id}:</span>
                  <span className="text-slate-200 font-semibold">{selectedCandidate.name}</span>
                </div>
                <div className="text-[10px]">
                  FEASIBILITY: <span className="font-bold text-cyan-300">{selectedCandidate.feasibilityScore}/100</span>
                </div>
              </div>

              {/* Rejection / Approval Banner */}
              {selectedCandidate.status === 'safe' ? (
                <div className="p-1.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-[10px] text-emerald-300 mb-2 flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">SAFE CONFIGURATION:</span> All safety limits satisfied. Selected for autonomous recovery.
                  </div>
                </div>
              ) : (
                <div className="p-1.5 rounded bg-rose-950/40 border border-rose-500/40 text-[10px] text-rose-300 mb-2 flex items-start gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">REJECTED (UNSAFE):</span> {selectedCandidate.rejectionReason}
                  </div>
                </div>
              )}

              {/* Constraint Metric Bars */}
              <div className="space-y-1.5 text-[10px]">
                {/* Power Margin */}
                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>POWER MARGIN (min: 25%)</span>
                    <span className={selectedCandidate.powerMargin < 25 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                      {selectedCandidate.powerMargin}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded overflow-hidden">
                    <div
                      className={`h-full ${selectedCandidate.powerMargin < 25 ? 'bg-rose-500' : 'bg-cyan-400'}`}
                      style={{ width: `${selectedCandidate.powerMargin}%` }}
                    />
                  </div>
                </div>

                {/* Thermal Margin */}
                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>THERMAL MARGIN (min: 40%)</span>
                    <span className={selectedCandidate.thermalMargin < 40 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                      {selectedCandidate.thermalMargin}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded overflow-hidden">
                    <div
                      className={`h-full ${selectedCandidate.thermalMargin < 40 ? 'bg-rose-500' : 'bg-amber-400'}`}
                      style={{ width: `${selectedCandidate.thermalMargin}%` }}
                    />
                  </div>
                </div>

                {/* Communication */}
                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>COMMUNICATION BANDWIDTH</span>
                    <span className="text-slate-200">{selectedCandidate.commBandwidth}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded overflow-hidden">
                    <div
                      className="h-full bg-blue-400"
                      style={{ width: `${selectedCandidate.commBandwidth}%` }}
                    />
                  </div>
                </div>

                {/* Attitude Stability */}
                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>ATTITUDE STABILITY</span>
                    <span className="text-slate-200">{selectedCandidate.attitudeStability}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded overflow-hidden">
                    <div
                      className="h-full bg-emerald-400"
                      style={{ width: `${selectedCandidate.attitudeStability}%` }}
                    />
                  </div>
                </div>

                {/* Resource Availability */}
                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>RESOURCE AVAILABILITY</span>
                    <span className="text-slate-200">{selectedCandidate.resourceAvailability}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded overflow-hidden">
                    <div
                      className="h-full bg-indigo-400"
                      style={{ width: `${selectedCandidate.resourceAvailability}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Reconfiguration Actions Checklist */}
            <div className="mt-2 pt-2 border-t border-slate-800/60">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-1">
                TOPOLOGY RECONFIGURATION ACTIONS:
              </span>
              <ul className="text-[9.5px] text-slate-400 space-y-0.5">
                {selectedCandidate.actions.map((act, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-cyan-400" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
