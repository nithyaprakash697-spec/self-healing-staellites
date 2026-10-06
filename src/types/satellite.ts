export type FaultType = 
  | 'none'
  | 'power'
  | 'communication'
  | 'thermal'
  | 'attitude'
  | 'sensor'
  | 'stress'
  | 'random'
  | 'unrecoverable_stress';

export type PipelineStage = 
  | 'IDLE'
  | 'OBSERVE'
  | 'DETECT'
  | 'ISOLATE'
  | 'EVALUATE'
  | 'SELECT'
  | 'RECONFIGURE'
  | 'VERIFY'
  | 'RECOVERED'
  | 'FAILED';

export interface TelemetryData {
  busVoltage: number;        // Volts (nominal: 28.0 - 28.4V)
  busCurrent: number;        // Amperes (nominal: 14.5 - 15.2A)
  batterySoc: number;        // % (nominal: 92 - 98%)
  coreTemp: number;          // °C (nominal: 18 - 25°C)
  radiatorTemp: number;      // °C (nominal: -10 - 15°C)
  cpuLoad: number;           // % (nominal: 25 - 40%)
  attitudeError: number;     // degrees (nominal: < 0.1°)
  commMargin: number;        // dB (nominal: 12 - 15 dB)
  powerMargin: number;       // % (nominal: 42 - 50%)
  solarGeneration: number;   // Watts (nominal: 850 - 900W)
  adcsRpm: number;           // RPM of reaction wheels (nominal: 2400 - 3200)
}

export interface SubsystemHealth {
  power: 'nominal' | 'degraded' | 'critical' | 'reconfigured';
  communication: 'nominal' | 'degraded' | 'critical' | 'reconfigured';
  thermal: 'nominal' | 'degraded' | 'critical' | 'reconfigured';
  attitude: 'nominal' | 'degraded' | 'critical' | 'reconfigured';
  sensors: 'nominal' | 'degraded' | 'critical' | 'reconfigured';
  obc: 'nominal' | 'degraded' | 'critical' | 'reconfigured';
}

export interface CandidateConfig {
  id: string;
  name: string;
  status: 'safe' | 'rejected' | 'evaluating' | 'selected';
  rejectionReason?: string;
  powerMargin: number;       // %
  thermalMargin: number;     // %
  commBandwidth: number;     // %
  attitudeStability: number; // %
  resourceAvailability: number; // %
  feasibilityScore: number;  // 0 - 100
  actions: string[];
}

export interface LogMessage {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success' | 'ai';
  source: string;
  message: string;
}

export interface SimulationState {
  stage: PipelineStage;
  activeFault: FaultType;
  subsystemHealth: SubsystemHealth;
  activeConfigId: string;
  telemetry: TelemetryData;
  candidateConfigs: CandidateConfig[];
  selectedConfig: CandidateConfig | null;
  logs: LogMessage[];
  anomalyScore: number; // 0.0 - 1.0
  autoRunStep: number;
  isJudgeDemoActive: boolean;
  demoProgress: number; // 0 - 100
  isSoundEnabled: boolean;
  activeCameraTarget: 'orbit' | 'diagnostic' | 'cinematic' | 'recovery' | 'wide' | 'bus' | 'solar' | 'antenna' | 'adcs' | 'thermal' | 'sensor' | 'obc';
}
