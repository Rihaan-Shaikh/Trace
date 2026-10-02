import type {
  DataFile,
  SemanticEntity,
  MetricDefinition,
  DataFinding,
  InvestigationStage,
  ExposureMetric,
  CoverageCondition,
  CounterFinding,
  ScrutinyStep,
  SandboxAssumptions,
  DecisionCalc,
  LedgerEntry,
  RateDriver,
  EvidenceNode,
  Verdict,
  CoverageState,
} from './types';

export const NOVAMART_FILES: DataFile[] = [
  { name: 'customers.csv', rows: '24,982', fields: '14', status: 'mapped' },
  { name: 'transactions.csv', rows: '186,403', fields: '11', status: 'mapped' },
  { name: 'products.csv', rows: '3,418', fields: '9', status: 'mapped' },
  { name: 'regions.csv', rows: '12', fields: '6', status: 'mapped' },
  { name: 'campaigns.csv', rows: '847', fields: '8', status: 'mapped' },
];

export const SEMANTIC_ENTITIES: SemanticEntity[] = [
  { id: 'customer', name: 'Customer', x: 50, y: 15, connectedTo: ['transaction', 'region'] },
  { id: 'product', name: 'Product', x: 72, y: 50, connectedTo: ['transaction'] },
  { id: 'transaction', name: 'Transaction', x: 50, y: 50, connectedTo: ['customer', 'product', 'campaign'] },
  { id: 'region', name: 'Region', x: 28, y: 50, connectedTo: ['transaction'] },
  { id: 'campaign', name: 'Campaign', x: 50, y: 85, connectedTo: ['transaction'] },
];

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  { id: 'revenue', name: 'Revenue', definition: 'Gross transaction value before discounts.', editable: false },
  { id: 'gross-margin', name: 'Gross margin', definition: 'Revenue minus cost of goods sold, as a percentage of revenue.', editable: false },
  { id: 'discount-depth', name: 'Discount depth', definition: 'Average discount percentage applied per order.', editable: false },
  { id: 'low-margin', name: 'Low-margin customer', definition: 'Gross margin below 18% over the trailing 90 days.', editable: true },
  { id: 'active-customer', name: 'Active customer', definition: 'At least one transaction in the trailing 90 days.', editable: true },
  { id: 'churn', name: 'Churn', definition: 'No transaction in 90+ days after being active in the prior period.', editable: false },
  { id: 'order-frequency', name: 'Order frequency', definition: 'Average orders per active customer per quarter.', editable: false },
];

export const DATA_FINDINGS: DataFinding[] = [
  {
    id: 'duplicates',
    metric: 'duplicate customer records',
    value: '3.7%',
    description: '3.7% of customer records appear duplicated across regional tables.',
    action: 'Deduplicated view used for analysis.',
    impact: 'Adds to Decision Premium.',
    severity: 'medium',
  },
  {
    id: 'missing-industry',
    metric: 'missing industry values',
    value: '8.4%',
    description: '8.4% of customer records have no industry classification.',
    action: 'Imputed from regional distribution.',
    impact: 'Adds to Decision Premium.',
    severity: 'medium',
  },
  {
    id: 'staleness',
    metric: 'staleness in regional data',
    value: '14 days',
    description: 'Regional sales data is 14 days stale relative to transactions.',
    action: 'Regional analysis uses a 14-day lookback buffer.',
    impact: 'Adds to Decision Premium.',
    severity: 'low',
  },
  {
    id: 'orphans',
    metric: 'orphan transactions',
    value: '1.2%',
    description: '1.2% of transactions have no matching customer record.',
    action: 'Excluded from customer-level analysis.',
    impact: 'Adds to Decision Premium.',
    severity: 'low',
  },
];

export const INVESTIGATION_STAGES: InvestigationStage[] = [
  { id: 'data-check', name: 'Data check', status: 'completed', output: '4 data-quality findings flagged. Deduplicated view used.' },
  { id: 'segmentation', name: 'Segmentation', status: 'completed', output: '2,847 low-margin customers identified. 14.2% of active base.' },
  { id: 'margin-analysis', name: 'Margin analysis', status: 'completed', output: 'Stopping discounts recovers $1.20M in projected upside over 4 quarters.' },
  { id: 'churn-analysis', name: 'Churn analysis', status: 'completed', output: 'Segment churn at 3.1%. Three contracted accounts show falling order frequency.' },
  { id: 'scenario-modelling', name: 'Scenario modelling', status: 'completed', output: 'P10 outcome −$18K. Average worst 10% −$0.47M. Worst plausible −$0.62M.' },
  { id: 'contradiction-check', name: 'Contradiction check', status: 'completed', output: 'Three contracted accounts materially change the initial recommendation.' },
  { id: 'underwriting', name: 'Underwriting', status: 'completed', output: 'Decision Premium $96K. 8.0% of projected upside. Recommended with conditions.' },
];

