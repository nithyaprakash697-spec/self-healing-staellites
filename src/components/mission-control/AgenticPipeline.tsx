import React from 'react';
import { PipelineStage, LogMessage, FaultType } from '../../types/satellite';
import { ScenarioDefinition } from '../../utils/faultScenarios';
import { 
  CheckCircle2, 
  RotateCw, 
  AlertCircle, 
  Search, 
  Cpu, 
  Wrench, 
  ShieldCheck, 
  Terminal,
  Activity,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface AgenticPipelineProps {
  stage: PipelineStage;
  activeFault: FaultType;
  scenario?: ScenarioDefinition | null;
  logs: LogMessage[];
  anomalyScore: number;
  evaluatedCandidatesCount: number;
  selectedConfigId?: string;
  onStepClick?: (stage: PipelineStage) => void;
}

export const AgenticPipeline: React.FC<AgenticPipelineProps> = ({
  stage,
  activeFault,
  scenario,
  logs,
  anomalyScore,
  evaluatedCandidatesCount,
  selectedConfigId,
}) => {
  // Core 4-step FUSE-X self-healing loop: Detect -> Isolate -> Reconfigure -> Verify
  const steps: { key: PipelineStage; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
    { key: 'OBSERVE', label: 'OBSERVE', icon: Activity, description: 'Continuous 100 Hz state monitoring' },
    { key: 'DETECT', label: 'DETECT', icon: Search, description: 'Autonomous anomaly detection' },
    { key: 'ISOLATE', label: 'ISOLATE', icon: AlertCircle, description: 'Subsystem graph fault isolation' },
    { key: 'RECONFIGURE', label: 'RECONFIGURE', icon: Wrench, description: 'Software-defined reconfiguration' },
    { key: 'VERIFY', label: 'VERIFY', icon: ShieldCheck, description: 'Mission performance verification' },
  ];

  const getStepStatus = (stepKey: PipelineStage): 'completed' | 'active' | 'pending' | 'failed' => {
    if (stage === 'FAILED') {
      if (stepKey === 'VERIFY' || stepKey === 'RECONFIGURE') return 'failed';
    }

    const order: PipelineStage[] = ['OBSERVE', 'DETECT', 'ISOLATE', 'EVALUATE', 'SELECT', 'RECONFIGURE', 'VERIFY', 'RECOVERED'];
    const currentIdx = order.indexOf(stage === 'RECOVERED' ? 'RECOVERED' : stage);
    
    // Map EVALUATE and SELECT to RECONFIGURE
    let mappedStep = stepKey;
    let stepIdx = order.indexOf(mappedStep);

    if (stage === 'RECOVERED') return 'completed';
    if (stepIdx < currentIdx) return 'completed';
    if (
      stepIdx === currentIdx ||
      (stepKey === 'RECONFIGURE' && (stage === 'EVALUATE' || stage === 'SELECT'))
    ) {
      return 'active';
    }
    return 'pending';
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/70 border border-slate-800/90 rounded-lg p-3 backdrop-blur text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2.5">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold tracking-wider font-display uppercase text-slate-100">
            FUSE-X AUTONOMOUS RECOVERY ENGINE
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono-code">
          <span className="text-slate-400">ANOMALY LEVEL:</span>
          <span className={`font-bold ${anomalyScore > 0.5 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {(anomalyScore * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Autonomous Loop Stage Flow: Detect -> Isolate -> Reconfigure -> Verify */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 mb-2.5 font-mono-code">
        {steps.map((st, idx) => {
          const status = getStepStatus(st.key);
          const Icon = st.icon;

          return (
            <div
              key={st.key}
              className={`p-2 rounded border transition-all flex flex-col justify-between ${
                status === 'completed'
                  ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                  : status === 'active'
                  ? 'bg-cyan-950/50 border-cyan-400 text-cyan-100 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-400/40'
                  : status === 'failed'
                  ? 'bg-rose-950/30 border-rose-500/50 text-rose-300'
                  : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-bold tracking-widest text-slate-400">
                  0{idx + 1}
                </span>
                {status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                {status === 'active' && <RotateCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
                {status === 'failed' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                {status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />}
              </div>

              <div className="flex items-center gap-1.5 my-0.5">
                <Icon className={`w-3 h-3 ${status === 'active' ? 'text-cyan-300' : status === 'completed' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className="text-[10px] font-bold tracking-wider">
                  {st.label}
                </span>
              </div>

              <p className="text-[8.5px] text-slate-400 line-clamp-1">
                {st.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Prominent Live Presentation Callout Card (Simple, Judge-Friendly) */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded p-2.5 mb-2.5 font-mono-code">
        {stage === 'IDLE' && (
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-emerald-400">SYSTEM NOMINAL:</span> All subsystems operational. Continuous telemetry monitoring active.
            </div>
          </div>
        )}

        {(stage === 'OBSERVE' || stage === 'DETECT') && scenario && (
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span>FAULT DETECTED</span>
            </div>
            <p className="text-slate-200 text-xs pl-4">
              {scenario.simpleFaultDetected}
            </p>
          </div>
        )}

        {stage === 'ISOLATE' && scenario && (
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>FAULT ISOLATED</span>
            </div>
            <p className="text-slate-200 text-xs pl-4">
              {scenario.simpleFaultIsolated}
            </p>
          </div>
        )}

        {(stage === 'EVALUATE' || stage === 'SELECT' || stage === 'RECONFIGURE') && scenario && (
          <div className="text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-cyan-300 text-sm">
              <RotateCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
              <span>RECONFIGURATION IN PROGRESS</span>
            </div>
            <p className="text-slate-300 text-[11px] font-semibold pl-4">
              {scenario.simpleReconfigHeader}
            </p>
            <ul className="text-[10px] text-slate-200 pl-6 space-y-1">
              {scenario.simpleReconfigActions.map((action, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(stage === 'VERIFY' || stage === 'RECOVERED') && scenario && (
          <div className="text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>RECOVERY VERIFIED</span>
            </div>
            <ul className="text-[10.5px] text-emerald-200 pl-4 space-y-0.5">
              {scenario.simpleRecoveryVerified.map((line, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stage === 'FAILED' && (
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>BOUNDARY LIMIT REACHED</span>
            </div>
            <p className="text-slate-300 text-xs pl-4">
              Failure boundary outside safe operating envelope. System engaged emergency beacon mode.
            </p>
          </div>
        )}
      </div>

      {/* Autonomous Decision Stream (Plain English Log) */}
      <div className="flex-1 flex flex-col min-h-[120px] max-h-[180px] bg-slate-950/80 border border-slate-800/80 rounded p-2.5 font-mono-code text-[11px] overflow-hidden">
        <div className="flex items-center justify-between text-[10px] text-slate-500 pb-1 mb-1 border-b border-slate-800/60">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-cyan-400" />
            <span className="text-slate-300 font-semibold">DECISION STREAM</span>
          </div>
          <span className="text-cyan-400/80">PLAIN-LANGUAGE LOG</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {logs.slice(-6).map((log) => {
            let color = 'text-slate-300';
            let prefix = 'INFO';
            if (log.level === 'warn') { color = 'text-amber-300'; prefix = 'DETECT'; }
            if (log.level === 'error') { color = 'text-rose-400'; prefix = 'FAULT'; }
            if (log.level === 'success') { color = 'text-emerald-300'; prefix = 'VERIFIED'; }
            if (log.level === 'ai') { color = 'text-cyan-300'; prefix = 'ACTION'; }

            return (
              <div key={log.id} className="leading-tight flex items-start gap-1.5 text-[10.5px]">
                <span className="text-slate-500 text-[10px] shrink-0 font-mono-code">{log.timestamp}</span>
                <span className={`text-[9px] px-1 py-0.2 rounded font-bold shrink-0 ${
                  log.level === 'ai' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/50' :
                  log.level === 'warn' ? 'bg-amber-950 text-amber-300 border border-amber-800/50' :
                  log.level === 'error' ? 'bg-rose-950 text-rose-300 border border-rose-800/50' :
                  log.level === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50' :
                  'bg-slate-800/50 text-slate-400'
                }`}>
                  [{prefix}]
                </span>
                <span className={`${color} break-words`}>{log.message}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
