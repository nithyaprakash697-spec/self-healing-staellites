import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SatelliteScene } from '../3d/SatelliteScene';
import { FaultType, PipelineStage, SubsystemHealth, CandidateConfig } from '../../types/satellite';
import { FAULT_SCENARIOS } from '../../utils/faultScenarios';
import { soundFX } from '../../utils/audio';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Award, 
  RotateCcw, 
  Play, 
  Zap, 
  Radio, 
  Thermometer, 
  Compass, 
  Activity, 
  Flame, 
  Search, 
  Cpu, 
  Camera, 
  CheckCircle2, 
  ChevronRight,
  Sparkles,
  Eye,
  Layers,
  Globe2
} from 'lucide-react';

export const ChallengeModeView: React.FC = () => {
  // Mission scenario state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [missionTime, setMissionTime] = useState<number>(18); // T+00:18
  const [missionHealth, setMissionHealth] = useState<number>(100);
  const [score, setScore] = useState<number>(1250);

  // Live telemetry balances
  const [powerMargin, setPowerMargin] = useState<number>(86);
  const [thermalMargin, setThermalMargin] = useState<number>(72);
  const [commMargin, setCommMargin] = useState<number>(100);
  const [attitudeStability, setAttitudeStability] = useState<number>(98);
  const [busVoltage, setBusVoltage] = useState<number>(28.2);
  const [coreTemp, setCoreTemp] = useState<number>(21.4);

  // Simulation & 3D state
  const [stage, setStage] = useState<PipelineStage>('IDLE');
  const [activeFault, setActiveFault] = useState<FaultType>('none');
  const [subsystemHealth, setSubsystemHealth] = useState<SubsystemHealth>({
    power: 'nominal',
    communication: 'nominal',
    thermal: 'nominal',
    attitude: 'nominal',
    sensors: 'nominal',
    obc: 'nominal',
  });
  const [activeCameraTarget, setActiveCameraTarget] = useState<'orbit' | 'diagnostic' | 'cinematic' | 'recovery' | 'wide' | 'bus' | 'solar' | 'antenna' | 'adcs' | 'thermal' | 'sensor' | 'obc'>('orbit');
  const [diagnosticMode, setDiagnosticMode] = useState<boolean>(false);
  const [diagnosticMessage, setDiagnosticMessage] = useState<string>('All spacecraft avionics, power distribution, and thermal loops operating within nominal bounds.');

  // Game statistics
  const [stats, setStats] = useState({
    faultsEncountered: 0,
    faultsRecovered: 0,
    avgRecoveryTime: 3.4,
    missionContinuity: 100,
  });

  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mission Elapsed Time (MET) clock
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setMissionTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Dynamic stochastic fault trigger at T+00:25 if nominal
  useEffect(() => {
    if (!isPlaying || activeFault !== 'none') return;

    if (missionTime === 24) {
      injectChallengeFault('power');
    } else if (missionTime === 75) {
      injectChallengeFault('thermal');
    }
  }, [missionTime, isPlaying, activeFault]);

  // Format Mission Elapsed Time (MET) string: T+00:18
  const formatMET = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `T+${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Inject a fault dynamically in the 3D mission
  const injectChallengeFault = useCallback((fault: FaultType) => {
    let resolvedFault: Exclude<FaultType, 'none' | 'random' | 'unrecoverable_stress'>;
    if (fault === 'random' || fault === 'none' || fault === 'unrecoverable_stress') {
      const types: Exclude<FaultType, 'none' | 'random' | 'unrecoverable_stress'>[] = ['power', 'communication', 'thermal', 'attitude', 'sensor'];
      resolvedFault = types[Math.floor(Math.random() * types.length)];
    } else {
      resolvedFault = fault;
    }

    setActiveFault(resolvedFault);
    setStage('OBSERVE');
    soundFX.faultAlarm();
    setStats((p) => ({ ...p, faultsEncountered: p.faultsEncountered + 1 }));

    // Telemetry perturbations
    if (resolvedFault === 'power') {
      setPowerMargin(24);
      setBusVoltage(21.4);
      setSubsystemHealth((p) => ({ ...p, power: 'degraded' }));
      setDiagnosticMessage('WARNING: Primary solar array string #2 open-circuit trip detected. Bus voltage sag to 21.4V.');
      setActiveCameraTarget('solar');
    } else if (resolvedFault === 'thermal') {
      setThermalMargin(28);
      setCoreTemp(81.5);
      setSubsystemHealth((p) => ({ ...p, thermal: 'degraded' }));
      setDiagnosticMessage('WARNING: Radiator louver mechanism jammed in closed position. Core bay temperature surging.');
      setActiveCameraTarget('thermal');
    } else if (resolvedFault === 'communication') {
      setCommMargin(12);
      setSubsystemHealth((p) => ({ ...p, communication: 'degraded' }));
      setDiagnosticMessage('WARNING: High-gain X-band dish gimbal azimuth motor stalled. Earth downlink carrier lock lost.');
      setActiveCameraTarget('antenna');
    } else if (resolvedFault === 'attitude') {
      setAttitudeStability(34);
      setSubsystemHealth((p) => ({ ...p, attitude: 'degraded' }));
      setDiagnosticMessage('WARNING: Reaction wheel RW-2 runaway tachometer event. Spacecraft tumbling 12.4° off Nadir.');
      setActiveCameraTarget('adcs');
    } else {
      setSubsystemHealth((p) => ({ ...p, sensors: 'degraded' }));
      setDiagnosticMessage('WARNING: Star Tracker optical head blinded by solar proton flux. Kalman attitude covariance degraded.');
      setActiveCameraTarget('sensor');
    }

    // Health drops while unresolved
    setMissionHealth((h) => Math.max(35, h - 20));
  }, []);

  // Activate FUSE-X Autonomous Recovery Pipeline
  const activateAutonomousRecovery = useCallback(() => {
    if (activeFault === 'none' || stage === 'RECONFIGURE' || stage === 'VERIFY') return;

    soundFX.reconfigureTone();
    setStage('DETECT');
    setDiagnosticMessage('FUSE-X Autonomous Agent detecting anomaly signature and calculating residual matrix...');

    recoveryTimeoutRef.current = setTimeout(() => {
      setStage('ISOLATE');
      setDiagnosticMessage(`Fault isolated to ${activeFault.toUpperCase()} subsystem hardware tree. Pruning failure graph.`);

      recoveryTimeoutRef.current = setTimeout(() => {
        setStage('EVALUATE');
        setDiagnosticMessage('Evaluating 16 candidate configurations across multi-objective Pareto safety constraints...');

        recoveryTimeoutRef.current = setTimeout(() => {
          setStage('SELECT');
          setDiagnosticMessage('Candidate C-07 selected: All safety constraints satisfied. Power, thermal & link margins within envelope.');

          recoveryTimeoutRef.current = setTimeout(() => {
            setStage('RECONFIGURE');
            setActiveCameraTarget('recovery');
            soundFX.reconfigureTone();
            soundFX.thrusterBurst();
            setDiagnosticMessage('Executing physical 3D reconfiguration: Actuating latching relays, secondary cross-strapping & re-orientation.');

            // Subsystem health transitions
            setSubsystemHealth((p) => ({
              ...p,
              [activeFault === 'random' ? 'power' : activeFault]: 'reconfigured',
            }));

            recoveryTimeoutRef.current = setTimeout(() => {
              setStage('VERIFY');
              setDiagnosticMessage('Verifying post-reconfiguration Lyapunov telemetry convergence over 2 orbital epochs...');

              // Telemetry recovers
              setPowerMargin(88);
              setBusVoltage(28.1);
              setThermalMargin(82);
              setCoreTemp(22.8);
              setCommMargin(98);
              setAttitudeStability(99);

              recoveryTimeoutRef.current = setTimeout(() => {
                setStage('RECOVERED');
                soundFX.successChime();
                setDiagnosticMessage('RECOVERY VERIFIED: Spacecraft returned to nominal mission state. All subsystems green.');
                setMissionHealth(100);
                setScore((s) => s + 450);
                setStats((p) => ({
                  ...p,
                  faultsRecovered: p.faultsRecovered + 1,
                  missionContinuity: 100,
                }));
                setActiveFault('none');
                setSubsystemHealth({
                  power: 'nominal',
                  communication: 'nominal',
                  thermal: 'nominal',
                  attitude: 'nominal',
                  sensors: 'nominal',
                  obc: 'nominal',
                });
                setActiveCameraTarget('cinematic');
              }, 2500);
            }, 2500);
          }, 2500);
        }, 2200);
      }, 2000);
    }, 1800);
  }, [activeFault, stage]);

  const toggleDiagnosticScan = () => {
    setDiagnosticMode(!diagnosticMode);
    soundFX.telemetryPing();
    if (!diagnosticMode) {
      setActiveCameraTarget('diagnostic');
    } else {
      setActiveCameraTarget('orbit');
    }
  };

  const restartMissionScenario = () => {
    if (recoveryTimeoutRef.current) clearTimeout(recoveryTimeoutRef.current);
    setMissionTime(0);
    setMissionHealth(100);
    setScore(1000);
    setPowerMargin(86);
    setThermalMargin(72);
    setCommMargin(100);
    setAttitudeStability(98);
    setBusVoltage(28.2);
    setCoreTemp(21.4);
    setStage('IDLE');
    setActiveFault('none');
    setSubsystemHealth({
      power: 'nominal',
      communication: 'nominal',
      thermal: 'nominal',
      attitude: 'nominal',
      sensors: 'nominal',
      obc: 'nominal',
    });
    setActiveCameraTarget('orbit');
    setDiagnosticMessage('Mission restarted. Satellite operating nominal in Sun-Synchronous Orbit.');
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-[1720px] mx-auto pb-10">
      {/* Top Mission Operator HUD */}
      <div className="hud-panel rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-code">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-cyan-400" />
            <h2 className="font-display font-bold text-sm text-slate-100 uppercase tracking-wider">
              MISSION SURVIVAL — 3D OPERATOR SIMULATOR
            </h2>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
            <span className="text-slate-400">SCENARIO:</span>
            <span className="text-cyan-300 font-bold">EARTH OBSERVATION — ORBIT 27</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{formatMET(missionTime)}</span>
          </div>
        </div>

        {/* Live Score & Mission Status */}
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-slate-400">
            MISSION SCORE: <strong className="text-cyan-300 text-sm">{score} PTS</strong>
          </div>
          <button
            onClick={restartMissionScenario}
            className="px-2.5 py-1.5 rounded text-xs font-mono-code bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESTART</span>
          </button>
        </div>
      </div>

      {/* Primary Mission Resource Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {/* Mission Health */}
        <div className="hud-panel rounded-lg p-2.5 text-xs font-mono-code">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[10px]">MISSION HEALTH</span>
            <ShieldCheck className={`w-3.5 h-3.5 ${missionHealth < 50 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
          </div>
          <div className={`text-base font-bold ${missionHealth < 50 ? 'text-rose-400' : 'text-slate-100'}`}>
            {missionHealth}%
          </div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-300 ${missionHealth < 50 ? 'bg-rose-500' : 'bg-emerald-400'}`}
              style={{ width: `${missionHealth}%` }}
            />
          </div>
        </div>

        {/* Power Margin */}
        <div className="hud-panel rounded-lg p-2.5 text-xs font-mono-code">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[10px]">POWER MARGIN</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className={`text-base font-bold ${powerMargin < 30 ? 'text-amber-400' : 'text-slate-100'}`}>
            {powerMargin}%
          </div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-300 ${powerMargin < 30 ? 'bg-amber-500' : 'bg-amber-400'}`}
              style={{ width: `${powerMargin}%` }}
            />
          </div>
        </div>

        {/* Thermal Margin */}
        <div className="hud-panel rounded-lg p-2.5 text-xs font-mono-code">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[10px]">THERMAL MARGIN</span>
            <Thermometer className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className={`text-base font-bold ${thermalMargin < 40 ? 'text-rose-400' : 'text-slate-100'}`}>
            {thermalMargin}%
          </div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-300 ${thermalMargin < 40 ? 'bg-rose-500' : 'bg-blue-400'}`}
              style={{ width: `${thermalMargin}%` }}
            />
          </div>
        </div>

        {/* Communication */}
        <div className="hud-panel rounded-lg p-2.5 text-xs font-mono-code">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[10px]">COMM LINK</span>
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className={`text-base font-bold ${commMargin < 30 ? 'text-rose-400' : 'text-slate-100'}`}>
            {commMargin}%
          </div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-300 ${commMargin < 30 ? 'bg-rose-500' : 'bg-emerald-400'}`}
              style={{ width: `${commMargin}%` }}
            />
          </div>
        </div>

        {/* Attitude Stability */}
        <div className="hud-panel rounded-lg p-2.5 text-xs font-mono-code">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[10px]">ATTITUDE STABILITY</span>
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className={`text-base font-bold ${attitudeStability < 50 ? 'text-rose-400' : 'text-slate-100'}`}>
            {attitudeStability}%
          </div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-300 ${attitudeStability < 50 ? 'bg-rose-500' : 'bg-cyan-400'}`}
              style={{ width: `${attitudeStability}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main 3D Satellite Interactive Mission Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left/Center: Large 3D Satellite Viewport */}
        <div className="lg:col-span-8 flex flex-col gap-2.5">
          <div className="hud-panel rounded-lg overflow-hidden border border-cyan-500/20 h-[440px] lg:h-[580px] relative shadow-2xl">
            <SatelliteScene
              pipelineStage={stage}
              activeFault={activeFault}
              subsystemHealth={subsystemHealth}
              activeCameraTarget={activeCameraTarget}
              interactiveMode={true}
              telemetry={{
                coreTemp,
                attitudeError: (100 - attitudeStability) / 10,
                busVoltage,
                commMargin: (commMargin / 100) * 15,
                powerMargin,
              }}
              onSelectSubsystem={(sub) => {
                setDiagnosticMessage(`Operator selected and inspecting ${sub.toUpperCase()} subsystem details.`);
              }}
            />

            {/* In-Cockpit Overlay Banner when Fault is active */}
            {activeFault !== 'none' && (
              <div className="absolute top-4 left-4 right-4 bg-rose-950/90 border border-rose-500/80 p-3 rounded-lg backdrop-blur flex flex-wrap items-center justify-between gap-3 shadow-2xl animate-pulse">
                <div className="flex items-center gap-2.5 text-rose-200">
                  <Flame className="w-5 h-5 text-rose-400 shrink-0" />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider font-display">
                      ALERT: {activeFault.toUpperCase()} SUBSYSTEM ANOMALY DETECTED
                    </h3>
                    <p className="text-[10px] font-mono-code text-rose-300/80">
                      Spacecraft performance degraded. Activate autonomous recovery to reconfigure topology!
                    </p>
                  </div>
                </div>

                <button
                  onClick={activateAutonomousRecovery}
                  className="px-4 py-2 rounded text-xs font-display font-bold tracking-wider bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white flex items-center gap-2 shadow-lg border border-cyan-400/50 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>ACTIVATE AUTONOMOUS RECOVERY</span>
                </button>
              </div>
            )}
          </div>

          {/* Operator Action Deck */}
          <div className="hud-panel rounded-lg p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono-code">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDiagnosticScan}
                className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
                  diagnosticMode
                    ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/60'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span>DIAGNOSTIC MODE</span>
              </button>

              <button
                onClick={() => injectChallengeFault('random')}
                disabled={activeFault !== 'none'}
                className="px-3 py-1.5 rounded bg-amber-950/70 border border-amber-600/60 hover:bg-amber-900/80 text-amber-200 flex items-center gap-1.5 transition-colors disabled:opacity-40"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>INJECT RANDOM ANOMALY</span>
              </button>
            </div>

            {/* Autonomous Recovery Action */}
            <button
              onClick={activateAutonomousRecovery}
              disabled={activeFault === 'none' || stage !== 'OBSERVE'}
              className="px-4 py-1.5 rounded font-display font-semibold tracking-wider bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center gap-1.5 shadow transition-colors"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-200" />
              <span>TRIGGER AI RECOVERY</span>
            </button>
          </div>
        </div>

        {/* Right Side: Mission Operator Diagnostic Telemetry Deck */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Subsystem Health Matrix */}
          <div className="hud-panel rounded-lg p-3 text-xs font-mono-code">
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
              <span className="text-slate-400 uppercase tracking-wider text-[10px]">
                SPACECRAFT SUBSYSTEM HEALTH MATRIX
              </span>
              <span className="text-[10px] text-cyan-400">100 HZ BUS</span>
            </div>

            <div className="space-y-1.5">
              {[
                { name: 'Electrical Power (EPS)', key: 'power', icon: Zap },
                { name: 'Thermal Control (TCS)', key: 'thermal', icon: Thermometer },
                { name: 'Radio Frequency Link (COMM)', key: 'communication', icon: Radio },
                { name: 'Attitude Control (ADCS)', key: 'attitude', icon: Compass },
                { name: 'Optical Payload & Sensors', key: 'sensors', icon: Eye },
                { name: 'Onboard Computer (OBC)', key: 'obc', icon: Cpu },
              ].map((sub) => {
                const h = subsystemHealth[sub.key as keyof SubsystemHealth];
                const Icon = sub.icon;

                return (
                  <div
                    key={sub.key}
                    className={`p-2 rounded border flex items-center justify-between ${
                      h === 'critical'
                        ? 'bg-rose-950/40 border-rose-500 text-rose-200'
                        : h === 'degraded'
                        ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                        : h === 'reconfigured'
                        ? 'bg-cyan-950/40 border-cyan-400 text-cyan-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${h === 'nominal' ? 'text-cyan-400' : 'text-amber-400'}`} />
                      <span className="text-[11px] font-semibold">{sub.name}</span>
                    </div>

                    <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold uppercase ${
                      h === 'nominal' ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/60' :
                      h === 'reconfigured' ? 'text-cyan-300 bg-cyan-950/60 border border-cyan-700/60' :
                      'text-rose-400 bg-rose-950/60 border border-rose-800/60'
                    }`}>
                      {h}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Diagnostic Feed Stream */}
          <div className="hud-panel rounded-lg p-3 text-xs font-mono-code flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                  REAL-TIME MISSION LOG & DECISION FEED
                </span>
                <span className="text-[10px] text-emerald-400">FUSE-X AGENT</span>
              </div>

              <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80 text-[11px] leading-relaxed text-slate-200 mb-2">
                {diagnosticMessage}
              </div>

              {stage !== 'IDLE' && stage !== 'RECOVERED' && (
                <div className="p-2 rounded bg-cyan-950/40 border border-cyan-500/40 text-[10px] text-cyan-300 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
                  <span>AUTONOMOUS PIPELINE STAGE: <strong>{stage}</strong></span>
                </div>
              )}
            </div>

            {/* Debrief Metrics Bar */}
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
              <div>
                <span>FAULTS RESOLVED:</span>
                <strong className="text-emerald-400 ml-1">{stats.faultsRecovered} / {stats.faultsEncountered}</strong>
              </div>
              <div>
                <span>MEAN RECOVERY TIME:</span>
                <strong className="text-cyan-300 ml-1">{stats.avgRecoveryTime}s</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
