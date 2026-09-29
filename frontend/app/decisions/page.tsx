'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { api } from '@/lib/api-client';
import { Decision, DecisionTemplate } from '@/lib/types';
import { formatDate } from '@/lib/formatters';

export default function DecisionsPage() {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [templates, setTemplates] = useState<DecisionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'underwritten' | 'approved' | 'modified' | 'rejected'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 't1' | 't2'>('all');

  // New Decision Form State
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [horizonDays, setHorizonDays] = useState(90);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [decs, tmpls] = await Promise.all([
        api.decisions.list(0, 100),
        api.decisions.listTemplates(),
      ]);
      setDecisions(decs.items || []);
      setTemplates(tmpls || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load decisions');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !questionText) return;
    try {
      setSubmitting(true);
      const created = await api.decisions.create({
        title,
        question_text: questionText,
        horizon_days: horizonDays,
      });
      setTitle('');
      setQuestionText('');
      setShowForm(false);
      setSelectedTemplateCode(null);
      await loadData();
      router.push(`/decisions/${created.id}`);
    } catch (err: any) {
      alert(`Error creating decision: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  function applyTemplate(tmpl: DecisionTemplate) {
    setTitle(tmpl.title);
    setQuestionText(tmpl.description);
    setSelectedTemplateCode(tmpl.template_code);
    setShowForm(true);
  }

  // Deduplicate decisions by title
  const uniqueDecisions = useMemo(() => {
    return decisions.filter(
      (d, index, self) => index === self.findIndex((t) => t.title === d.title)
    );
  }, [decisions]);

  // Filtered decisions list
  const filteredDecisions = useMemo(() => {
    return uniqueDecisions.filter((d) => {
      // Status filter
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;

      // Type filter
      const isT2 = d.title.toLowerCase().includes('price') || d.question_text.toLowerCase().includes('price');
      if (typeFilter === 't1' && isT2) return false;
      if (typeFilter === 't2' && !isT2) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const titleMatch = d.title.toLowerCase().includes(query);
        const textMatch = d.question_text.toLowerCase().includes(query);
        if (!titleMatch && !textMatch) return false;
      }

      return true;
    });
  }, [uniqueDecisions, statusFilter, typeFilter, searchTerm]);

  if (loading && decisions.length === 0) {
    return <LoadingState message="Loading underwritten decisions register..." />;
  }

  if (error && decisions.length === 0) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      <PageHeader
        kicker="Central Register · Commercial Decision Files"
        plainTitle="Commercial Decisions"
        italicTitle="Register"
        description="The permanent register of commercial decisions evaluated by TRACE. Each record maintains an immutable audit trail of objectives, empirical findings, and calculated risk loads."
        actions={
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (showForm) setSelectedTemplateCode(null);
            }}
            className="trace-btn trace-btn-primary"
            style={{ padding: '0.65rem 1.4rem' }}
          >
            {showForm ? 'Cancel Entry' : '+ Register Decision'}
          </button>
        }
      />

      {/* Decision Template Bar */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
          <span className="trace-kicker">Standard Underwriting Templates</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Select template to pre-populate specification
          </span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {templates.map((t) => {
            const isSelected = selectedTemplateCode === t.template_code;
            return (
              <div
                key={t.id}
                onClick={() => applyTemplate(t)}
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                  border: `1px solid ${isSelected ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      color: isSelected ? 'var(--accent-gold)' : 'var(--text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    [{t.template_code}]
                  </span>
                  <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold-light)' }}>
                    USE TEMPLATE ↵
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  {t.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {t.description.length > 95 ? `${t.description.slice(0, 95)}...` : t.description}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Decision Registration Panel */}
      {showForm && (
        <section
          style={{
            padding: '1.5rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--accent-gold)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div className="trace-kicker" style={{ color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>
            {selectedTemplateCode ? `Register Under Template [${selectedTemplateCode}]` : 'Register New Commercial Decision'}
          </div>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                DECISION TITLE
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Stop Discounts for Low-Margin Segment"
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                PRIMARY DECISION QUESTION & SCOPE
              </label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Describe the operational intervention, affected customers or products, and expected commercial upside..."
                rows={3}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  UNDERWRITING HORIZON (DAYS)
                </label>
                <input
                  type="number"
                  value={horizonDays}
                  onChange={(e) => setHorizonDays(Number(e.target.value))}
                  min={30}
                  max={365}
                  style={{
                    padding: '0.55rem 0.85rem',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.9rem',
                    width: '120px',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="trace-btn trace-btn-primary"
                style={{ alignSelf: 'flex-end', padding: '0.65rem 1.4rem' }}
              >
                {submitting ? 'Registering...' : 'Register Decision →'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Decision Register Controls: Search & Filter Tabs */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <span className="trace-kicker">Decision Register</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
              Portfolio Files ({filteredDecisions.length})
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search decisions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '0.35rem 0.65rem',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-dim)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                color: 'var(--text-primary)',
                minWidth: '200px',
              }}
            />

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              style={{
                padding: '0.35rem 0.65rem',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-dim)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                color: 'var(--text-primary)',
              }}
            >
              <option value="all">All Types</option>
              <option value="t1">T1: Discount Policy</option>
              <option value="t2">T2: Price Change</option>
            </select>

            {/* Status Filter Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '2px',
                backgroundColor: 'var(--bg-surface)',
                padding: '2px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-dim)',
              }}
            >
              {[
                { key: 'all', label: `All (${uniqueDecisions.length})` },
                { key: 'draft', label: 'Draft' },
                { key: 'underwritten', label: 'Underwritten' },
                { key: 'approved', label: 'Approved' },
                { key: 'modified', label: 'Modified' },
                { key: 'rejected', label: 'Rejected' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key as any)}
                  style={{
                    padding: '0.25rem 0.65rem',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    borderRadius: 'var(--radius-sm)',
                    color: statusFilter === tab.key ? 'var(--accent-gold-light)' : 'var(--text-muted)',
                    backgroundColor: statusFilter === tab.key ? 'var(--bg-surface-elevated)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Decisions Table */}
        <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '0.75rem 1.25rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Commercial Decision</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Type</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Horizon</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Registered</th>
                <th style={{ padding: '0.75rem 1.25rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDecisions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                    No decisions found matching the active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredDecisions.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => router.push(`/decisions/${d.id}`)}
                    style={{
                      borderBottom: '1px solid var(--border-dim)',
                      cursor: 'pointer',
                      transition: 'background-color 0.1s ease',
                    }}
                    className="hover:bg-surface"
                  >
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.925rem' }}>
                        {d.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                        {d.question_text.length > 105 ? `${d.question_text.slice(0, 105)}...` : d.question_text}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-gold)' }}>
                      {d.title.toLowerCase().includes('price') ? 'T2 · Price Elasticity' : 'T1 · Discount Policy'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                      {d.horizon_days}d
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <StatusBadge status={d.status} size="sm" />
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {formatDate(d.created_at)}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-gold-light)', fontWeight: 500 }}>
                        VIEW FILE →
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
