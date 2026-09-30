/**
 * TRACE Frontend TypeScript Type Definitions.
 * Strictly aligned with Backend Pydantic Models and Locked Vocabulary.
 */

export type UnderwritingVerdict =
  | 'Recommended'
  | 'Recommended with Conditions'
  | 'Refer'
  | 'Decline';

export type DecisionStatus =
  | 'draft'
  | 'ingesting'
  | 'auditing'
  | 'investigating'
  | 'underwritten'
  | 'approved'
  | 'modified'
  | 'rejected';

export type DataQualitySeverity = 'info' | 'warning' | 'critical';

export type StatementLevel =
  | 'observed_fact'
  | 'calculated_result'
  | 'modelled_scenario'
  | 'recommendation';

export type LapseConditionType =
  | 'threshold'
  | 'concentration'
  | 'data'
  | 'definition'
  | 'time'
  | 'combination';

export type ApprovalActionType = 'Approve' | 'Modify' | 'Reject';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface DatabaseHealth {
  connected: boolean;
  database_name: string;
  server_version?: string;
  table_count: number;
}

export interface SystemHealth {
  status: string;
  version: string;
  environment: string;
  timestamp: string;
  database: DatabaseHealth;
}

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  source_type: string;
  file_count: number;
  total_rows: number;
  health_score?: number | null;
  metadata_json?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DatasetFile {
  id: string;
  dataset_id: string;
  filename: string;
  file_size_bytes: number;
  mime_type: string;
  status: string;
  parse_metadata: Record<string, any>;
  created_at: string;
}

export interface SemanticMapping {
  table_id: string;
  table_name: string;
  column_id: string;
  column_name: string;
  concept_key?: string;
  concept_name: string;
  domain: string;
  business_role: string;
  data_type: string;
  unit?: string;
  aggregation: string;
  status: string;
  provenance_method: string;
}

export interface DataTransformation {
  id: string;
  dataset_id: string;
  name: string;
  transformation_type: string;
  code_definition: string;
  applied_by: string;
  audit_provenance: Record<string, any>;
  created_at: string;
}

export interface DataQualityFinding {
  id: string;
  dataset_id: string;
  finding_type: string;
  severity: DataQualitySeverity;
  issue_description: string;
  affected_rows_count: number;
  affected_ratio: number;
  proposed_treatment?: string;
  effect_on_premium_load?: number;
  is_resolved: boolean;
}

export interface DataHealthSummary {
  dataset_id: string;
  overall_health_score: number | null;
  audit_status?: string;
  total_findings: number;
  findings_by_severity: Record<string, number>;
  findings: DataQualityFinding[];
  calculated_data_quality_load_weight: number;
}

export interface DecisionObjective {
  id: string;
  decision_id: string;
  primary_goal: string;
  target_metric: string;
  constraint_description?: string;
  baseline_value?: number;
  target_value?: number;
  parameters: Record<string, any>;
  created_at: string;
}

export interface DecisionTemplate {
  id: string;
  template_code: string;
  title: string;
  category: string;
  description: string;
  required_entities: string[];
  required_metrics: string[];
  default_assumptions: Record<string, any>;
  is_active: boolean;
}

export interface Decision {
  id: string;
  title: string;
  question_text: string;
  status: DecisionStatus;
  dataset_id?: string;
  template_id?: string;
  primary_metric_name?: string;
  horizon_days: number;
  validity_window_days: number;
  created_at: string;
  updated_at: string;
  objective?: DecisionObjective;
}

export interface Calculation {
  id: string;
  decision_id: string;
  metric_name: string;
  formula_used: string;
  result_numeric: number;
  result_formatted: string;
  input_parameters: Record<string, any>;
  input_row_count: number;
  code_provenance: string;
  created_at: string;
}

export interface VerificationResult {
  id: string;
  calculation_id: string;
  method_primary_name: string;
  method_secondary_name: string;
  method_primary_value: number;
  method_secondary_value: number;
  absolute_discrepancy: number;
  relative_discrepancy: number;
  tolerance_threshold: number;
  is_verified: boolean;
  explanation: string;
}

