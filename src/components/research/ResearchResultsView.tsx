import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  Award,
  Layers,
  ArrowUpRight,
  Database
} from 'lucide-react';

interface ExperimentMetric {
  model: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  falseAlarmRate: number;
  missRate: number;
  isFuseX?: boolean;
}

export const ResearchResultsView: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<'f1' | 'accuracy' | 'recall' | 'falseAlarmRate'>('f1');

  // Experiment A: Fault Detection & Isolation Comparative Data
  const experimentAData: ExperimentMetric[] = [
    {
      model: 'Statistical 3-Sigma Threshold',
      accuracy: 81.4,
      precision: 79.2,
      recall: 76.5,
      f1: 77.8,
      falseAlarmRate: 14.2,
      missRate: 23.5,
    },
    {
      model: 'Isolation Forest (Unsupervised)',
      accuracy: 88.6,
      precision: 85.1,
      recall: 89.2,
      f1: 87.1,
      falseAlarmRate: 9.8,
      missRate: 10.8,
    },
    {
      model: 'Hybrid Rule-Based / SVM',
      accuracy: 92.1,
      precision: 90.8,
      recall: 91.4,
      f1: 91.1,
      falseAlarmRate: 6.4,
      missRate: 8.6,
    },
    {
      model: 'FUSE-X Agentic Pipeline (Ours)',
      accuracy: 98.7,
      precision: 98.2,
      recall: 99.1,
      f1: 98.6,
      falseAlarmRate: 1.2,
      missRate: 0.9,
      isFuseX: true,
    },
  ];

  return (
    <div className="flex flex-col gap-5 w-full max-w-[1720px] mx-auto pb-10">
      {/* Header & Disclaimers */}
      <div className="hud-panel rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-code">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h2 className="font-display font-bold text-sm text-slate-100 uppercase tracking-wider">
              SECTION A: EMPIRICAL RESEARCH RESULTS & BENCHMARK VALIDATION
            </h2>
          </div>
          <span className="text-[10px] text-slate-400 border-l border-slate-800 pl-3 hidden md:inline">
            AEROSPACE AUTONOMY BENCHMARK SUITE · 120 ORBITAL STOCHASTIC RUNS
          </span>
        </div>

        {/* Live vs Research Data Indicator (Section 12 requirement) */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 border border-cyan-500/30 text-[11px] font-mono-code text-cyan-300">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span>ORIGINAL FUSE-X BENCHMARK DATASET (AUTHORITATIVE)</span>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="p-2.5 rounded bg-blue-950/30 border border-blue-500/30 text-xs font-mono-code text-blue-200/90 flex items-center justify-between">
        <span>
          ℹ️ <strong>SOURCE OF TRUTH:</strong> This section displays the authoritative, peer-reviewed empirical results from FUSE-X Experiment A and Experiment B. Interactive live runs in the Mission Control tab use the same reconfiguration logic but do not alter this finalized benchmark dataset.
        </span>
      </div>

      {/* EXPERIMENT A: FAULT DETECTION & ISOLATION */}
      <div className="hud-panel rounded-lg p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono-code px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                EXPERIMENT A
              </span>
              <h3 className="text-sm font-bold font-display uppercase tracking-wider text-slate-100">
                FAULT DETECTION & ISOLATION BENCHMARK
              </h3>
            </div>
            <p className="text-[11px] font-mono-code text-slate-400 mt-1">
              Comparative evaluation across 4 methodologies on multi-subsystem telemetry dataset (N = 5,000 fault injections).
            </p>
          </div>

          {/* Metric Selector Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono-code">
            <button
              onClick={() => setSelectedMetric('f1')}
              className={`px-2.5 py-1 rounded transition-colors ${selectedMetric === 'f1' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'}`}
            >
              F1-Score
            </button>
            <button
              onClick={() => setSelectedMetric('accuracy')}
              className={`px-2.5 py-1 rounded transition-colors ${selectedMetric === 'accuracy' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'}`}
            >
              Accuracy
            </button>
            <button
              onClick={() => setSelectedMetric('recall')}
              className={`px-2.5 py-1 rounded transition-colors ${selectedMetric === 'recall' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'}`}
            >
              Recall
            </button>
            <button
              onClick={() => setSelectedMetric('falseAlarmRate')}
              className={`px-2.5 py-1 rounded transition-colors ${selectedMetric === 'falseAlarmRate' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'}`}
            >
              False Alarm Rate
            </button>
          </div>
        </div>

        {/* Visual Comparative Bars */}
        <div className="space-y-3 my-2">
          {experimentAData.map((item) => {
            const val = item[selectedMetric];
            const isFuseX = item.isFuseX;
            const isLowerBetter = selectedMetric === 'falseAlarmRate';

            return (
              <div
                key={item.model}
                className={`p-3 rounded-lg border transition-all ${
                  isFuseX
                    ? 'bg-cyan-950/30 border-cyan-400/80 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                    : 'bg-slate-950/40 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono-code mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${isFuseX ? 'text-cyan-300' : 'text-slate-200'}`}>
                      {item.model}
                    </span>
                    {isFuseX && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-900 text-cyan-200 font-bold border border-cyan-600">
                        OUR SYSTEM
                      </span>
                    )}
                  </div>
                  <span className={`text-sm font-bold ${isFuseX ? 'text-cyan-300' : 'text-slate-300'}`}>
                    {val.toFixed(1)}%
                  </span>
                </div>

                {/* Progress track */}
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${
                      isFuseX
                        ? isLowerBetter ? 'bg-emerald-400' : 'bg-cyan-400'
                        : isLowerBetter ? 'bg-rose-500' : 'bg-slate-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(3, val))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Metrics Table */}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs font-mono-code">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                <th className="py-2 px-3">ARCHITECTURE</th>
                <th className="py-2 px-2 text-right">ACCURACY</th>
                <th className="py-2 px-2 text-right">PRECISION</th>
                <th className="py-2 px-2 text-right">RECALL</th>
                <th className="py-2 px-2 text-right">F1-SCORE</th>
                <th className="py-2 px-2 text-right text-rose-400">FALSE ALARM</th>
                <th className="py-2 px-2 text-right text-amber-400">MISS RATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {experimentAData.map((row) => (
                <tr
                  key={row.model}
                  className={row.isFuseX ? 'bg-cyan-950/20 font-bold text-cyan-200' : 'text-slate-300'}
                >
                  <td className="py-2.5 px-3 flex items-center gap-1.5">
                    {row.isFuseX && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                    <span>{row.model}</span>
                  </td>
                  <td className="py-2.5 px-2 text-right">{row.accuracy}%</td>
                  <td className="py-2.5 px-2 text-right">{row.precision}%</td>
                  <td className="py-2.5 px-2 text-right">{row.recall}%</td>
                  <td className="py-2.5 px-2 text-right text-cyan-400">{row.f1}%</td>
                  <td className="py-2.5 px-2 text-right text-rose-300">{row.falseAlarmRate}%</td>
                  <td className="py-2.5 px-2 text-right text-amber-300">{row.missRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EXPERIMENT B: RECONFIGURATION & RECOVERY */}
      <div className="hud-panel rounded-lg p-4 flex flex-col gap-3">
        <div className="pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono-code px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
              EXPERIMENT B
            </span>
            <h3 className="text-sm font-bold font-display uppercase tracking-wider text-slate-100">
              RECONFIGURATION & AUTONOMOUS RECOVERY METRICS
            </h3>
          </div>
          <p className="text-[11px] font-mono-code text-slate-400 mt-1">
            Empirical test campaign evaluating multi-subsystem topology recovery success rate.
          </p>
        </div>

        {/* Big Numbers Grid (Section 11 requirement) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono-code">
            <span className="text-slate-500 block text-[10px]">TOTAL FAULT EVENTS</span>
            <span className="text-2xl font-bold font-mono-code text-slate-100">120</span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Full HIL Test Matrix</span>
          </div>

          <div className="p-3 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono-code">
            <span className="text-slate-500 block text-[10px]">SUCCESSFUL EVENTS</span>
            <span className="text-2xl font-bold font-mono-code text-emerald-400">118</span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Autonomous recovery</span>
          </div>

          <div className="p-3 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono-code">
            <span className="text-slate-500 block text-[10px]">OVERALL SUCCESS RATE</span>
            <span className="text-2xl font-bold font-mono-code text-cyan-300">98.33%</span>
            <span className="text-[10px] text-emerald-400 mt-0.5 block">Pass criteria met</span>
          </div>

          <div className="p-3 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono-code">
            <span className="text-slate-500 block text-[10px]">MEAN RECOVERY TIME</span>
            <span className="text-2xl font-bold font-mono-code text-cyan-400">1.18 steps</span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">~1.18 simulation steps</span>
          </div>
        </div>

        {/* Breakdown: In-Envelope vs Stress Events */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1 text-xs font-mono-code">
          {/* In-Envelope */}
          <div className="p-3 rounded bg-emerald-950/20 border border-emerald-500/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-emerald-300 uppercase">IN-ENVELOPE EVENTS</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700 font-bold">
                  100.0% SUCCESS
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Single and dual correlated subsystem anomalies within nominal redundant hardware topology design limits.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-emerald-800/40 flex justify-between text-slate-300">
              <span>Total Tested: 107</span>
              <span className="text-emerald-400 font-bold">Successful: 107 / 107</span>
            </div>
          </div>

          {/* Stress Events */}
          <div className="p-3 rounded bg-amber-950/20 border border-amber-500/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-amber-300 uppercase">SEVERE STRESS EVENTS</span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700 font-bold">
                  84.62% SUCCESS
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Multi-point cascading failure boundaries near physical spacecraft limits (micrometeorite & multiple simultaneous bus breaks).
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-amber-800/40 flex justify-between text-slate-300">
              <span>Total Tested: 13</span>
              <span className="text-amber-300 font-bold">Successful: 11 / 13 (2 Safe Fails)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
