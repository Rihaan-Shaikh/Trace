export type View =
  | 'home'
  | 'data'
  | 'semantic-map'
  | 'data-health'
  | 'investigation'
  | 'decision-brief'
  | 'sandbox'
  | 'approval'
  | 'decision-record'
  | 'ledger'
  | 'rate-card';

export type Verdict =
  | 'Recommended with conditions'
  | 'Refer'
  | 'Decline'
  | 'Approved';

export type CoverageState = 'covered' | 'near-lapse' | 'lapsed' | 'unknown';

export type EvidenceLevel = 'Fact' | 'Calculation' | 'Model' | 'Recommendation';

export interface EvidenceNode {
  id: string;
  label: string;
  value?: string;
  level: EvidenceLevel;
  children?: EvidenceNode[];
}

export interface DataFile {
  name: string;
  rows: string;
  fields: string;
  status: 'mapped' | 'pending';
}

export interface SemanticEntity {
  id: string;
  name: string;
  x: number;
  y: number;
  connectedTo: string[];
}

export interface MetricDefinition {
  id: string;
  name: string;
  definition: string;
  editable: boolean;
}

export interface DataFinding {
  id: string;
  metric: string;
  value: string;
  description: string;
  action: string;
  impact: string;
  severity: 'low' | 'medium' | 'high';
}

export interface InvestigationStage {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed';
  output?: string;
}

export interface ExposureMetric {
  label: string;
  value: string;
  sublabel?: string;
}

export interface CoverageCondition {
  id: string;
  label: string;
  currentValue: string;
  currentNumeric: number;
  lapseValue: string;
  lapseNumeric: number;
  unit: string;
  direction: 'above' | 'below';
  state: CoverageState;
  distance: string;
  description: string;
}

export interface CounterFinding {
  id: string;
  statement: string;
  magnitude?: string;
}

export interface ScrutinyStep {
  stage: string;
  content: string;
}

export interface SandboxAssumptions {
  segmentChurn: number;
  priceChange: number;
  retention: number;
  topAccountsLost: number;
}

export interface DecisionCalc {
  premium: number;
  premiumRate: number;
  projectedUpside: number;
  netLossProbability: number;
  verdict: Verdict;
  coverageState: CoverageState;
  exposure: {
    p10: number;
    avgWorst10: number;
    worstPlausible: number;
    concentration: string;
    dataExposure: number;
  };
}

export interface LedgerEntry {
  id: string;
  decision: string;
  predictedPremium: string;
  exposure: string;
  outcome: 'Pending' | 'Within' | 'Exceeded';
  actualResult: string;
  variance: string;
  simulated: boolean;
}

export interface RateDriver {
  id: string;
  name: string;
  weight: number;
  threshold: string;
  description: string;
}
