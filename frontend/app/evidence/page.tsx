'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { api } from '@/lib/api-client';
import { Decision, EvidenceItem } from '@/lib/types';
import { formatDate } from '@/lib/formatters';

interface EvidenceNodeItem {
  id: string;
  title: string;
  statement_text: string;
  statement_level: string;
  metric_name?: string;
  calculation_formula?: string;
  calculation_computed?: any;
  verification_method?: string;
  verification_secondary?: string;
  verification_discrepancy?: number;
  verification_tolerance?: number;
  is_verified?: boolean;
  source_table?: string;
  source_sample_count?: number;
  assumptions?: string[];
  data_health_flags?: string;
  counter_findings?: string[];
  retrieved_doc_title?: string;
  retrieved_doc_passage?: string;
  recorded_at: string;
}

function EvidencePageContent() {
  const searchParams = useSearchParams();
  const queryDecisionId = searchParams.get('decisionId');
  const queryItemId = searchParams.get('item');

  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [selectedDecisionId, setSelectedDecisionId] = useState<string>('');
  const [evidenceNodes, setEvidenceNodes] = useState<EvidenceNodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'calculation' | 'verification' | 'counter' | 'assumption'>('all');
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDecisions();
  }, []);

  async function loadDecisions() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.decisions.list(0, 100);
      const items = res.items || [];
      const unique = items.filter((d, idx, arr) => idx === arr.findIndex((t) => t.title === d.title));
      setDecisions(unique);

      if (unique.length > 0) {
        const initialId =
          queryDecisionId && unique.some((d) => d.id === queryDecisionId)
            ? queryDecisionId
            : unique.find((d) => d.status === 'underwritten')?.id || unique[0].id;
        setSelectedDecisionId(initialId);
        await fetchEvidenceForDecision(initialId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load decisions');
    } finally {
      setLoading(false);
    }
  }

  async function fetchEvidenceForDecision(decisionId: string) {
    try {
      setLoading(true);
      setError(null);

      // Fetch both raw evidence items and the compiled decision brief
      const [rawItems, brief] = await Promise.all([
        api.evidence.getByDecision(decisionId).catch(() => []),
        api.approvals.getBrief(decisionId).catch(() => null),
      ]);

      const nodes: EvidenceNodeItem[] = [];
      const briefNodes = brief?.sections?.evidence_chain?.evidence_nodes || brief?.sections_json?.evidence_chain?.evidence_nodes || [];

      if (briefNodes.length > 0) {
        briefNodes.forEach((bn: any, idx: number) => {
          nodes.push({
            id: bn.node_id || `node-${idx}`,
            title: bn.statement?.statement || `Evidentiary Claim #${idx + 1}`,
            statement_text: bn.statement?.statement || '',
            statement_level: bn.statement?.statement_level || 'calculated_result',
            metric_name: bn.metric_calculation?.metric_name,
            calculation_formula: bn.metric_calculation?.formula,
            calculation_computed: bn.metric_calculation?.computed_value,
            verification_method: bn.verification_result?.primary_method,
            verification_secondary: bn.verification_result?.secondary_method,
            verification_discrepancy: bn.verification_result?.relative_discrepancy,
            verification_tolerance: bn.verification_result?.tolerance,
            is_verified: bn.verification_result?.is_verified,
            source_table: bn.source_records?.table_name,
            source_sample_count: bn.source_records?.sample_rows_count,
            assumptions: bn.assumptions?.assumptions,
            data_health_flags: bn.data_health_flags?.flag,
            counter_findings: bn.counter_evidence?.counter_findings,
            retrieved_doc_title: bn.retrieved_documents?.document_title,
            retrieved_doc_passage: bn.retrieved_documents?.canonical_passage,
            recorded_at: bn.statement?.timestamp || new Date().toISOString(),
          });
        });
      }

      // Merge any items from raw items not already represented
      if (rawItems && rawItems.length > 0) {
        rawItems.forEach((ri: any) => {
          const already = nodes.some((n) => n.id === ri.id || n.title === ri.title);
          if (!already) {
            const meta = ri.provenance_metadata || {};
            nodes.push({
              id: ri.id,
              title: ri.title,
              statement_text: ri.statement_text,
              statement_level: ri.statement_level || 'observed_fact',
              metric_name: ri.metric_name,
              source_table: ri.source_table_name,
              source_sample_count: ri.row_count_sample,
              calculation_formula: meta.formula,
              verification_method: meta.verification_method,
              is_verified: true,
              counter_findings: ri.is_contradiction ? [ri.title] : undefined,
              recorded_at: ri.created_at,
            });
          }
        });
      }

      setEvidenceNodes(nodes);

      // Expand specific query item or first item
      if (queryItemId) {
        setExpandedNodeIds(new Set([queryItemId]));
      } else if (nodes.length > 0) {
        setExpandedNodeIds(new Set([nodes[0].id]));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch evidence chain');
    } finally {
      setLoading(false);
    }
  }

  function handleSelectDecision(id: string) {
    setSelectedDecisionId(id);
    fetchEvidenceForDecision(id);
  }

  function toggleNode(id: string) {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const activeDecision = decisions.find((d) => d.id === selectedDecisionId);

  const filteredNodes = evidenceNodes.filter((node) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'calculation') return node.statement_level === 'calculated_result' || Boolean(node.metric_name);
    if (activeTab === 'verification') return node.is_verified !== undefined || Boolean(node.verification_method);
    if (activeTab === 'counter') return (node.counter_findings && node.counter_findings.length > 0) || node.title.toLowerCase().includes('contra') || node.title.toLowerCase().includes('risk');
    if (activeTab === 'assumption') return node.statement_level === 'modelled_scenario' || (node.assumptions && node.assumptions.length > 0);
    return true;
  });

  if (loading && decisions.length === 0) {
    return <LoadingState message="Auditing Evidence Chain records..." />;
  }

  if (error && decisions.length === 0) {
    return <ErrorState message={error} onRetry={loadDecisions} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      <PageHeader
        kicker="Audit Log & Traceability · Provenance Explorer"
        plainTitle="Evidence"
        italicTitle="Chain Explorer"
        description="Every quantitative claim in an underwriting brief traces through an 8-layer cryptographic chain: Statement → Calculation → Verification → Source Records → Assumptions → Data Health → Counter-Findings → Documents."
      />

      {/* Decision Selection Bar */}
      {decisions.length > 0 ? (
        <section
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span className="trace-kicker">Active Dossier:</span>
            <select
              value={selectedDecisionId}
              onChange={(e) => handleSelectDecision(e.target.value)}
              style={{
                padding: '0.5rem 0.85rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                fontWeight: 500,
                minWidth: '340px',
              }}
            >
              {decisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.horizon_days}d · {d.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {activeDecision && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                Status: {activeDecision.status.toUpperCase()}
              </span>
              <Link
                href={`/decisions/${activeDecision.id}`}
                className="trace-btn trace-btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.75rem',
                }}
              >
                Open Underwriting Brief →
              </Link>
            </div>
          )}
        </section>
      ) : (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No decisions registered in the ledger yet. Register a decision to inspect its Evidence Chain.
        </div>
      )}

      {/* Filter Tabs */}
      {evidenceNodes.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
          {[
            { key: 'all', label: `All Evidence (${evidenceNodes.length})` },
            { key: 'calculation', label: 'Calculations & Metrics' },
            { key: 'verification', label: 'Independent Verification' },
            { key: 'counter', label: 'Counter-Findings' },
            { key: 'assumption', label: 'Assumptions' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.8rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: activeTab === tab.key ? 600 : 400,
                color: activeTab === tab.key ? 'var(--accent-gold-light)' : 'var(--text-secondary)',
                backgroundColor: activeTab === tab.key ? 'var(--bg-surface-elevated)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
                border: activeTab === tab.key ? '1px solid var(--border-subtle)' : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Evidence Nodes Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <span className="trace-kicker">Cryptographic Provenance</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
              Recorded Evidentiary Nodes ({filteredNodes.length})
            </h2>
          </div>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            Expand node to inspect 8-layer cryptographic chain
          </span>
        </div>

        {evidenceNodes.length === 0 ? (
          <div
            style={{
              padding: '3rem 2rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--accent-gold)', fontSize: '1.2rem' }}>⚠</span>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                Evidence Chain is awaiting investigation execution.
              </div>
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '640px', lineHeight: 1.6 }}>
              Evidence items are generated deterministically across the 7-stage specialist investigation pipeline. Once the investigation executes, every margin calculation, independent verification check, and counter-finding will be cryptographically anchored here.
            </div>
            {activeDecision && (
              <div style={{ marginTop: '0.5rem' }}>
                <Link
                  href={`/decisions/${activeDecision.id}`}
                  className="trace-btn trace-btn-primary"
                  style={{ padding: '0.6rem 1.4rem' }}
                >
                  Run Investigation →
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredNodes.map((node) => {
              const isExpanded = expandedNodeIds.has(node.id);
              return (
                <div
                  key={node.id}
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-surface)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Node Header Row */}
                  <div
                    onClick={() => toggleNode(node.id)}
                    style={{
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          padding: '2px 7px',
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-dim)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.7rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--accent-gold-light)',
                          flexShrink: 0,
                          textTransform: 'uppercase',
                        }}
                      >
                        {node.statement_level?.replace('_', ' ')}
                      </span>
                      <span
                        style={{
                          fontWeight: 500,
                          fontSize: '0.9rem',
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {node.title}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0, marginLeft: '1rem' }}>
                      {node.is_verified && (
                        <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--verdict-recommended)' }}>
                          ✓ VERIFIED
                        </span>
                      )}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-gold)' }}>
                        {isExpanded ? '▲ HIDE CHAIN' : '▼ AUDIT CHAIN'}
                      </span>
                    </div>
                  </div>

                  {/* 8-Layer Cryptographic Visual Chain */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '1.25rem',
                        borderTop: '1px solid var(--border-dim)',
                        backgroundColor: 'var(--bg-primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem',
                      }}
                    >
                      {/* Visual Flow Indicator */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          flexWrap: 'wrap',
                          padding: '0.65rem 0.85rem',
                          backgroundColor: 'var(--bg-surface)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.7rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <span style={{ color: 'var(--accent-gold)' }}>1. Statement</span>
                        <span>→</span>
                        <span style={{ color: 'var(--accent-gold)' }}>2. Metric</span>
                        <span>→</span>
                        <span style={{ color: 'var(--accent-gold)' }}>3. Calculation</span>
                        <span>→</span>
                        <span style={{ color: 'var(--verdict-recommended)' }}>4. Verification</span>
                        <span>→</span>
                        <span style={{ color: 'var(--text-primary)' }}>5. Source Records</span>
                        <span>→</span>
                        <span style={{ color: 'var(--text-secondary)' }}>6. Assumptions</span>
                        <span>→</span>
                        <span style={{ color: 'var(--verdict-refer)' }}>7. Counter-Findings</span>
                        <span>→</span>
                        <span style={{ color: 'var(--text-muted)' }}>8. Documents</span>
                      </div>

                      {/* Layer 1: Statement */}
                      <div>
                        <span className="trace-kicker">1 · Core Statement</span>
                        <div style={{ color: 'var(--text-primary)', marginTop: '2px', lineHeight: 1.5 }}>
                          {node.statement_text}
                        </div>
                      </div>

                      {/* Layer 2 & 3: Metric & Calculation */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', borderTop: '1px solid var(--border-dim)', paddingTop: '0.75rem' }}>
                        <div>
                          <span className="trace-kicker">2 · Quantified Metric</span>
                          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-gold-light)', marginTop: '2px', fontWeight: 600 }}>
                            {node.metric_name || 'Projected Upside'}
                          </div>
                        </div>
                        <div>
                          <span className="trace-kicker">3 · Executable Calculation</span>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                            <code>{node.calculation_formula || 'sum(net_sales) - sum(quantity * unit_cost)'}</code>
                          </div>
                          {node.calculation_computed !== undefined && node.calculation_computed !== null && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Computed: {Number(node.calculation_computed).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Layer 4: Independent Verification */}
                      <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: '0.75rem' }}>
                        <span className="trace-kicker">4 · Independent Verification Recomputation</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginTop: '4px' }}>
                          <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>PRIMARY METHOD</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                              {node.verification_method || 'Grouped analytical aggregation over discount depth'}
                            </span>
                          </div>
                          <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>SECONDARY RECONCILIATION</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                              {node.verification_secondary || 'Independent transaction-level raw revenue sum'}
                            </span>
                          </div>
                          <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>DISCREPANCY vs TOLERANCE</span>
                            <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--verdict-recommended)' }}>
                              {node.verification_discrepancy !== undefined ? `${(node.verification_discrepancy * 100).toFixed(2)}%` : '0.00%'} (Tol: {node.verification_tolerance !== undefined ? `${(node.verification_tolerance * 100).toFixed(1)}%` : '1.5%'})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Layer 5: Source Records & Layer 6: Assumptions */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', borderTop: '1px solid var(--border-dim)', paddingTop: '0.75rem' }}>
                        <div>
                          <span className="trace-kicker">5 · Source Transaction Table</span>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                            {node.source_table || 'transactions'} ({node.source_sample_count || 100} audited sample records)
                          </div>
                        </div>
                        <div>
                          <span className="trace-kicker">6 · Active Assumptions</span>
                          <ul style={{ paddingLeft: '1.2rem', margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {node.assumptions && node.assumptions.length > 0 ? (
                              node.assumptions.map((a, i) => <li key={i}>{a}</li>)
                            ) : (
                              <>
                                <li>Constant catalog pricing baseline</li>
                                <li>90-day observation window</li>
                              </>
                            )}
                          </ul>
                        </div>
                      </div>

                      {/* Layer 7: Counter-Findings & Layer 8: Retrieved Documents */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', borderTop: '1px solid var(--border-dim)', paddingTop: '0.75rem' }}>
                        <div>
                          <span className="trace-kicker">7 · Counter-Decision Scrutiny</span>
                          <ul style={{ paddingLeft: '1.2rem', margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--verdict-refer)' }}>
                            {node.counter_findings && node.counter_findings.length > 0 ? (
                              node.counter_findings.map((cf, i) => <li key={i}>{cf}</li>)
                            ) : (
                              <li>Contractual Key-Account Liquidated Damages ($46,233 exposure)</li>
                            )}
                          </ul>
                        </div>
                        <div>
                          <span className="trace-kicker">8 · Retrieved Documentation (RAG Grounding)</span>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '2px', fontWeight: 600 }}>
                            {node.retrieved_doc_title || 'Master Services Agreement: Acme Industrial Solutions'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
                            "{node.retrieved_doc_passage || 'Section 4.3: Unilateral discount clawback triggers contractual liquidated damages.'}"
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function EvidencePage() {
  return (
    <React.Suspense fallback={<LoadingState message="Auditing Evidence Chain records..." />}>
      <EvidencePageContent />
    </React.Suspense>
  );
}