export interface Assumption {
  id: string;
  decision_id: string;
  name: string;
  assumption_type: 'data_derived' | 'judgement' | 'user_supplied';
  base_value: number;
  min_value: number;
  max_value: number;
  unit: string;
  rationale: string;
  sensitivity_rank: number;
}

export interface CounterFinding {
  id: string;
  decision_id: string;
  title: string;
  finding_text: string;
  quantified_impact: number;
  affected_segment?: string;
  evidence_reference?: string;
  is_absorbed_into_model: boolean;
  unabsorbed_impact: number;
}

export interface EvidenceItem {
  id: string;
  decision_id: string;
  title: string;
  statement_text: string;
  statement_level: StatementLevel;
  metric_name?: string;
  calculation_id?: string;
  source_table_name?: string;
  row_count_sample?: number;
  is_contradiction: boolean;
  provenance_metadata: Record<string, any>;
  created_at: string;
}

export interface DecisionPremium {
  id: string;
  decision_id: string;
  scenario_run_id: string;
  rate_card_version_id?: string;
  projected_upside: number;
  expected_loss: number;
  data_quality_load: number;
  verification_load: number;
  contradiction_load: number;
  model_uncertainty_load: number;
  total_risk_load: number;
  total_decision_premium: number;
  premium_rate: number;
  expected_net_benefit: number;
  created_at: string;
}

export interface ExposureReport {
  id: string;
  decision_id: string;
  scenario_run_id: string;
  probability_of_net_loss: number;
  downside_at_tail: number;
  worst_plausible_case_loss: number;
  worst_plausible_assumptions: Record<string, any>;
  concentration_exposure_amount: number;
  concentration_account_count: number;
  concentration_volume_share: number;
  data_exposure_min: number;
  data_exposure_max: number;
  adverse_finding_exposure_total: number;
  cost_of_inaction: number;
  created_at: string;
}

export interface Tripwire {
  id: string;
  coverage_lapse_condition_id: string;
  metric_name: string;
  alert_threshold: number;
  current_value: number;
  unit: string;
  review_cadence: string;
  is_triggered: boolean;
}

export interface CoverageLapseCondition {
  id: string;
  decision_id: string;
  scenario_run_id: string;
  condition_type: LapseConditionType;
  title: string;
  description: string;
  metric_parameter_name: string;
  current_modelled_value: number;
  lapse_threshold_value: number;
  distance_to_lapse_percent: number;
  unit: string;
  is_breached: boolean;
  priority_rank: number;
  tripwires?: Tripwire[];
}

export interface UnderwritingVerdictData {
  id: string;
  decision_id: string;
  scenario_run_id: string;
  verdict: UnderwritingVerdict;
  summary_sentence: string;
  conditions_list: string[];
  exclusions_list: string[];
  is_valid: boolean;
}

