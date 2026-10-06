import React from 'react';
import { FaultType, PipelineStage } from '../../types/satellite';
import { 
  Zap, 
  Radio, 
  Thermometer, 
  Compass, 
  Eye, 
  Dices, 
  AlertTriangle, 
  RotateCcw,
  Flame
} from 'lucide-react';

interface FaultInjectorProps {
  stage: PipelineStage;
  activeFault: FaultType;
  onInjectFault: (fault: FaultType) => void;
  onResetNominal: () => void;
}

export const FaultInjector: React.FC<FaultInjectorProps> = ({
  stage,
  activeFault,
  onInjectFault,
  onResetNominal,
}) => {
  const isBusy = stage !== 'IDLE' && stage !== 'RECOVERED' && stage !== 'FAILED';

  const faultButtons: { type: FaultType; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    {
      type: 'power',
      label: 'POWER SUBSYSTEM FAULT',
      icon: Zap,
      desc: 'Solar string short & power allocation trip',
    },
    {
      type: 'communication',
      label: 'COMMUNICATION FAULT',
      icon: Radio,
      desc: 'Antenna gimbal stall & downlink margin drop',
    },
    {
      type: 'thermal',
      label: 'THERMAL FLUX FAULT',
      icon: Thermometer,
      desc: 'Radiator louver jam & core temperature spike',
    },
    {
      type: 'attitude',
      label: 'ADCS ATTITUDE FAULT',
      icon: Compass,
      desc: 'Reaction wheel disturbance & pointing drift',
    },
    {
      type: 'sensor',
      label: 'SENSOR / OBC FAULT',
      icon: Eye,
      desc: 'Star tracker optical detector disturbance',
    },
    {
      type: 'stress',
      label: 'STRESS CASE (EXP B)',
      icon: AlertTriangle,
      desc: 'Compound power & thermal multi-subsystem stress',
    },
    {
      type: 'random',
      label: 'RANDOM STOCHASTIC FAULT',
      icon: Dices,
      desc: 'Inject random in-flight subsystem anomaly',
    },
  ];

  return (
    <div className="bg-slate-900/70 border border-slate-800/90 rounded-lg p-3 backdrop-blur text-slate-200">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2.5">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-semibold tracking-wider font-display uppercase text-slate-100">
            FAULT INJECTION MATRIX (LIVE SIMULATION)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onResetNominal}
            disabled={isBusy}
            className="px-2.5 py-1 rounded text-[10px] font-mono-code bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition-colors flex items-center gap-1.5 border border-slate-700"
          >
            <RotateCcw className="w-3 h-3 text-cyan-400" />
            RESET NOMINAL
          </button>
        </div>
      </div>

      {/* Button Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {faultButtons.map((btn) => {
          const Icon = btn.icon;
          const isActive = activeFault === btn.type || (btn.type === 'stress' && activeFault === 'unrecoverable_stress');
          const isStress = btn.type === 'stress';

          return (
            <button
              key={btn.type}
              onClick={() => onInjectFault(btn.type)}
              disabled={isBusy}
              className={`p-2.5 rounded border text-left transition-all relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed ${
                isActive
                  ? isStress
                    ? 'bg-amber-950/70 border-amber-400 text-amber-200 ring-1 ring-amber-400/50 shadow-md shadow-amber-950/40'
                    : 'bg-rose-950/60 border-rose-500 text-rose-200 ring-1 ring-rose-500/50 shadow-md shadow-rose-950/40'
                  : isStress
                  ? 'bg-slate-950/60 border-amber-900/60 hover:border-amber-500/80 text-amber-200/90 hover:text-amber-100'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-cyan-500/60 text-slate-300 hover:text-cyan-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold font-mono-code tracking-wide">
                  {btn.label}
                </span>
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400 animate-pulse' : 'text-slate-400 group-hover:text-cyan-400'}`} />
              </div>

              <p className="text-[9.5px] font-mono-code text-slate-400 line-clamp-1">
                {btn.desc}
              </p>

              {isActive && (
                <div className="mt-1 flex items-center gap-1 text-[9px] font-mono-code text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>FAULT ACTIVE</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
