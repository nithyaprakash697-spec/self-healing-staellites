import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  SimulationState, 
  FaultType, 
  PipelineStage, 
  TelemetryData, 
  SubsystemHealth, 
  CandidateConfig,
  LogMessage
} from '../../types/satellite';
import { FAULT_SCENARIOS, ScenarioDefinition } from '../../utils/faultScenarios';
import { soundFX } from '../../utils/audio';
import { SatelliteScene } from '../3d/SatelliteScene';
import { TelemetryCards } from './TelemetryCards';
import { AgenticPipeline } from './AgenticPipeline';
import { ConfigurationEvaluator } from './ConfigurationEvaluator';
import { FaultInjector } from './FaultInjector';
import { PerformanceComparison } from './PerformanceComparison';
import { JudgeDemoController } from './JudgeDemoController';
import { 
  RotateCw, 
  Award,
  Volume2,
  VolumeX,
  Activity,
  Radio,
  Layers,
  Database
} from 'lucide-react';

const INITIAL_TELEMETRY: TelemetryData = {
  busVoltage: 28.2,
  busCurrent: 14.8,
  batterySoc: 94.5,
  coreTemp: 21.4,
  radiatorTemp: 8.2,
  cpuLoad: 32,
  attitudeError: 0.03,
  commMargin: 14.2,
  powerMargin: 48.0,
  solarGeneration: 865,
  adcsRpm: 2950,
};

const INITIAL_HEALTH: SubsystemHealth = {
  power: 'nominal',
  communication: 'nominal',
  thermal: 'nominal',
  attitude: 'nominal',
  sensors: 'nominal',
  obc: 'nominal',
};

const INITIAL_LOGS: LogMessage[] = [
  {
    id: 'log-0',
    timestamp: '21:00:02.14',
    level: 'info',
    source: 'SYS',
    message: 'FUSE-X Autonomous System initialized on satellite bus.',
  },
  {
    id: 'log-1',
    timestamp: '21:00:05.80',
    level: 'info',
    source: 'OBC',
    message: 'Sun-synchronous orbit nominal. Nadir pointing verified < 0.05°.',
  },
  {
    id: 'log-2',
    timestamp: '21:00:10.02',
    level: 'ai',
    source: 'FUSE-X',
    message: 'Continuous autonomous monitoring active. All subsystems green.',
  },
];