export const EXPOSURE_METRICS: ExposureMetric[] = [
  { label: 'Probability of net loss', value: '≈ 10%' },
  { label: 'P10 outcome', value: '−$18K' },
  { label: 'Average worst 10%', value: '−$0.47M' },
  { label: 'Worst plausible case', value: '−$0.62M' },
  { label: 'Concentration', value: 'Top 3 accounts = 41%' },
  { label: 'Data exposure', value: 'Up to −$40K' },
];

export const COUNTER_FINDINGS: CounterFinding[] = [
  {
    id: 'cf1',
    statement: 'Three contracted accounts limit the achievable upside.',
    magnitude: 'Potential upside overstated by ≈ $210K.',
  },
  {
    id: 'cf2',
    statement: 'Two high-discount accounts show falling order frequency.',
    magnitude: 'Churn risk understated by ≈ 1.4 points.',
  },
  {
    id: 'cf3',
    statement: 'Competitor response is not observable from current data.',
  },
];

export const SCRUTINY_STEPS: ScrutinyStep[] = [
  { stage: 'Initial recommendation', content: 'Stop all low-margin discounts.' },
  { stage: 'Counter-evidence', content: 'Three contracted accounts cannot be included in the blanket stop.' },
  { stage: 'Final recommendation', content: 'Stop discounts for the non-contracted low-margin segment.' },
];

export const RATE_DRIVERS: RateDriver[] = [
  { id: 'data-quality', name: 'Data quality', weight: 25, threshold: '< 5% issues', description: 'Premium increases with duplicate records, missing values, and data staleness.' },
  { id: 'verification', name: 'Verification', weight: 20, threshold: 'Verified sources', description: 'Premium increases when evidence cannot be traced to source records.' },
  { id: 'contradiction', name: 'Contradiction', weight: 30, threshold: '< 2 conflicts', description: 'Premium increases when counter-evidence materially changes the recommendation.' },
  { id: 'model-uncertainty', name: 'Model uncertainty', weight: 25, threshold: 'Scenario spread', description: 'Premium increases with the spread between median and worst-plausible outcomes.' },
];

export const LEDGER_ENTRIES: LedgerEntry[] = [
  {
    id: 'led-1',
    decision: 'Increase premium tier pricing',
    predictedPremium: '$112K',
    exposure: '−$0.38M',
    outcome: 'Within',
    actualResult: '−$0.21M',
    variance: '+$0.17M',
    simulated: true,
  },
  {
    id: 'led-2',
    decision: 'Exit underperforming region',
    predictedPremium: '$78K',
    exposure: '−$0.29M',
    outcome: 'Exceeded',
    actualResult: '−$0.41M',
    variance: '−$0.12M',
    simulated: true,
  },
  {
    id: 'led-3',
    decision: 'Consolidate supplier base',
    predictedPremium: '$54K',
    exposure: '−$0.19M',
    outcome: 'Within',
    actualResult: '−$0.08M',
    variance: '+$0.11M',
    simulated: true,
  },
  {
    id: 'led-4',
    decision: 'Reduce free shipping threshold',
    predictedPremium: '$67K',
    exposure: '−$0.24M',
    outcome: 'Within',
    actualResult: '−$0.18M',
    variance: '+$0.06M',
    simulated: true,
  },
  {
    id: 'led-5',
    decision: 'Launch loyalty programme',
    predictedPremium: '$89K',
    exposure: '−$0.33M',
    outcome: 'Pending',
    actualResult: '—',
    variance: '—',
    simulated: true,
  },
  {
    id: 'led-6',
    decision: 'Shift ad spend to retargeting',
    predictedPremium: '$43K',
    exposure: '−$0.15M',
    outcome: 'Within',
    actualResult: '−$0.10M',
    variance: '+$0.05M',
    simulated: true,
  },
];

