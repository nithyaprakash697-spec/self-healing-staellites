import React, { useState } from 'react';
import { 
  Activity, 
  Search, 
  AlertCircle, 
  Cpu, 
  Layers, 
  Wrench, 
  ShieldCheck, 
  ChevronRight, 
  ArrowDown, 
  Info,
  Clock,
  Code2,
  CheckCircle2
} from 'lucide-react';

interface ArchitectureNode {
  id: string;
  number: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  runtimeLatency: string;
  algorithm: string;
  summary: string;
  technicalDetails: string[];
  inputs: string;
  outputs: string;
}

export const ArchitectureView: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('decision');

  const nodes: ArchitectureNode[] = [
    {
      id: 'telemetry',
      number: '01',
      name: 'SATELLITE TELEMETRY',
      icon: Activity,
      runtimeLatency: '10 ms / cycle',
      algorithm: 'Time-Series Frame Synchronizer & Kalman Filter',
      summary: 'Ingests high-rate 100 Hz analog and digital sensor streams from EPS, TCS, ADCS, and COMM buses into an in-memory ring buffer.',
      technicalDetails: [
        'Sample rate: 100 Hz synchronized over redundant MIL-STD-1553 / CAN bus',
        'Noise filtering via Extended Kalman Filter (EKF) with covariance bounds',
        'State vector dimension: 64 continuous telemetry state variables',
        'Telemetry sanity validator filters out transmission dropouts before analysis',
      ],
      inputs: 'Raw sensor voltages, temperatures, quaternions, wheel tachometers, RF RSSI',
      outputs: 'Normalized state estimate vector x̂(t) with uncertainty covariance P(t)',
    },
    {
      id: 'detection',
      number: '02',
      name: 'FAULT DETECTION',
      icon: Search,
      runtimeLatency: '35 ms',
      algorithm: 'Multi-Variate Statistical Residual & Autoencoder Anomaly Detector',
      summary: 'Detects anomalies instantaneously by evaluating deviations between physical model predictions and observed sensor residuals.',
      technicalDetails: [
        'Dual-tier detection: Fast 3-sigma statistical residual threshold + Deep Autoencoder reconstruction error',
        'Dynamically adaptive sensitivity thresholds prevent false trips during solar eclipse transits',
        'Detection latency: < 80 milliseconds from anomaly onset',
        'Anomaly Score metric normalized: S_anom ∈ [0.0, 1.0]',
      ],
      inputs: 'State estimate vector x̂(t)',
      outputs: 'Anomaly Detection Flag & continuous Anomaly Score S_anom',
    },
    {
      id: 'isolation',
      number: '03',
      name: 'FAULT ISOLATION',
      icon: AlertCircle,
      runtimeLatency: '85 ms',
      algorithm: 'Subsystem Dependency Graph & Causal Bayesian Network',
      summary: 'Pinpoints the exact hardware component or string at fault, decoupling root causes from downstream secondary symtoms.',
      technicalDetails: [
        'Traverses directed acyclic graph (DAG) of spacecraft physical interdependencies',
        'Differentiates root cause (e.g., solar string short) from symptoms (e.g., battery drain rate spike)',
        'Component isolation matrix: EPS PDU channels, TCS louvers, ADCS flywheels, Star Trackers, RF transponders',
        'Subsystem health status transitions: Nominal → Degraded → Critical',
      ],
      inputs: 'Anomaly signature, residual vectors, circuit status flags',
      outputs: 'Identified failed component ID, fault mode, and isolated health state',
    },
    {
      id: 'decision',
      number: '04',
      name: 'AGENTIC DECISION ENGINE',
      icon: Cpu,
      runtimeLatency: '320 ms',
      algorithm: 'Finite-Horizon Markov Decision Process (MDP) with Heuristic Pruning',
      summary: 'The central executive that coordinates autonomous decision-making without human ground station delay, prioritizing spacecraft survivability.',
      technicalDetails: [
        'Formulated as an on-board deterministic Goal-Oriented Recovery Policy',
        'Hierarchical state machine triggers multi-objective optimization',
        'Enforces hard mission invariants (minimum survival power, attitude stabilization, thermal balance)',
        'Zero cloud dependency: Runs on embedded dual-core rad-hard processor (LEON4 / ARM Cortex-R5)',
      ],
      inputs: 'Fault isolation report, system degradation state, mission orbital phase',
      outputs: 'Recovery objectives, active constraint boundaries, candidate configuration candidates',
    },
    {
      id: 'evaluation',
      number: '05',
      name: 'CONFIGURATION EVALUATION',
      icon: Layers,
      runtimeLatency: '180 ms',
      algorithm: 'Constraint Satisfaction Problem (CSP) & Multi-Objective Pareto Solver',
      summary: 'Evaluates candidate hardware reconfigurations against 5 hard physical constraints: Power, Thermal, Comm, Attitude, and Resources.',
      technicalDetails: [
        'Exhaustive / branch-and-bound evaluation of candidate configurations C-01 through C-16',
        'Hard safety constraint pruning: Rejects candidates with negative thermal margins or overcurrent risks',
        'Pareto frontier ranking chooses the configuration maximizing mission continuity',
        'Audit trail generation: Every rejected candidate logs explicit reason for explainability',
      ],
      inputs: 'Candidate configuration topologies {C_1, ..., C_n}',
      outputs: 'Pareto-optimal safe configuration C* with feasibility score',
    },
    {
      id: 'reconfiguration',
      number: '06',
      name: 'SAFE RECONFIGURATION',
      icon: Wrench,
      runtimeLatency: '450 ms',
      algorithm: 'Atomic Sequence Executor with Rollback State Machine',
      summary: 'Executes commanded hardware relay switches, redundant component cross-strapping, and sensor fusion recalibration.',
      technicalDetails: [
        'Atomic step sequence guarantees no intermediate invalid power states or bus shorts',
        'Solid-state latching relay commands, cross-bus tie closures, and backup payload routing',
        'Reaction wheel desaturation via magnetorquers and attitude slew compensation',
        'Automatic rollback to safe hold if any hardware relay fails to acknowledge within 50ms',
      ],
      inputs: 'Selected configuration C* action script',
      outputs: 'Hardware command execution verification flags, updated active configuration ID',
    },
    {
      id: 'verification',
      number: '07',
      name: 'RECOVERY VERIFICATION',
      icon: ShieldCheck,
      runtimeLatency: '1200 ms',
      algorithm: 'Lyapunov Stability Convergence & Post-Action Telemetry Audit',
      summary: 'Monitors real-time telemetry over subsequent epochs to prove that thermal, electrical, and attitude variables return to safe bounds.',
      technicalDetails: [
        'Two-epoch convergence check: Verifies dV/dt, dT/dt, and attitude pointing error dθ/dt are negative',
        'Confirms nominal system equilibrium before clearing warning flags',
        'Transitions state machine to NOMINAL / RECOVERED',
        'Transmits compact recovery telemetry report packet on next ground station downlink pass',
      ],
      inputs: 'Post-reconfiguration continuous telemetry stream x̂(t_post)',
      outputs: 'Formal Recovery Proof Flag, System Status = NOMINAL, Mission Continuity Resumed',
    },
  ];

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || nodes[3];

  return (
    <div className="flex flex-col gap-4 w-full max-w-[1720px] mx-auto pb-10">
      {/* Top Header */}
      <div className="hud-panel rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-code">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h2 className="font-display font-bold text-sm text-slate-100 uppercase tracking-wider">
              FUSE-X SYSTEM ARCHITECTURE & AUTONOMOUS PIPELINE
            </h2>
          </div>
          <span className="text-[10px] text-slate-400 border-l border-slate-800 pl-3 hidden md:inline">
            CLOSED-LOOP EMBEDDED DECISION ENGINE FOR SPACECRAFT SURVIVABILITY
          </span>
        </div>

        <div className="text-[10px] font-mono-code text-cyan-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
          CLICK ANY PIPELINE BLOCK TO INSPECT ALGORITHM & SPECS
        </div>
      </div>

      {/* Interactive Architecture Flow Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Pipeline Nodes List (7 Steps) */}
        <div className="lg:col-span-5 flex flex-col gap-2">
          {nodes.map((node, idx) => {
            const isSelected = node.id === selectedNodeId;
            const Icon = node.icon;

            return (
              <React.Fragment key={node.id}>
                <button
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`p-3 rounded-lg border text-left transition-all text-xs font-mono-code flex items-center justify-between group ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-400/80 text-cyan-100 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/40'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-cyan-400/80 font-bold text-xs">{node.number}</span>
                    <div className="p-1.5 rounded bg-slate-950 border border-slate-800 text-cyan-400 group-hover:text-cyan-300">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs tracking-wider text-slate-100 group-hover:text-cyan-200">
                        {node.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                        {node.algorithm}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono-code text-slate-500 hidden sm:inline">
                      {node.runtimeLatency}
                    </span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600'}`} />
                  </div>
                </button>

                {/* Arrow connector between steps */}
                {idx < nodes.length - 1 && (
                  <div className="flex justify-center -my-1 text-slate-600">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Selected Node Technical Deep Dive Detail Card */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="hud-panel rounded-lg p-5 flex flex-col justify-between h-full text-xs font-mono-code">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-950/70 border border-cyan-500/50 text-cyan-300">
                    {React.createElement(selectedNode.icon, { className: 'w-6 h-6' })}
                  </div>
                  <div>
                    <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                      STAGE {selectedNode.number} ARCHITECTURE BLOCK
                    </span>
                    <h3 className="text-base font-bold font-display uppercase tracking-wider text-slate-100">
                      {selectedNode.name}
                    </h3>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">EXECUTION BUDGET</span>
                  <span className="text-xs font-bold text-cyan-300">{selectedNode.runtimeLatency}</span>
                </div>
              </div>

              {/* Algorithm & Summary */}
              <div className="mb-4 space-y-2">
                <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5 uppercase tracking-wide">
                    PRIMARY ALGORITHMIC ENGINE:
                  </span>
                  <span className="text-xs font-semibold text-cyan-300">
                    {selectedNode.algorithm}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded border border-slate-800/60">
                  {selectedNode.summary}
                </p>
              </div>

              {/* Technical Specifications Checklist */}
              <div className="mb-4">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-2 font-bold">
                  ARCHITECTURAL SPECIFICATIONS & CONSTRAINTS:
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {selectedNode.technicalDetails.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Inputs & Outputs footer */}
            <div className="pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-500 block text-[9.5px] uppercase">STAGE INPUTS</span>
                <span className="text-slate-300">{selectedNode.inputs}</span>
              </div>
              <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-cyan-400 block text-[9.5px] uppercase">STAGE OUTPUTS</span>
                <span className="text-cyan-200">{selectedNode.outputs}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