export interface RateCardVersion {
  id: string;
  rate_card_id: string;
  version_str: string;
  weight_data_quality: number;
  weight_verification: number;
  weight_contradiction: number;
  base_model_uncertainty_weight: number;
  band_recommended_max: number;
  band_recommended_with_conditions_max: number;
  band_refer_max: number;
  tail_percentile: number;
  policy_metadata: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface LossHistoryEntry {
  id: string;
  decision_id?: string;
  decision_class: string;
  decision_title: string;
  underwritten_date: string;
  validity_end_date: string;
  is_simulated: boolean;
  projected_upside: number;
  decision_premium: number;
  premium_rate: number;
  p10_tail_exposure: number;
  underwriting_verdict: string;
  human_action: string;
  actual_realised_value?: number;
  actual_vs_predicted_variance?: number;
  fell_inside_predicted_range?: boolean;
  lapse_event_triggered?: boolean;
  is_claim?: boolean;
  created_at: string;
}

export interface Job {
  id: string;
  job_type: string;
  status: JobStatus;
  target_entity_type: string;
  target_entity_id?: string;
  progress_stage: string;
  progress_percent: number;
  metadata_json: Record<string, any>;
  error_message?: string;
  retry_count: number;
  cancellation_reason?: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

export interface InvestigationQuestion {
  id: string;
  question_text: string;
  rationale: string;
  target_agent: string;
  status: string;
}

export interface InvestigationPlan {
  id: string;
  decision_id: string;
  plan_summary: string;
  sufficiency_verdict: string;
  missing_information_rankings: Array<{
    item: string;
    decision_impact: string;
    rank: number;
  }>;
  stages_definition: Array<{
    stage: string;
    label: string;
    status: string;
    output?: any;
  }>;
  is_approved: boolean;
  questions?: InvestigationQuestion[];
}

export interface InvestigationPackage {
  decision: {
    id: string;
    title: string;
    question_text: string;
    status: string;
    horizon_days: number;
    validity_window_days: number;
  };
  objective?: {
    primary_goal: string;
    target_metric: string;
    constraint_description?: string;
    parameters?: Record<string, any>;
  };
  investigation_plan?: {
    plan_summary: string;
    sufficiency_verdict: string;
    missing_information_rankings: Array<{
      item: string;
      decision_impact: string;
      rank: number;
    }>;
    stages: Array<{
      stage: string;
      label: string;
      status: string;
      output?: any;
    }>;
  };
  investigation_run?: {
    status: string;
    started_at?: string;
    completed_at?: string;
  };
  premium?: {
    projected_upside: number;
    expected_loss: number;
    data_quality_load: number;
    verification_load: number;
    contradiction_load: number;
    model_uncertainty_load: number;
    total_risk_load: number;
    total_decision_premium: number;
    premium_rate: number;
    expected_net_benefit: number;
  };
  exposure?: {
    probability_of_net_loss: number;
    downside_at_tail: number;
    worst_plausible_case_loss: number;
    concentration_exposure: number;
    contractual_liability_exposure: number;
    cost_of_inaction: number;
  };
  verdict?: {
    verdict_type: string;
    verdict_statement: string;
    conditions: string[];
    exclusions: string[];
  };
  lapse_conditions?: Array<{
    condition_name: string;
    current_value: number;
    threshold_value: number;
    distance_to_lapse_percent: number;
    is_breached: boolean;
    wording: string;
    tripwire?: string;
  }>;
  counter_findings?: Array<{
    title: string;
    finding_text: string;
    quantified_impact: number;
    affected_segment: string;
    is_absorbed: boolean;
    unabsorbed_impact: number;
    reference: string;
  }>;
  evidence_items?: Array<{
    title: string;
    statement_text: string;
    statement_level: string;
    metric_name?: string;
  }>;
  calculations?: Array<{
    metric_name: string;
    formula: string;
    result_numeric: number;
    result_formatted: string;
  }>;
  brief?: any;
}

export interface SupportedAssumptionInfo {
  name: string;
  display_label: string;
  current_value: number;
  baseline_value: number;
  unit: string;
  min_value: number;
  max_value: number;
  step: number;
  description: string;
  is_user_supplied: boolean;
}

export interface SandboxChangedAssumption {
  name: string;
  display_label: string;
  baseline_value: number;
  sandbox_value: number;
  unit: string;
}

export interface SandboxComparisonMetric {
  metric: string;
  display_label: string;
  baseline_value: number | string;
  sandbox_value: number | string;
  unit: string;
  delta_percent?: number | null;
  direction?: 'improved' | 'deteriorated' | 'neutral';
}

export interface SandboxReQuoteResponse {
  sandbox_run_id: string;
  decision_id: string;
  parent_run_id?: string | null;
  run_label: string;
  is_baseline: boolean;
  is_sandbox: boolean;
  rate_card_version: string;
  scenario_seed: number;
  data_version: string;
  assumptions: Record<string, number>;
  changed_assumptions: SandboxChangedAssumption[];
  comparison_metrics: SandboxComparisonMetric[];
  projected_upside: number;
  expected_loss: number;
  decision_premium: number;
  premium_rate: number;
  expected_net_benefit: number;
  probability_of_net_loss: number;
  downside_at_tail: number;
  worst_case_loss: number;
  coverage_state: 'COVERED' | 'COVERAGE_LAPSED';
  verdict: string;
  verdict_statement: string;
  risk_loads: {
    data_quality_load: number;
    verification_load: number;
    contradiction_load: number;
    model_uncertainty_load: number;
    total_risk_load: number;
  };
  lapse_conditions: Array<{
    name: string;
    current_value: number;
    threshold: number;
    distance_to_lapse_percent: number;
    is_breached: boolean;
    wording: string;
  }>;
  provenance: Record<string, any>;
}