export const EVIDENCE_CHAIN_PREMIUM: EvidenceNode = {
  id: 'root',
  label: 'Decision Premium',
  value: '$96K',
  level: 'Recommendation',
  children: [
    {
      id: 'expected-loss',
      label: 'Expected loss',
      value: '$47K',
      level: 'Calculation',
      children: [
        {
          id: 'scenario-dist',
          label: 'Scenario distribution',
          value: '1,000 trials',
          level: 'Model',
          children: [
            { id: 'p10', label: 'P10 outcome', value: '−$18K', level: 'Calculation' },
            { id: 'avg-worst', label: 'Average worst 10%', value: '−$0.47M', level: 'Calculation' },
            { id: 'worst', label: 'Worst plausible', value: '−$0.62M', level: 'Calculation' },
          ],
        },
      ],
    },
    {
      id: 'verification',
      label: 'Verification',
      value: 'Verified',
      level: 'Fact',
      children: [
        { id: 'source-records', label: 'Source records', value: '24,982 customers · 186,403 transactions', level: 'Fact' },
        { id: 'assumptions', label: 'Assumptions', value: '4 assumptions logged', level: 'Model' },
        { id: 'data-flags', label: 'Data-quality flags', value: '4 findings · $40K exposure', level: 'Fact' },
      ],
    },
  ],
};

export const EVIDENCE_CHAIN_EXPOSURE: EvidenceNode = {
  id: 'root-exp',
  label: 'Exposure report',
  value: '−$0.62M worst',
  level: 'Model',
  children: [
    { id: 'prob-loss', label: 'Probability of net loss', value: '≈ 10%', level: 'Calculation' },
    { id: 'conc', label: 'Concentration', value: 'Top 3 = 41%', level: 'Calculation', children: [
      { id: 'conc-source', label: 'Source', value: 'Transaction ledger, trailing 90 days', level: 'Fact' },
    ] },
    { id: 'data-exp', label: 'Data exposure', value: 'Up to −$40K', level: 'Calculation' },
  ],
};

export const EVIDENCE_CHAIN_COUNTER: EvidenceNode = {
  id: 'root-counter',
  label: 'Counter-decision',
  value: '3 findings',
  level: 'Recommendation',
  children: [
    { id: 'cf-contract', label: 'Contracted accounts', value: '3 accounts · ≈$210K overstated', level: 'Fact' },
    { id: 'cf-churn', label: 'Order frequency decline', value: '2 accounts · 1.4 pts', level: 'Fact' },
    { id: 'cf-comp', label: 'Competitor response', value: 'Unknown', level: 'Model' },
  ],
};

// ── Sandbox calculation model ──────────────────────────────────────────────

const BASELINE: DecisionCalc = {
  premium: 96_000,
  premiumRate: 8.0,
  projectedUpside: 1_200_000,
  netLossProbability: 10,
  verdict: 'Recommended with conditions',
  coverageState: 'covered',
  exposure: {
    p10: -18_000,
    avgWorst10: -470_000,
    worstPlausible: -620_000,
    concentration: 'Top 3 accounts = 41%',
    dataExposure: -40_000,
  },
};

const LAPSE_THRESHOLD = 6.2;

