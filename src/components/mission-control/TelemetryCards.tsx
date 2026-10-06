import React from 'react';
import { TelemetryData, FaultType, PipelineStage } from '../../types/satellite';
import { 
  Zap, 
  Activity, 
  Thermometer, 
  Cpu, 
  BatteryCharging, 
  Compass, 
  Radio, 
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface TelemetryCardsProps {
  telemetry: TelemetryData;
  activeFault: FaultType;
  stage: PipelineStage;
}

export const TelemetryCards: React.FC<TelemetryCardsProps> = ({
  telemetry,
  activeFault,
  stage,
}) => {
  // Formatters & status flags
  const isVoltageWarning = telemetry.busVoltage < 24.0;
  const isTempWarning = telemetry.coreTemp > 50.0;
  const isAttitudeWarning = telemetry.attitudeError > 2.0;
  const isCommWarning = telemetry.commMargin < 2.0;
  const isPowerMarginWarning = telemetry.powerMargin < 25.0;

  const cards = [
    {
      id: 'voltage',
      label: 'BUS VOLTAGE',
      value: `${telemetry.busVoltage.toFixed(1)} V`,
      nominalRange: '28.0 - 28.4 V',
      subtext: `Current: ${telemetry.busCurrent.toFixed(1)} A`,
      icon: Zap,
      isWarning: isVoltageWarning,
      highlight: activeFault === 'power',
      progress: Math.min(100, Math.max(0, (telemetry.busVoltage / 32) * 100)),
      statusText: isVoltageWarning ? 'VOLTAGE SAG' : 'NOMINAL 28V BUS',
    },
    {
      id: 'battery',
      label: 'BATTERY SOC',
      value: `${telemetry.batterySoc.toFixed(1)}%`,
      nominalRange: '> 75.0%',
      subtext: `Solar: ${Math.round(telemetry.solarGeneration)} W`,
      icon: BatteryCharging,
      isWarning: telemetry.batterySoc < 50.0,
      highlight: activeFault === 'power',
      progress: telemetry.batterySoc,
      statusText: telemetry.batterySoc > 80 ? 'FLOAT CHARGING' : 'DISCHARGING',
    },
    {
      id: 'temperature',
      label: 'CORE TEMP',
      value: `${telemetry.coreTemp.toFixed(1)}°C`,
      nominalRange: '15.0 - 30.0°C',
      subtext: `Radiator: ${telemetry.radiatorTemp.toFixed(1)}°C`,
      icon: Thermometer,
      isWarning: isTempWarning,
      highlight: activeFault === 'thermal',
      progress: Math.min(100, Math.max(0, (telemetry.coreTemp / 90) * 100)),
      statusText: isTempWarning ? 'OVERTEMP CRITICAL' : 'THERMAL EQUILIBRIUM',
    },
    {
      id: 'cpu',
      label: 'CPU LOAD',
      value: `${Math.round(telemetry.cpuLoad)}%`,
      nominalRange: '20 - 45%',
      subtext: stage === 'EVALUATE' ? 'AI Solver Active' : 'Real-time OS 100Hz',
      icon: Cpu,
      isWarning: telemetry.cpuLoad > 85,
      highlight: false,
      progress: telemetry.cpuLoad,
      statusText: stage === 'EVALUATE' ? 'AI SOLVER COMPUTING' : 'OBC DUAL-CORE',
    },
    {
      id: 'attitude',
      label: 'ATTITUDE ERROR',
      value: `${telemetry.attitudeError.toFixed(2)}°`,
      nominalRange: '< 0.10° Nadir',
      subtext: `Wheel: ${Math.round(telemetry.adcsRpm)} RPM`,
      icon: Compass,
      isWarning: isAttitudeWarning,
      highlight: activeFault === 'attitude',
      progress: Math.min(100, Math.max(0, (1 - telemetry.attitudeError / 15) * 100)),
      statusText: isAttitudeWarning ? 'NADIR LOCK LOST' : 'POINTING STABLE',
    },
    {
      id: 'comm',
      label: 'COMM LINK',
      value: `${telemetry.commMargin > 0 ? '+' : ''}${telemetry.commMargin.toFixed(1)} dB`,
      nominalRange: '> +10.0 dB',
      subtext: telemetry.commMargin > 0 ? 'X-Band Downlink Active' : 'Downlink Attenuated',
      icon: Radio,
      isWarning: isCommWarning,
      highlight: activeFault === 'communication',
      progress: Math.min(100, Math.max(0, ((telemetry.commMargin + 10) / 25) * 100)),
      statusText: isCommWarning ? 'CARRIER LOCK DEGRADED' : 'SOLID 120 MBPS',
    },
    {
      id: 'power_margin',
      label: 'POWER MARGIN',
      value: `${telemetry.powerMargin.toFixed(1)}%`,
      nominalRange: '> 40.0%',
      subtext: 'EPS Reserves Remaining',
      icon: Activity,
      isWarning: isPowerMarginWarning,
      highlight: activeFault === 'power',
      progress: telemetry.powerMargin,
      statusText: isPowerMarginWarning ? 'MARGIN DEFICIT' : 'OPTIMAL POWER MARGIN',
    },
    {
      id: 'state',
      label: 'AUTONOMOUS RECOVERY',
      value: stage === 'RECOVERED' ? 'VERIFIED' : stage === 'IDLE' ? 'STANDBY' : stage,
      nominalRange: 'Agentic Engine v3.4',
      subtext: 'FUSE-X Self-Healing Loop',
      icon: ShieldCheck,
      isWarning: stage === 'FAILED',
      highlight: false,
      progress: stage === 'RECOVERED' ? 100 : stage === 'FAILED' ? 15 : 65,
      statusText: stage === 'FAILED' ? 'UNRECOVERABLE ENVELOPE' : 'CLOSED-LOOP MONITOR',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {cards.map((card) => {
        const Icon = card.icon;
        const isAlert = card.isWarning;

        return (
          <div
            key={card.id}
            className={`p-2.5 rounded border transition-all ${
              isAlert
                ? 'bg-rose-950/40 border-rose-500/50 text-rose-200 shadow-sm shadow-rose-950/50'
                : card.highlight
                ? 'bg-cyan-950/40 border-cyan-400/50 text-cyan-200'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700/80'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono-code tracking-wider text-slate-400">
                {card.label}
              </span>
              <Icon className={`w-3.5 h-3.5 ${isAlert ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`} />
            </div>

            {/* Big Value */}
            <div className="flex items-baseline justify-between">
              <span className={`text-base sm:text-lg font-bold font-mono-code tracking-tight ${isAlert ? 'text-rose-400' : 'text-slate-100'}`}>
                {card.value}
              </span>
            </div>

            {/* Spark Mini-Bar */}
            <div className="w-full bg-slate-950/80 h-1 rounded-full mt-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isAlert ? 'bg-rose-500' : 'bg-cyan-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, card.progress))}%` }}
              />
            </div>

            {/* Subtext and status */}
            <div className="flex items-center justify-between mt-1.5 text-[9px] font-mono-code text-slate-500">
              <span className="truncate">{card.subtext}</span>
              <span className={isAlert ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                {card.statusText}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