export const MissionControlView: React.FC = () => {
  const [stage, setStage] = useState<PipelineStage>('IDLE');
  const [activeFault, setActiveFault] = useState<FaultType>('none');
  const [subsystemHealth, setSubsystemHealth] = useState<SubsystemHealth>(INITIAL_HEALTH);
  const [activeConfigId, setActiveConfigId] = useState<string>('NOMINAL-01');
  const [telemetry, setTelemetry] = useState<TelemetryData>(INITIAL_TELEMETRY);
  const [candidates, setCandidates] = useState<CandidateConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<CandidateConfig | null>(null);
  const [logs, setLogs] = useState<LogMessage[]>(INITIAL_LOGS);
  const [anomalyScore, setAnomalyScore] = useState<number>(0.02);
  const [activeCameraTarget, setActiveCameraTarget] = useState<'orbit' | 'diagnostic' | 'cinematic' | 'recovery' | 'wide' | 'bus' | 'solar' | 'antenna' | 'adcs' | 'thermal' | 'sensor' | 'obc'>('orbit');

  // Before / After Mission Performance Tracking (Requirement 3)
  const [beforePerformance, setBeforePerformance] = useState<number>(98);
  const [afterFaultPerformance, setAfterFaultPerformance] = useState<number | null>(null);
  const [afterReconfigPerformance, setAfterReconfigPerformance] = useState<number | null>(null);

  // Active scenario definition
  const activeScenario = useMemo<ScenarioDefinition | null>(() => {
    if (activeFault === 'none') return null;
    if (activeFault === 'stress' || activeFault === 'unrecoverable_stress') {
      return FAULT_SCENARIOS.stress;
    }
    return FAULT_SCENARIOS[activeFault as Exclude<FaultType, 'none' | 'random' | 'stress' | 'unrecoverable_stress'>] || null;
  }, [activeFault]);

  // Dynamic live performance calculation
  const currentPerformance = useMemo(() => {
    if (stage === 'IDLE') return 98;
    if (stage === 'RECOVERED') return activeScenario ? activeScenario.recoveredPerformance : 93;
    if (stage === 'RECONFIGURE' || stage === 'VERIFY') {
      if (!activeScenario) return 88;
      return Math.round(activeScenario.faultPerformance + (activeScenario.recoveredPerformance - activeScenario.faultPerformance) * 0.85);
    }
    if (activeScenario) return activeScenario.faultPerformance;
    return 50;
  }, [stage, activeScenario]);

  const addLog = useCallback((message: string, level: LogMessage['level'] = 'info', source = 'FUSE-X') => {
    const d = new Date();
    const ts = `${d.toTimeString().split(' ')[0]}.${Math.floor(d.getMilliseconds() / 10).toString().padStart(2, '0')}`;
    const newLog: LogMessage = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: ts,
      level,
      source,
      message,
    };
    setLogs((prev) => [...prev.slice(-30), newLog]);
  }, []);

  const handleSelectSubsystem = useCallback((sub: keyof SubsystemHealth) => {
    addLog(`Operator inspected subsystem: ${sub.toUpperCase()}`, 'info', 'UI');
  }, [addLog]);

  // Judge Demo state
  const [isJudgeDemo, setIsJudgeDemo] = useState(false);
  const [judgeStep, setJudgeStep] = useState(1);
  const [isJudgePaused, setIsJudgePaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const judgeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sequenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Continuous micro-jitter for live telemetry so satellite feels alive
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((prev) => {
        const jitter = (Math.random() - 0.5) * 0.08;
        const curJitter = (Math.random() - 0.5) * 0.12;
        const tempJitter = (Math.random() - 0.5) * 0.15;
        const cpuJitter = Math.floor((Math.random() - 0.5) * 2);

        return {
          ...prev,
          busVoltage: Math.max(10, Math.min(32, prev.busVoltage + jitter * 0.3)),
          busCurrent: Math.max(5, Math.min(35, prev.busCurrent + curJitter * 0.2)),
          coreTemp: Math.max(10, Math.min(95, prev.coreTemp + tempJitter * 0.2)),
          cpuLoad: Math.max(15, Math.min(99, prev.cpuLoad + cpuJitter)),
          solarGeneration: Math.max(50, prev.solarGeneration + (Math.random() - 0.5) * 4),
        };
      });
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  // Sound toggle
  const toggleSound = () => {
    soundFX.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  // Reset to Nominal Flight State
  const resetToNominal = useCallback(() => {
    if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);
    if (judgeTimerRef.current) clearTimeout(judgeTimerRef.current);

    setStage('IDLE');
    setActiveFault('none');
    setSubsystemHealth(INITIAL_HEALTH);
    setActiveConfigId('NOMINAL-01');
    setTelemetry(INITIAL_TELEMETRY);
    setCandidates([]);
    setSelectedConfig(null);
    setAnomalyScore(0.02);
    setActiveCameraTarget('orbit');
    setIsJudgeDemo(false);
    setBeforePerformance(98);
    setAfterFaultPerformance(null);
    setAfterReconfigPerformance(null);

    addLog('System reset to nominal flight state. Subsystems green.', 'success', 'SYS');
  }, [addLog]);

  // Execute Autonomous Self-Healing Sequence for a given Fault
  // Sequence: FAULT INJECTED -> FAULT DETECTED -> FAULT ISOLATED -> RECOVERY SEARCH -> SAFE CONFIG SELECTED -> RECONFIGURE -> RECOVERY VERIFIED
  const triggerFaultSequence = useCallback((faultType: FaultType) => {
    if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);

    // Resolve random fault
    let effectiveType: Exclude<FaultType, 'none' | 'random'>;
    if (faultType === 'random') {
      const types: Exclude<FaultType, 'none' | 'random' | 'unrecoverable_stress'>[] = [
        'power',
        'communication',
        'thermal',
        'attitude',
        'sensor',
        'stress',
      ];
      effectiveType = types[Math.floor(Math.random() * types.length)];
    } else if (faultType === 'none') {
      return;
    } else {
      effectiveType = faultType;
    }

    const scenario = FAULT_SCENARIOS[effectiveType] || FAULT_SCENARIOS.power;
    if (!scenario) return;

    // STEP 1: FAULT INJECTED
    setActiveFault(effectiveType);
    setStage('OBSERVE');
    setAnomalyScore(0.42);
    soundFX.faultAlarm();

    // Set performance values
    setBeforePerformance(scenario.baselinePerformance);
    setAfterFaultPerformance(scenario.faultPerformance);
    setAfterReconfigPerformance(null);

    // Camera view adjustment based on fault
    if (effectiveType === 'power') setActiveCameraTarget('solar');
    else if (effectiveType === 'communication') setActiveCameraTarget('antenna');
    else if (effectiveType === 'thermal') setActiveCameraTarget('thermal');
    else if (effectiveType === 'attitude') setActiveCameraTarget('adcs');
    else if (effectiveType === 'sensor') setActiveCameraTarget('sensor');
    else setActiveCameraTarget('bus');

    // Telemetry plunges
    setTelemetry((prev) => ({
      ...prev,
      ...scenario.faultTelemetry,
    }));

    setSubsystemHealth((prev) => ({
      ...prev,
      [scenario.affectedSubsystem]: 'degraded',
    }));

    addLog(`FAULT INJECTED: ${scenario.title}. Perturbation detected.`, 'error', 'EPS');

    // STEP 2: FAULT DETECTED (Plain English, Judge-Friendly)
    sequenceTimerRef.current = setTimeout(() => {
      setStage('DETECT');
      setAnomalyScore(0.89);
      soundFX.telemetryPing();
      addLog(scenario.simpleFaultDetected, 'warn', 'DETECT');

      // STEP 3: FAULT ISOLATED (Plain English)
      sequenceTimerRef.current = setTimeout(() => {
        setStage('ISOLATE');
        setSubsystemHealth((prev) => ({
          ...prev,
          [scenario.affectedSubsystem]: 'critical',
        }));
        soundFX.telemetryPing();
        addLog(scenario.simpleFaultIsolated, 'warn', 'ISOLATE');

        // STEP 4: RECOVERY CONFIGURATION SEARCH
        sequenceTimerRef.current = setTimeout(() => {
          setStage('EVALUATE');
          setCandidates(scenario.candidates);
          soundFX.telemetryPing();
          addLog(scenario.simpleReconfigHeader, 'ai', 'SEARCH');

          // STEP 5: BEST FEASIBLE CONFIGURATION SELECTED
          sequenceTimerRef.current = setTimeout(() => {
            const safeCand = scenario.candidates.find((c) => c.status === 'safe') || scenario.candidates[0];

            setStage('SELECT');
            setSelectedConfig(safeCand);
            soundFX.telemetryPing();
            addLog(`Safe configuration selected: ${safeCand.name}`, 'ai', 'SELECT');

            // STEP 6: SYSTEM RECONFIGURED (Software-defined reconfiguration)
            sequenceTimerRef.current = setTimeout(() => {
              setStage('RECONFIGURE');
              soundFX.reconfigureTone();
              soundFX.thrusterBurst();
              setActiveConfigId(scenario.recoveryConfig);
              addLog(`Reconfiguring: ${scenario.simpleReconfigActions[0]}`, 'ai', 'RECONFIGURE');

              // Health adapts to reconfigured
              setSubsystemHealth((prev) => ({
                ...prev,
                [scenario.affectedSubsystem]: 'reconfigured',
              }));

              // STEP 7: RECOVERY VERIFIED
              sequenceTimerRef.current = setTimeout(() => {
                setStage('VERIFY');
                soundFX.telemetryPing();
                setAfterReconfigPerformance(scenario.recoveredPerformance);
                addLog('Verifying post-reconfiguration performance...', 'info', 'VERIFY');

                // Telemetry progressively heals back to nominal
                setTelemetry((prev) => ({
                  ...prev,
                  ...scenario.reconfiguredTelemetry,
                }));

                // STEP 8: RECOVERED & SYSTEM NOMINAL
                sequenceTimerRef.current = setTimeout(() => {
                  setStage('RECOVERED');
                  setAnomalyScore(0.04);
                  soundFX.successChime();
                  addLog(
                    `✓ Recovery verified: Safe configuration found. Mission performance restored to ${scenario.recoveredPerformance}%. System reconfigured for continued operation.`,
                    'success',
                    'VERIFIED'
                  );

                  setSubsystemHealth(INITIAL_HEALTH);
                }, 2600);
              }, 2400);
            }, 2400);
          }, 2400);
        }, 2200);
      }, 2000);
    }, 1800);
  }, [addLog]);

  // Choreographed Judge Demo Flow (~45s)
  const startJudgeDemo = useCallback(() => {
    resetToNominal();
    setIsJudgeDemo(true);
    setJudgeStep(1);
    setIsJudgePaused(false);
    addLog('--- INITIATING JUDGE DEMONSTRATION RUN (45s Choreographed) ---', 'ai', 'JUDGE-MODE');

    const runStep = (stepNum: number) => {
      setJudgeStep(stepNum);

      switch (stepNum) {
        case 1:
          addLog('Phase 1: Satellite operating in nominal Earth observation orbit.', 'info', 'DEMO');
          setActiveCameraTarget('orbit');
          judgeTimerRef.current = setTimeout(() => runStep(2), 3500);
          break;
        case 2:
          addLog('Phase 2: Power subsystem fault injected.', 'error', 'DEMO');
          triggerFaultSequence('power');
          judgeTimerRef.current = setTimeout(() => runStep(3), 5000);
          break;
        case 3:
          addLog('Phase 3: Fault detected autonomously by FUSE-X monitor.', 'warn', 'DEMO');
          judgeTimerRef.current = setTimeout(() => runStep(4), 5000);
          break;
        case 4:
          addLog('Phase 4: Fault isolated to Power subsystem.', 'warn', 'DEMO');
          judgeTimerRef.current = setTimeout(() => runStep(5), 5500);
          break;
        case 5:
          addLog('Phase 5: Searching for safer operating configuration...', 'ai', 'DEMO');
          judgeTimerRef.current = setTimeout(() => runStep(6), 6000);
          break;
        case 6:
          addLog('Phase 6: Safe configuration selected; unsafe options rejected.', 'ai', 'DEMO');
          judgeTimerRef.current = setTimeout(() => runStep(7), 5500);
          break;
        case 7:
          addLog('Phase 7: System reconfigured for continued operation.', 'ai', 'DEMO');
          judgeTimerRef.current = setTimeout(() => runStep(8), 6500);
          break;
        case 8:
          addLog('Phase 8: Post-reconfiguration mission performance verified.', 'success', 'DEMO');
          judgeTimerRef.current = setTimeout(() => runStep(9), 5000);
          break;
        case 9:
          addLog('Phase 9: Recovery verified! Mission performance restored.', 'success', 'DEMO');
          soundFX.successChime();
          judgeTimerRef.current = setTimeout(() => {
            setIsJudgeDemo(false);
            addLog('--- JUDGE DEMO COMPLETED SUCCESSFULLY ---', 'success', 'JUDGE-MODE');
          }, 4000);
          break;
        default:
          setIsJudgeDemo(false);
          break;
      }
    };

    runStep(1);
  }, [addLog, resetToNominal, triggerFaultSequence]);

  const judgeStepDescriptions = [
    'Nominal Baseline Orbit Inspection',
    'Injecting Subsystem Fault',
    'Autonomous Fault Detection',
    'Subsystem Fault Isolation',
    'Recovery Configuration Search',
    'Safe Configuration Selection',
    'Software-Defined Reconfiguration',
    'Telemetry Performance Verification',
    'Recovery Verified & Mission Continuation',
  ];

  return (
    <div className="flex flex-col gap-3 w-full max-w-[1720px] mx-auto pb-10">
      {/* Top Mission Status Strip (Section B labeling) */}
      <div className="hud-panel rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-code">
        <div className="flex items-center gap-3">
          {/* Section B Badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/60 text-[10px] text-cyan-300 font-bold">
            <Radio className="w-3 h-3 text-cyan-400" />
            <span>SECTION B: LIVE DEMONSTRATION</span>
          </div>

          {/* SYSTEM STATUS */}
          <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
            <span className="text-slate-400 text-[10px]">SYSTEM STATUS:</span>
            {stage === 'FAILED' ? (
              <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                LIMIT REACHED
              </span>
            ) : stage === 'RECOVERED' || stage === 'IDLE' ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                NOMINAL
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                AUTONOMOUS RECOVERY
              </span>
            )}
          </div>

          {/* FAULT STATUS */}
          <div className="flex items-center gap-2 pr-3 border-r border-slate-800 hidden sm:flex">
            <span className="text-slate-400 text-[10px]">FAULT STATUS:</span>
            <span className={`font-bold ${activeFault !== 'none' ? 'text-rose-400 uppercase' : 'text-slate-300'}`}>
              {activeFault === 'none' ? 'NONE' : activeFault}
            </span>
          </div>

          {/* AI STATUS */}
          <div className="flex items-center gap-2 pr-3 border-r border-slate-800 hidden md:flex">
            <span className="text-slate-400 text-[10px]">AI STATUS:</span>
            <span className={`font-bold ${stage !== 'IDLE' && stage !== 'RECOVERED' ? 'text-cyan-400 flex items-center gap-1' : 'text-slate-300'}`}>
              {stage === 'IDLE' ? 'MONITORING' : stage === 'RECOVERED' ? 'VERIFIED' : (
                <>
                  <RotateCw className="w-3 h-3 animate-spin" />
                  {stage}
                </>
              )}
            </span>
          </div>

          {/* CONFIGURATION */}
          <div className="flex items-center gap-2 pr-3 border-r border-slate-800 hidden lg:flex">
            <span className="text-slate-400 text-[10px]">CONFIGURATION:</span>
            <span className="text-cyan-300 font-bold">{activeConfigId}</span>
          </div>

          {/* RECOVERY */}
          <div className="flex items-center gap-2 hidden lg:flex">
            <span className="text-slate-400 text-[10px]">RECOVERY:</span>
            <span className={`font-bold ${stage === 'RECOVERED' ? 'text-emerald-400' : stage === 'FAILED' ? 'text-rose-400' : 'text-slate-300'}`}>
              {stage === 'RECOVERED' ? 'SUCCESSFUL' : stage === 'FAILED' ? 'FAILED' : 'READY'}
            </span>
          </div>
        </div>

        {/* Action Controls: Judge Demo & Audio */}
        <div className="flex items-center gap-2">
          <button
            onClick={startJudgeDemo}
            className="px-3 py-1.5 rounded text-xs font-display font-semibold tracking-wider bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white flex items-center gap-1.5 shadow-lg shadow-cyan-950/60 transition-all border border-cyan-400/40"
          >
            <Award className="w-3.5 h-3.5 text-cyan-200" />
            <span>JUDGE DEMO</span>
          </button>

          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute audio' : 'Unmute audio'}
            className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Main Mission Control Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* LEFT / MAIN AREA: Interactive 3D Satellite Viewport & Fault Injector */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3">
          <div className="hud-panel rounded-lg overflow-hidden border border-cyan-500/20 h-[420px] lg:h-[560px] relative shadow-2xl">
            <SatelliteScene
              pipelineStage={stage}
              activeFault={activeFault}
              subsystemHealth={subsystemHealth}
              activeCameraTarget={activeCameraTarget}
              telemetry={telemetry}
              onSelectSubsystem={handleSelectSubsystem}
            />
          </div>

          {/* Fault Injector Prominent Panel (Below 3D Scene on Left) */}
          <FaultInjector
            stage={stage}
            activeFault={activeFault}
            onInjectFault={triggerFaultSequence}
            onResetNominal={resetToNominal}
          />
        </div>

        {/* RIGHT SIDE: Live Mission Control Panel */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3">
          {/* Before & After Performance Comparison (Requirement 3) */}
          <PerformanceComparison
            stage={stage}
            activeFault={activeFault}
            beforePerformance={beforePerformance}
            afterFaultPerformance={afterFaultPerformance}
            afterReconfigPerformance={afterReconfigPerformance}
            currentPerformance={currentPerformance}
          />

          {/* Live Telemetry Cards */}
          <div className="hud-panel rounded-lg p-3">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-semibold tracking-wider font-display uppercase text-slate-100">
                  LIVE TELEMETRY STREAM
                </h3>
              </div>
              <span className="text-[10px] font-mono-code text-slate-400">
                100 HZ DOWNLINK
              </span>
            </div>
            <TelemetryCards
              telemetry={telemetry}
              activeFault={activeFault}
              stage={stage}
            />
          </div>

          {/* Autonomous Recovery Engine Panel */}
          <div className="flex-1 min-h-[320px]">
            <AgenticPipeline
              stage={stage}
              activeFault={activeFault}
              scenario={activeScenario}
              logs={logs}
              anomalyScore={anomalyScore}
              evaluatedCandidatesCount={candidates.length || 6}
              selectedConfigId={selectedConfig?.id}
            />
          </div>
        </div>
      </div>

      {/* Bottom Full-Width Section: Candidate Configuration Constraint Evaluation */}
      <div className="w-full">
        <ConfigurationEvaluator
          candidates={candidates.length > 0 ? candidates : FAULT_SCENARIOS.power.candidates}
          selectedConfigId={selectedConfig?.id || activeConfigId}
          stage={stage}
          onSelectManualCandidate={(cand) => {
            addLog(`Evaluated candidate configuration: ${cand.id} (${cand.name})`, 'info', 'UI');
          }}
        />
      </div>

      {/* Judge Demo Choreographed Controller Overlay */}
      <JudgeDemoController
        isActive={isJudgeDemo}
        stepIndex={judgeStep}
        totalSteps={9}
        stepDescription={judgeStepDescriptions[judgeStep - 1] || 'Executing'}
        isPaused={isJudgePaused}
        onStart={() => setIsJudgePaused(false)}
        onPauseToggle={() => setIsJudgePaused(!isJudgePaused)}
        onSkip={() => {
          if (judgeStep < 9) {
            setJudgeStep((prev) => prev + 1);
          } else {
            setIsJudgeDemo(false);
          }
        }}
        onRestart={startJudgeDemo}
        onClose={() => setIsJudgeDemo(false)}
      />
    </div>
  );
};