export function computeDecision(assumptions: SandboxAssumptions): DecisionCalc {
  const { segmentChurn, priceChange, retention, topAccountsLost } = assumptions;

  // Churn impact: premium grows non-linearly as churn approaches and exceeds threshold
  const churnRatio = segmentChurn / LAPSE_THRESHOLD;
  const churnFactor = churnRatio < 1
    ? 1 + Math.pow(churnRatio, 2) * 0.8
    : 1.8 + Math.pow(churnRatio - 1, 1.5) * 2.5;

  // Price change impact: positive price change increases upside but also risk
  const priceFactor = 1 + (priceChange / 100) * 0.6;

  // Retention impact
  const retentionFactor = retention / 91;

  // Top accounts lost impact
  const accountsFactor = 1 + topAccountsLost * 0.35;

  const premium = Math.round(
    BASELINE.premium * churnFactor * priceFactor * retentionFactor * accountsFactor
  );

  const projectedUpside = Math.round(
    BASELINE.projectedUpside * (1 + (priceChange / 100) * 0.4) * (1 - topAccountsLost * 0.12)
  );

  const premiumRate = Math.min(95, (premium / projectedUpside) * 100);

  const netLossProbability = Math.min(
    85,
    BASELINE.netLossProbability * churnFactor * accountsFactor * (2 - retentionFactor)
  );

  const isLapsed = segmentChurn >= LAPSE_THRESHOLD;
  const isNearLapse = segmentChurn >= LAPSE_THRESHOLD * 0.8 && !isLapsed;

  const coverageState: CoverageState = isLapsed ? 'lapsed' : isNearLapse ? 'near-lapse' : 'covered';

  const verdict: Verdict = isLapsed
    ? 'Refer'
    : premiumRate > 25
      ? 'Refer'
      : 'Recommended with conditions';

  const exposureMultiplier = churnFactor * accountsFactor;

  return {
    premium,
    premiumRate: Math.round(premiumRate * 10) / 10,
    projectedUpside,
    netLossProbability: Math.round(netLossProbability),
    verdict,
    coverageState,
    exposure: {
      p10: Math.round(BASELINE.exposure.p10 * exposureMultiplier),
      avgWorst10: Math.round(BASELINE.exposure.avgWorst10 * exposureMultiplier),
      worstPlausible: Math.round(BASELINE.exposure.worstPlausible * exposureMultiplier),
      concentration: `Top 3 accounts = ${Math.round(41 + topAccountsLost * 8)}%`,
      dataExposure: BASELINE.exposure.dataExposure,
    },
  };
}

export function getCoverageConditions(
  assumptions: SandboxAssumptions,
  calc: DecisionCalc
): CoverageCondition[] {
  const { segmentChurn, priceChange, topAccountsLost } = assumptions;
  const isLapsed = calc.coverageState === 'lapsed';
  const isNear = calc.coverageState === 'near-lapse';

  return [
    {
      id: 'segment-churn',
      label: 'Segment churn',
      currentValue: `${segmentChurn.toFixed(1)}%`,
      currentNumeric: segmentChurn,
      lapseValue: '6.2%',
      lapseNumeric: 6.2,
      unit: 'pp',
      direction: 'above',
      state: isLapsed ? 'lapsed' : isNear ? 'near-lapse' : 'covered',
      distance: `${Math.abs(LAPSE_THRESHOLD - segmentChurn).toFixed(1)} percentage points`,
      description: 'If segment churn exceeds 6.2%, the recommendation no longer holds.',
    },
    {
      id: 'top-concentration',
      label: 'Top account concentration',
      currentValue: `${topAccountsLost} of 3 accounts exposed`,
      currentNumeric: topAccountsLost,
      lapseValue: '2 of 3 accounts leave',
      lapseNumeric: 2,
      unit: 'accounts',
      direction: 'above',
      state: topAccountsLost >= 2 ? 'lapsed' : topAccountsLost >= 1 ? 'near-lapse' : 'covered',
      distance: `${2 - topAccountsLost} account(s) to lapse`,
      description: 'If 2 of the top 3 accounts leave, concentration risk breaks the model.',
    },
    {
      id: 'competitor-gap',
      label: 'Competitor price gap',
      currentValue: 'unknown',
      currentNumeric: 0,
      lapseValue: '>15%',
      lapseNumeric: 15,
      unit: 'pp',
      direction: 'above',
      state: 'unknown',
      distance: 'Not observable from current data',
      description: 'If a competitor undercuts price by more than 15%, the upside erodes.',
    },
    {
      id: 'low-margin-def',
      label: 'Low-margin definition',
      currentValue: '18% cut-off',
      currentNumeric: 18,
      lapseValue: '+3 points',
      lapseNumeric: 21,
      unit: 'pp',
      direction: 'below',
      state: 'covered',
      distance: '3 points to lapse',
      description: 'If the low-margin threshold shifts up by 3 points, the segment definition changes.',
    },
  ];
}

export function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    const v = (n / 1_000_000).toFixed(2);
    return `${n < 0 ? '−' : ''}$${v}M`;
  }
  if (Math.abs(n) >= 1_000) {
    const v = Math.round(n / 1_000);
    return `${n < 0 ? '−' : ''}$${v}K`;
  }
  return `${n < 0 ? '−' : ''}$${n}`;
}

export const DEFAULT_ASSUMPTIONS: SandboxAssumptions = {
  segmentChurn: 3.1,
  priceChange: 4,
  retention: 91,
  topAccountsLost: 1,
};

export const BASELINE_CALC = computeDecision(DEFAULT_ASSUMPTIONS);

