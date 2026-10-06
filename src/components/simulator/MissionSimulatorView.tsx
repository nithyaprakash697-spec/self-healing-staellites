import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  Dices, 
  FastForward, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Globe2, 
  Rocket, 
  ShieldCheck,
  Activity
} from 'lucide-react';
import { soundFX } from '../../utils/audio';
import { SatelliteScene } from '../3d/SatelliteScene';
import { PipelineStage, SubsystemHealth, FaultType } from '../../types/satellite';

interface MissionPhase {
  id: string;
  name: string;
  progressRange: [number, number];
  status: 'pending' | 'in_progress' | 'completed' | 'alert';
  description: string;
}

export const MissionSimulatorView: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(34); // starts at observation phase
  const [speed, setSpeed] = useState<number>(1);
  const [activeAnomaly, setActiveAnomaly] = useState<string | null>(null);
  const [recoveryTimer, setRecoveryTimer] = useState<number>(0);
  const [activeFault, setActiveFault] = useState<FaultType>('none');
  const [stage, setStage] = useState<PipelineStage>('IDLE');
  const [subsystemHealth, setSubsystemHealth] = useState<SubsystemHealth>({
    power: 'nominal',
    communication: 'nominal',
    thermal: 'nominal',
    attitude: 'nominal',
    sensors: 'nominal',
    obc: 'nominal',
  });
  const [logs, setLogs] = useState<string[]>([
    '[MET 00:00:00] Launch vehicle liftoff: Nominal trajectory confirmed.',
    '[MET 00:09:42] 2nd Stage SECO: Orbit insertion at 540km SSO successful.',
    '[MET 00:14:20] Solar arrays unlatched and deployed. EPS bus voltage 28.2V.',
    '[MET 00:25:00] Attitude determination acquired: Nadir pointing locked < 0.05°.',
    '[MET 01:12:00] Hyperspectral imaging payload commissioned. Cruise phase underway.',
  ]);

  const phases: MissionPhase[] = [
    { id: 'p1', name: 'Launch & Ascent', progressRange: [0, 8], status: progress > 8 ? 'completed' : progress > 0 ? 'in_progress' : 'pending', description: 'Orbital ascent profile and stage separation' },
    { id: 'p2', name: 'Orbit Insertion', progressRange: [8, 16], status: progress > 16 ? 'completed' : progress > 8 ? 'in_progress' : 'pending', description: '540 km Sun-Synchronous circularization' },
    { id: 'p3', name: 'Solar Wing Deployment', progressRange: [16, 25], status: progress > 25 ? 'completed' : progress > 16 ? 'in_progress' : 'pending', description: 'Dual solar array unfurling & power check' },
    { id: 'p4', name: 'Earth Observation', progressRange: [25, 48], status: progress > 48 ? 'completed' : progress > 25 ? (activeAnomaly ? 'alert' : 'in_progress') : 'pending', description: 'Nadir multispectral Earth surface mapping' },
    { id: 'p5', name: 'Ground Downlink Pass', progressRange: [48, 62], status: progress > 62 ? 'completed' : progress > 48 ? (activeAnomaly ? 'alert' : 'in_progress') : 'pending', description: 'High-rate X-Band telemetry data transmission' },
    { id: 'p6', name: 'Eclipse Thermal Transit', progressRange: [62, 75], status: progress > 75 ? 'completed' : progress > 62 ? 'in_progress' : 'pending', description: 'Deep Earth-shadow battery discharge and thermal management' },
    { id: 'p7', name: 'Autonomous Fault Recovery', progressRange: [75, 88], status: progress > 88 ? 'completed' : progress > 75 ? (activeAnomaly ? 'alert' : 'in_progress') : 'pending', description: 'Agentic self-healing pipeline mitigation' },
    { id: 'p8', name: 'Mission Extension & Continuation', progressRange: [88, 100], status: progress >= 100 ? 'completed' : progress > 88 ? 'in_progress' : 'pending', description: 'Extended operations & secondary payload runs' },
  ];

  // Simulation timer
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setIsPlaying(false);
          return 100;
        }

        const next = prev + 0.3 * speed;

        // In-flight scheduled fault event around 42% or 78% if not already occurred
        if (Math.floor(prev) === 41 && !activeAnomaly) {
          triggerInFlightAnomaly('In-Flight Solar Array Degradation');
        }

        return Math.min(100, Number(next.toFixed(1)));
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, speed, activeAnomaly]);

  // Handle autonomous recovery countdown
  useEffect(() => {
    if (!activeAnomaly) return;

    if (recoveryTimer > 0) {
      const t = setTimeout(() => {
        setRecoveryTimer((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(t);
    } else if (recoveryTimer === 0 && activeAnomaly) {
      // Recovery complete
      soundFX.successChime();
      setStage('RECOVERED');
      setActiveFault('none');
      setSubsystemHealth({
        power: 'nominal',
        communication: 'nominal',
        thermal: 'nominal',
        attitude: 'nominal',
        sensors: 'nominal',
        obc: 'nominal',
      });
      setLogs((prev) => [
        ...prev,
        `[MET AUTO-REC] FUSE-X autonomous pipeline resolved ${activeAnomaly}. Telemetry nominal.`,
      ]);
      setActiveAnomaly(null);
    }
  }, [recoveryTimer, activeAnomaly]);

  const triggerInFlightAnomaly = (name: string) => {
    setActiveAnomaly(name);
    setRecoveryTimer(6);
    soundFX.faultAlarm();
    const fault: FaultType = name.includes('Power') || name.includes('Solar') ? 'power' : 'communication';
    setActiveFault(fault);
    setStage('RECONFIGURE');
    setSubsystemHealth((p) => ({
      ...p,
      [fault]: 'degraded',
    }));
    setLogs((prev) => [
      ...prev,
      `[MET IN-FLIGHT] ANOMALY DETECTED: ${name}! Anomaly score: 0.92.`,
      `[MET IN-FLIGHT] FUSE-X Agentic engine engaged: evaluating candidate configurations...`,
    ]);
  };

  const restartMission = () => {
    setProgress(0);
    setIsPlaying(true);
    setActiveAnomaly(null);
    setRecoveryTimer(0);
    setActiveFault('none');
    setStage('IDLE');
    setSubsystemHealth({
      power: 'nominal',
      communication: 'nominal',
      thermal: 'nominal',
      attitude: 'nominal',
      sensors: 'nominal',
      obc: 'nominal',
    });
    setLogs(['[MET 00:00:00] MISSION 001 INITIALIZED: Pad countdown T-0. Liftoff!']);
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-[1720px] mx-auto pb-10">
      {/* Simulator Control Dashboard */}
      <div className="hud-panel rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-code">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-cyan-400" />
            <span className="font-display font-bold text-sm text-slate-100">
              MISSION 001 // ORBITAL LIFECYCLE SIMULATOR
            </span>
          </div>
          <div className="text-[11px] text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
            PROGRESS: <span className="text-cyan-300 font-bold">{progress}%</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-1.5 rounded text-xs font-mono-code font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'PAUSE' : 'START MISSION'}</span>
          </button>

          <button
            onClick={restartMission}
            className="px-2.5 py-1.5 rounded text-xs font-mono-code bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESTART</span>
          </button>

          {/* Speed Toggles */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5">
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 rounded text-[10px] font-mono-code ${
                  speed === s ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Inject Fault Buttons */}
          <button
            onClick={() => triggerInFlightAnomaly('In-Flight Communication Gimbal Lock')}
            disabled={!!activeAnomaly}
            className="px-2.5 py-1.5 rounded text-xs font-mono-code bg-amber-950/70 border border-amber-600/60 hover:bg-amber-900/80 text-amber-200 flex items-center gap-1 disabled:opacity-40 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>INJECT FAULT</span>
          </button>

          <button
            onClick={() => triggerInFlightAnomaly('Random Cosmic Ray Event')}
            disabled={!!activeAnomaly}
            className="px-2.5 py-1.5 rounded text-xs font-mono-code bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 disabled:opacity-40 transition-colors"
          >
            <Dices className="w-3.5 h-3.5 text-cyan-400" />
            <span>RANDOM FAULT</span>
          </button>
        </div>
      </div>

      {/* Main Progress Bar */}
      <div className="hud-panel rounded-lg p-4">
        <div className="flex items-center justify-between text-xs font-mono-code mb-2">
          <span className="text-slate-400 uppercase tracking-wider">ORBITAL MISSION TIMELINE // 0–100%</span>
          <span className="text-cyan-400 font-bold">{progress >= 100 ? 'MISSION COMPLETED' : 'IN FLIGHT'}</span>
        </div>
        <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 relative">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Active Anomaly Banner */}
      {activeAnomaly && (
        <div className="bg-rose-950/60 border border-rose-500/80 rounded-lg p-3 flex items-center justify-between shadow-lg animate-pulse text-xs font-mono-code">
          <div className="flex items-center gap-2 text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>IN-FLIGHT ANOMALY: <strong className="text-white">{activeAnomaly}</strong></span>
          </div>
          <div className="text-cyan-300 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 animate-spin" />
            <span>AUTONOMOUS HEALING RESOLUTION IN {recoveryTimer}s...</span>
          </div>
        </div>
      )}

      {/* 3D Satellite In-Flight Digital Twin */}
      <div className="hud-panel rounded-lg overflow-hidden border border-cyan-500/20 h-[320px] relative shadow-xl">
        <SatelliteScene
          pipelineStage={stage}
          activeFault={activeFault}
          subsystemHealth={subsystemHealth}
          activeCameraTarget="orbit"
          interactiveMode={true}
        />
        <div className="absolute top-3 left-3 bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded text-[11px] font-mono-code text-cyan-300 pointer-events-none">
          FLIGHT TELEMETRY VISUALIZATION // LEO 540KM
        </div>
      </div>

      {/* Mission Phases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {phases.map((ph, idx) => {
          const isDone = ph.status === 'completed';
          const isCur = ph.status === 'in_progress';
          const isAlert = ph.status === 'alert';

          return (
            <div
              key={ph.id}
              className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                isAlert
                  ? 'bg-rose-950/40 border-rose-500 text-rose-200'
                  : isCur
                  ? 'bg-cyan-950/30 border-cyan-400/80 text-cyan-100 shadow-md ring-1 ring-cyan-500/30'
                  : isDone
                  ? 'bg-slate-900/40 border-slate-800 text-slate-300'
                  : 'bg-slate-950/40 border-slate-900 text-slate-600'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono-code mb-1">
                  <span className="text-slate-500 font-bold">PHASE 0{idx + 1}</span>
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {isCur && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
                  {isAlert && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />}
                </div>
                <h4 className="text-xs font-bold font-display uppercase tracking-wide mb-1 text-slate-200">
                  {ph.name}
                </h4>
                <p className="text-[11px] font-mono-code text-slate-400">
                  {ph.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/60 text-[10px] font-mono-code text-slate-500 flex justify-between">
                <span>{ph.progressRange[0]}% - {ph.progressRange[1]}%</span>
                <span className={isCur ? 'text-cyan-400 font-bold' : isDone ? 'text-emerald-400' : 'text-slate-500'}>
                  {isDone ? 'COMPLETED' : isCur ? 'ACTIVE' : isAlert ? 'ANOMALY' : 'PENDING'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Flight Execution Telemetry Log */}
      <div className="hud-panel rounded-lg p-3 text-xs font-mono-code">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400 text-[11px]">
          <span>MISSION ELAPSED TIME (MET) EVENT LOG</span>
          <span className="text-cyan-400">AUTONOMOUS RECORD</span>
        </div>
        <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
          {logs.map((log, i) => (
            <div key={i} className="text-slate-300 text-[11px]">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
