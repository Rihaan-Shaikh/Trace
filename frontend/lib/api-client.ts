/**
 * TRACE Typed API Client.
 * Communicates with FastAPI backend under /api/v1.
 */

import {
  SystemHealth,
  RateCardVersion,
  Dataset,
  DataHealthSummary,
  Decision,
  DecisionTemplate,
  LossHistoryEntry,
  EvidenceItem,
  DatasetFile,
  SemanticMapping,
  DataTransformation,
  Job,
  PaginatedResult,
  DecisionObjective,
  InvestigationPlan,
  InvestigationPackage,
  SupportedAssumptionInfo,
  SandboxReQuoteResponse,
} from './types';

const API_BASE = '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorDetail = 'API Request Failed';
    try {
      const errJson = await res.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = `${res.status} ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export const api = {
  health: {
    get: () => fetchJson<SystemHealth>('/health'),
  },
  rateCard: {
    getActive: () => fetchJson<RateCardVersion>('/rate-card'),
  },
  datasets: {
    list: (skip = 0, limit = 50) =>
      fetchJson<PaginatedResult<Dataset>>(`/datasets?skip=${skip}&limit=${limit}`),
    get: (id: string) => fetchJson<Dataset>(`/datasets/${id}`),
    create: (data: { name: string; description?: string }) =>
      fetchJson<Dataset>('/datasets', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getDataHealth: (id: string) =>
      fetchJson<DataHealthSummary>(`/data-health/${id}`),
    uploadFile: async (id: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/datasets/${id}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        let errDetail = 'Upload failed';
        try {
          const errJson = await res.json();
          errDetail = errJson.detail || errJson.error?.message || JSON.stringify(errJson);
        } catch {
          errDetail = `${res.status} ${res.statusText}`;
        }
        throw new Error(errDetail);
      }
      return res.json();
    },
    getFiles: (id: string) => fetchJson<DatasetFile[]>(`/datasets/${id}/files`),
    getTransformations: (id: string) => fetchJson<DataTransformation[]>(`/datasets/${id}/transformations`),
    getSemanticMappings: (id: string) => fetchJson<SemanticMapping[]>(`/datasets/${id}/semantic-mappings`),
    confirmAllSemanticMappings: (id: string) =>
      fetchJson<SemanticMapping[]>(`/datasets/${id}/semantic-mappings/confirm-all`, {
        method: 'POST',
      }),
    updateSemanticMapping: (
      id: string,
      columnId: string,
      data: { concept_key?: string; business_role?: string; aggregation?: string }
    ) =>
      fetchJson<SemanticMapping>(`/datasets/${id}/semantic-mappings/${columnId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    seedNovaMart: () =>
      fetchJson<Dataset>('/datasets/seed-novamart', {
        method: 'POST',
      }),
  },
  decisions: {
    list: (skip = 0, limit = 50) =>
      fetchJson<PaginatedResult<Decision>>(`/decisions?skip=${skip}&limit=${limit}`),
    get: (id: string) => fetchJson<Decision>(`/decisions/${id}`),
    create: (data: { title: string; question_text: string; horizon_days?: number }) =>
      fetchJson<Decision>('/decisions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) => fetchJson<any>(`/decisions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      listTemplates: () => fetchJson<DecisionTemplate[]>('/decisions/templates'),
    suggestObjective: (id: string) =>
      fetchJson<DecisionObjective>(`/decisions/${id}/objective/suggest`, {
        method: 'POST',
      }),
    setObjective: (
      id: string,
      data: {
        primary_goal: string;
        target_metric: string;
        constraint_description?: string;
        baseline_value?: number;
        target_value?: number;
        parameters?: Record<string, any>;
      }
    ) =>
      fetchJson<DecisionObjective>(`/decisions/${id}/objective`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    generatePlan: (id: string) =>
      fetchJson<InvestigationPlan>(`/decisions/${id}/plan`, {
        method: 'POST',
      }),
    getPlan: (id: string) =>
      fetchJson<InvestigationPlan>(`/decisions/${id}/plan`),
    runInvestigation: (id: string) =>
      fetchJson<any>(`/decisions/${id}/investigate`, {
        method: 'POST',
      }),
    getPackage: (id: string) =>
      fetchJson<InvestigationPackage>(`/decisions/${id}/package`),
    exportRecord: (id: string) =>
      fetchJson<any>(`/decisions/${id}/export`),
  },
  sandbox: {
    getSupportedAssumptions: (decisionId: string) =>
      fetchJson<SupportedAssumptionInfo[]>(`/sandbox/decisions/${decisionId}/supported-assumptions`),
    getVersions: (decisionId: string) =>
      fetchJson<any[]>(`/sandbox/decisions/${decisionId}/versions`),
    requote: (data: {
      decision_id: string;
      parent_run_id?: string | null;
      run_label?: string;
      assumptions?: Record<string, number>;
      assumption_adjustments?: Record<string, number>;
    }) =>
      fetchJson<SandboxReQuoteResponse>('/sandbox/re-quote', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          assumption_adjustments: data.assumption_adjustments || data.assumptions || {},
          assumptions: data.assumptions || data.assumption_adjustments || {},
        }),
      }),
  },
  ledger: {
    list: (skip = 0, limit = 50, decisionClass?: string, isSimulated?: boolean) => {
      let url = `/ledger?skip=${skip}&limit=${limit}`;
      if (decisionClass) url += `&decision_class=${encodeURIComponent(decisionClass)}`;
      if (isSimulated !== undefined) url += `&is_simulated=${isSimulated}`;
      return fetchJson<PaginatedResult<LossHistoryEntry>>(url);
    },
    get: (id: string) => fetchJson<LossHistoryEntry>(`/ledger/${id}`),
    getByDecision: (decisionId: string) =>
      fetchJson<LossHistoryEntry | null>(`/ledger/decisions/${decisionId}/entry`),
    recalibration: (decisionClass: string) =>
      fetchJson<any>(`/ledger/recalibration/${decisionClass}`),
    seedSimulated: (force = false) =>
      fetchJson<LossHistoryEntry[]>(`/ledger/seed-simulated?force=${force}`, {
        method: 'POST',
      }),
    logOutcome: (
      entryId: string,
      data: {
        primary_metric_realised: number;
        logged_by: string;
        variance_notes?: string;
        source_reference?: string;
      }
    ) =>
      fetchJson<any>(`/ledger/${entryId}/outcomes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  jobs: {
    list: (skip = 0, limit = 50) =>
      fetchJson<PaginatedResult<Job>>(`/jobs?skip=${skip}&limit=${limit}`),
    get: (id: string) => fetchJson<Job>(`/jobs/${id}`),
  },
  evidence: {
    getByDecision: (decisionId: string) =>
      fetchJson<EvidenceItem[]>(`/evidence/decisions/${decisionId}`),
    getCalculations: (decisionId: string) =>
      fetchJson<any[]>(`/evidence/decisions/${decisionId}/calculations`),
    getVerifications: (calculationId: string) =>
      fetchJson<any[]>(`/evidence/calculations/${calculationId}/verifications`),
    getAssumptions: (decisionId: string) =>
      fetchJson<any[]>(`/evidence/decisions/${decisionId}/assumptions`),
  },
  approvals: {
    getBrief: (decisionId: string) => fetchJson<any>(`/decisions/${decisionId}/brief`),
    submitAction: (
      decisionId: string,
      data: {
        action: 'APPROVE' | 'MODIFY' | 'REJECT';
        approver_name: string;
        approver_role?: string;
        notes?: string;
        sandbox_modifications?: Record<string, any>;
      }
    ) =>
      fetchJson<any>(`/decisions/${decisionId}/actions`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getRecord: (decisionId: string) => fetchJson<any>(`/decisions/${decisionId}/record`),
  },
  evaluation: {
    run: (randomSeed = 42) =>
      fetchJson<any>(`/evaluation/run?random_seed=${randomSeed}`, {
        method: 'POST',
      }),
    getRuns: (limit = 20) => fetchJson<any[]>(`/evaluation/runs?limit=${limit}`),
    getLatest: () => fetchJson<any>('/evaluation/latest'),
    getRun: (id: string) => fetchJson<any>(`/evaluation/runs/${id}`),
  },
  demo: {
    reset: () =>
      fetchJson<any>('/demo/reset', {
        method: 'POST',
      }),
  },
};


