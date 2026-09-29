'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataQualityFindingCard } from '@/components/ui/DataQualityFindingCard';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { api } from '@/lib/api-client';
import { Dataset, DatasetFile, DataHealthSummary, SemanticMapping, DataTransformation } from '@/lib/types';
import { formatDate } from '@/lib/formatters';

export default function DataPage() {
  // ALL HOOKS DECLARED UNCONDITIONALLY AT THE TOP
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [healthSummary, setHealthSummary] = useState<DataHealthSummary | null>(null);
  const [files, setFiles] = useState<DatasetFile[]>([]);
  const [semanticMappings, setSemanticMappings] = useState<SemanticMapping[]>([]);
  const [transformations, setTransformations] = useState<DataTransformation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingAll, setConfirmingAll] = useState(false);

  // New Dataset Form State
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seeding State
  const [seeding, setSeeding] = useState(false);

  // Semantic Filters & Search
  const [semanticFilter, setSemanticFilter] = useState<'all' | 'needs_confirmation' | 'confirmed' | 'unmapped'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMappingKey, setExpandedMappingKey] = useState<string | null>(null);
  const [editingMappingKey, setEditingMappingKey] = useState<string | null>(null);
  const [editConceptKey, setEditConceptKey] = useState<string>('');
  const [editRole, setEditRole] = useState<string>('');
  const [editAggregation, setEditAggregation] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadDatasets();
  }, []);

  async function loadDatasets() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.datasets.list();
      const items = res.items || [];
      setDatasets(items);
      if (items.length > 0) {
        // Prefer currently selected or benchmark dataset or first item
        const target = selectedDataset
          ? items.find((d) => d.id === selectedDataset.id) || items[0]
          : items.find((d) => d.source_type === 'benchmark_seed') || items[0];
        await selectDataset(target);
      } else {
        setSelectedDataset(null);
        setHealthSummary(null);
        setFiles([]);
        setSemanticMappings([]);
        setTransformations([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load business datasets');
    } finally {
      setLoading(false);
    }
  }

  async function selectDataset(ds: Dataset) {
    setSelectedDataset(ds);
    setUploadError(null);
    try {
      const [health, flist, mappings, trans] = await Promise.all([
        api.datasets.getDataHealth(ds.id).catch(() => null),
        api.datasets.getFiles(ds.id).catch(() => []),
        api.datasets.getSemanticMappings(ds.id).catch(() => []),
        api.datasets.getTransformations(ds.id).catch(() => []),
      ]);
      setHealthSummary(health);
      setFiles(flist);
      setSemanticMappings(mappings);
      setTransformations(trans);
    } catch {
      setHealthSummary(null);
      setFiles([]);
      setSemanticMappings([]);
      setTransformations([]);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    try {
      setSubmitting(true);
      const newDs = await api.datasets.create({ name, description });
      setName('');
      setDescription('');
      setShowCreate(false);
      await loadDatasets();
      await selectDataset(newDs);
      showNotice('Dataset registered successfully.');
    } catch (err: any) {
      alert(`Error creating dataset: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || !selectedDataset) return;
    try {
      setUploading(true);
      setUploadError(null);
      await api.datasets.uploadFile(selectedDataset.id, selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadDatasets();
      await selectDataset(selectedDataset);
      showNotice('Source table ingested and audited.');
    } catch (err: any) {
      setUploadError(err.message || 'File ingestion failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSeedNovaMart() {
    try {
      setSeeding(true);
      const benchmarkDs = await api.datasets.seedNovaMart();
      await loadDatasets();
      await selectDataset(benchmarkDs);
      showNotice('Canonical NovaMart benchmark generated and audited.');
    } catch (err: any) {
      alert(`Benchmark generation failed: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  }

  async function handleConfirmSingleMapping(columnId: string, conceptKey?: string) {
    if (!selectedDataset) return;
    try {
      await api.datasets.updateSemanticMapping(selectedDataset.id, columnId, {
        concept_key: conceptKey,
      });
      const mappings = await api.datasets.getSemanticMappings(selectedDataset.id);
      setSemanticMappings(mappings);
      const updatedDs = await api.datasets.get(selectedDataset.id);
      setSelectedDataset(updatedDs);
      showNotice('Semantic concept confirmed.');
    } catch (err: any) {
      alert(`Failed to confirm mapping: ${err.message}`);
    }
  }

  async function handleSaveEditedMapping(columnId: string) {
    if (!selectedDataset) return;
    try {
      await api.datasets.updateSemanticMapping(selectedDataset.id, columnId, {
        concept_key: editConceptKey || undefined,
        business_role: editRole || undefined,
        aggregation: editAggregation || undefined,
      });
      const mappings = await api.datasets.getSemanticMappings(selectedDataset.id);
      setSemanticMappings(mappings);
      const updatedDs = await api.datasets.get(selectedDataset.id);
      setSelectedDataset(updatedDs);
      setEditingMappingKey(null);
      showNotice('Semantic mapping updated and confirmed.');
    } catch (err: any) {
      alert(`Failed to update mapping: ${err.message}`);
    }
  }

  async function handleUnmap(columnId: string) {
    if (!selectedDataset) return;
    try {
      await api.datasets.updateSemanticMapping(selectedDataset.id, columnId, {
        concept_key: undefined,
        business_role: 'attribute',
        aggregation: 'none',
      });
      const mappings = await api.datasets.getSemanticMappings(selectedDataset.id);
      setSemanticMappings(mappings);
      const updatedDs = await api.datasets.get(selectedDataset.id);
      setSelectedDataset(updatedDs);
      showNotice('Column marked as unmapped.');
    } catch (err: any) {
      alert(`Failed to unmap column: ${err.message}`);
    }
  }

  async function handleConfirmAllMappings() {
    if (!selectedDataset) return;
    try {
      setConfirmingAll(true);
      await api.datasets.confirmAllSemanticMappings(selectedDataset.id);
      const [mappings, updatedDs, trans] = await Promise.all([
        api.datasets.getSemanticMappings(selectedDataset.id),
        api.datasets.get(selectedDataset.id),
        api.datasets.getTransformations(selectedDataset.id).catch(() => []),
      ]);
      setSemanticMappings(mappings);
      setSelectedDataset(updatedDs);
      setTransformations(trans);
      showNotice('All suggested semantic concepts confirmed.');
    } catch (err: any) {
      alert(`Failed to confirm all mappings: ${err.message}`);
    } finally {
      setConfirmingAll(false);
    }
  }

  function showNotice(msg: string) {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  }

  // Memoized filter and search
  const confirmedCount = semanticMappings.filter((m) => m.status === 'confirmed').length;
  const suggestedCount = semanticMappings.filter((m) => m.status === 'suggested').length;
  const unmappedCount = semanticMappings.filter((m) => m.status === 'unmapped' || !m.concept_key).length;
  const totalMappings = semanticMappings.length;

  const filteredMappings = useMemo(() => {
    return semanticMappings.filter((m) => {
      // Filter tab
      if (semanticFilter === 'needs_confirmation' && m.status !== 'suggested') return false;
      if (semanticFilter === 'confirmed' && m.status !== 'confirmed') return false;
      if (semanticFilter === 'unmapped' && (m.status !== 'unmapped' && m.concept_key)) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const colMatch = m.column_name?.toLowerCase().includes(query);
        const tblMatch = m.table_name?.toLowerCase().includes(query);
        const conceptMatch = m.concept_name?.toLowerCase().includes(query);
        const roleMatch = m.business_role?.toLowerCase().includes(query);
        if (!colMatch && !tblMatch && !conceptMatch && !roleMatch) return false;
      }
      return true;
    });
  }, [semanticMappings, semanticFilter, searchTerm]);

  const readinessStatus = selectedDataset?.metadata_json?.readiness_status || (selectedDataset?.file_count ? 'audit_pending' : 'awaiting_data');

  if (loading && datasets.length === 0) {
    return <LoadingState message="Auditing business data sources..." />;
  }

  if (error && datasets.length === 0) {
    return <ErrorState message={error} onRetry={loadDatasets} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* Workspace Header */}
      <PageHeader
        kicker="Data Foundation & Health Audit · Semantic Layer"
        plainTitle="Data"
        italicTitle="Workspace"
        description="TRACE grounds underwriting in audited transaction and ERP data. Anomalies are surfaced with explicit provenance and priced into the Data-Quality Load on the Rate Card."
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={handleSeedNovaMart}
              disabled={seeding}
              className="trace-btn trace-btn-secondary"
              style={{ padding: '0.55rem 1.15rem' }}
            >
              {seeding ? 'Generating Benchmark...' : 'Seed NovaMart Benchmark'}
            </button>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="trace-btn trace-btn-primary"
              style={{ padding: '0.55rem 1.25rem' }}
            >
              {showCreate ? 'Cancel' : '+ Register Dataset'}
            </button>
          </div>
        }
      />

      {/* Action Notification Banner */}
      {actionSuccess && (
        <div
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: 'var(--bg-surface-elevated)',
            borderLeft: '3px solid var(--verdict-recommended)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          ✓ {actionSuccess}
        </div>
      )}

      {/* Dataset Registration Form Modal / Panel */}
      {showCreate && (
        <section
          style={{
            padding: '1.5rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--accent-gold)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div className="trace-kicker" style={{ color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>
            Register Ingestion Dataset
          </div>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                DATASET NAME
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. NovaMart ERP Q1-Q4 Transactions"
                required
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
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
                DESCRIPTION & BUSINESS CONTEXT
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Operational scope, date cut-off, and customer account mapping."
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="trace-btn trace-btn-primary"
              style={{ alignSelf: 'flex-start', padding: '0.6rem 1.4rem' }}
            >
              {submitting ? 'Registering...' : 'Register Dataset →'}
            </button>
          </form>
        </section>
      )}

      {/* Dataset Selector Rail / Strip */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="trace-kicker">Active Dataset Collections ({datasets.length})</span>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            Select dataset to inspect health audit & semantic groundings
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {datasets.map((d) => {
            const isSelected = selectedDataset?.id === d.id;
            return (
              <button
                key={d.id}
                onClick={() => selectDataset(d)}
                style={{
                  textAlign: 'left',
                  padding: '0.75rem 1.25rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                  border: isSelected ? '1px solid var(--accent-gold)' : '1px solid var(--border-dim)',
                  minWidth: '280px',
                  maxWidth: '360px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span
                    className="trace-kicker"
                    style={{
                      color: isSelected ? 'var(--accent-gold-light)' : 'var(--text-muted)',
                      fontSize: '0.7rem',
                    }}
                  >
                    {d.source_type}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      color: isSelected ? 'var(--accent-gold)' : 'var(--text-muted)',
                    }}
                  >
                    {isSelected ? '● ACTIVE' : 'SELECT'}
                  </span>
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {d.name}
                </div>
                <div
                  className="trace-mono-num"
                  style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}
                >
                  {d.file_count} files · {d.total_rows.toLocaleString()} rows
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Selected Dataset Workspace */}
      {selectedDataset ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Dataset Summary Strip */}
          <section
            style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="trace-kicker">Dataset Specification</span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedDataset.name}
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px', maxWidth: '850px' }}>
                  {selectedDataset.description || 'No detailed operational description provided.'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <StatusBadge
                  status={readinessStatus === 'ready_for_analysis' ? 'completed' : 'pending'}
                  labelOverride={
                    readinessStatus === 'ready_for_analysis'
                      ? 'READY FOR ANALYSIS'
                      : readinessStatus === 'semantic_confirmation_required' || readinessStatus === 'semantic_mapping_required'
                      ? `CONFIRMATION PENDING (${confirmedCount}/${totalMappings})`
                      : readinessStatus.replace('_', ' ').toUpperCase()
                  }
                />
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1px',
                backgroundColor: 'var(--border-dim)',
                border: '1px solid var(--border-dim)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-primary)' }}>
                <div className="trace-kicker">TOTAL FILES</div>
                <div className="trace-mono-num" style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {files.length}
                </div>
              </div>
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-primary)' }}>
                <div className="trace-kicker">TOTAL RECORDS</div>
                <div className="trace-mono-num" style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedDataset.total_rows.toLocaleString()}
                </div>
              </div>
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-primary)' }}>
                <div className="trace-kicker">DATA HEALTH SCORE</div>
                <div
                  className="trace-mono-num"
                  style={{
                    fontSize: '1.2rem',
                    color:
                      healthSummary?.overall_health_score !== null && healthSummary?.overall_health_score !== undefined
                        ? healthSummary.overall_health_score >= 0.85
                          ? 'var(--verdict-recommended)'
                          : 'var(--verdict-refer)'
                        : 'var(--text-muted)',
                    marginTop: '2px',
                  }}
                >
                  {healthSummary?.overall_health_score !== null && healthSummary?.overall_health_score !== undefined
                    ? `${(healthSummary.overall_health_score * 100).toFixed(0)}%`
                    : 'Awaiting Audit'}
                </div>
              </div>
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-primary)' }}>
                <div className="trace-kicker">SEMANTIC GROUNDING</div>
                <div className="trace-mono-num" style={{ fontSize: '1.2rem', color: 'var(--accent-gold-light)', marginTop: '2px' }}>
                  {confirmedCount} / {totalMappings} Confirmed
                </div>
              </div>
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-primary)' }}>
                <div className="trace-kicker">LAST AUDITED</div>
                <div className="trace-mono-num" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {formatDate(selectedDataset.updated_at || selectedDataset.created_at)}
                </div>
              </div>
            </div>

            {/* Ingest Source File Strip */}
            <form
              onSubmit={handleUpload}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                paddingTop: '0.5rem',
                borderTop: '1px solid var(--border-dim)',
                flexWrap: 'wrap',
              }}
            >
              <span className="trace-kicker" style={{ color: 'var(--text-secondary)' }}>Ingest Table:</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                style={{
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                }}
              />
              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="trace-btn trace-btn-secondary"
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem' }}
              >
                {uploading ? 'Parsing CSV...' : 'Upload & Audit →'}
              </button>
              {uploadError && (
                <span style={{ fontSize: '0.75rem', color: 'var(--verdict-decline)', fontFamily: 'var(--font-mono)' }}>
                  ⚠ {uploadError}
                </span>
              )}
            </form>
          </section>

          {/* Ingested Source Tables List */}
          {files.length > 0 && (
            <section
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                backgroundColor: 'var(--bg-primary)',
              }}
            >
              <div style={{ padding: '0.75rem 1.25rem', backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="trace-kicker">Source CSV Tables ({files.length})</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-dim)' }}>
                    <th style={{ padding: '0.65rem 1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>FILE / TABLE</th>
                    <th style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>SIZE</th>
                    <th style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>PARSER STATUS</th>
                    <th style={{ padding: '0.65rem 1.25rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'right' }}>SHA-256 INTEGRITY</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      <td style={{ padding: '0.65rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {f.filename}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {f.file_size_bytes > 1024 * 1024
                          ? `${(f.file_size_bytes / (1024 * 1024)).toFixed(2)} MB`
                          : `${(f.file_size_bytes / 1024).toFixed(1)} KB`}
                      </td>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        <StatusBadge status={f.status === 'processed' ? 'completed' : f.status} size="sm" />
                      </td>
                      <td style={{ padding: '0.65rem 1.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                        {f.parse_metadata?.sha256 ? f.parse_metadata.sha256.slice(0, 24) + '...' : 'Recorded'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Data Health Report Panel */}
          {healthSummary && (
            <section
              style={{
                padding: '1.5rem',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--border-dim)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span className="trace-kicker">Quality Audit & Penalties</span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
                    Data Health Audit
                  </h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="trace-kicker">Data-Quality Load Weight</span>
                  <div className="trace-mono-num" style={{ fontSize: '1.25rem', color: 'var(--accent-gold)' }}>
                    {healthSummary.overall_health_score !== null
                      ? `${(healthSummary.calculated_data_quality_load_weight * 100).toFixed(1)}% of upside`
                      : 'Pending Ingestion'}
                  </div>
                </div>
              </div>

              {/* Metric Row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)' }}>
                  <span className="trace-kicker">OVERALL HEALTH SCORE</span>
                  <div
                    className="trace-mono-num"
                    style={{
                      fontSize: '1.75rem',
                      fontWeight: 600,
                      color:
                        healthSummary.overall_health_score !== null && healthSummary.overall_health_score < 0.9
                          ? 'var(--verdict-refer)'
                          : 'var(--verdict-recommended)',
                      margin: '0.25rem 0',
                    }}
                  >
                    {healthSummary.overall_health_score !== null ? `${(healthSummary.overall_health_score * 100).toFixed(0)}%` : '—'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {healthSummary.overall_health_score === 1.0 ? 'Clean Baseline' : 'Audited with Discrepancy Penalties'}
                  </div>
                </div>

                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)' }}>
                  <span className="trace-kicker">TOTAL AUDIT FINDINGS</span>
                  <div className="trace-mono-num" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0.25rem 0' }}>
                    {healthSummary.overall_health_score !== null ? healthSummary.total_findings : '—'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Missingness, duplicates, outliers
                  </div>
                </div>

                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)' }}>
                  <span className="trace-kicker">CRITICAL VIOLATIONS</span>
                  <div
                    className="trace-mono-num"
                    style={{
                      fontSize: '1.75rem',
                      fontWeight: 600,
                      color:
                        (healthSummary.findings_by_severity?.critical || 0) > 0
                          ? 'var(--verdict-decline)'
                          : 'var(--verdict-recommended)',
                      margin: '0.25rem 0',
                    }}
                  >
                    {healthSummary.overall_health_score !== null ? healthSummary.findings_by_severity?.critical || 0 : '—'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Automatic Underwriting Blockers
                  </div>
                </div>
              </div>

              {/* Identified Findings List */}
              <div>
                <span className="trace-kicker" style={{ marginBottom: '0.65rem', display: 'block' }}>
                  Identified Quality Anomalies & Treatments
                </span>
                {healthSummary.findings.length === 0 ? (
                  <div style={{ color: 'var(--verdict-recommended)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                    ✓ No data quality penalties identified. Clean baseline confirmed across all tables.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {healthSummary.findings.map((f) => (
                      <DataQualityFindingCard key={f.id} finding={f} />
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Semantic Layer Mapping Workspace */}
          {semanticMappings.length > 0 && (
            <section
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                backgroundColor: 'var(--bg-primary)',
              }}
            >
              {/* Header and Controls */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: 'var(--bg-surface)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <span className="trace-kicker">Deterministic Business Ontology</span>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
                    Semantic Concept Catalog & Column Grounding
                  </h4>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {/* Search box */}
                  <input
                    type="text"
                    placeholder="Search column, concept, table..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-dim)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      color: 'var(--text-primary)',
                      minWidth: '220px',
                    }}
                  />

                  {/* Filter Tabs */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '2px',
                      backgroundColor: 'var(--bg-primary)',
                      padding: '2px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-dim)',
                    }}
                  >
                    {[
                      { key: 'all', label: `All (${totalMappings})` },
                      { key: 'needs_confirmation', label: `Suggested (${suggestedCount})` },
                      { key: 'confirmed', label: `Confirmed (${confirmedCount})` },
                      { key: 'unmapped', label: `Unmapped (${unmappedCount})` },
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setSemanticFilter(f.key as any)}
                        style={{
                          padding: '0.25rem 0.65rem',
                          fontSize: '0.75rem',
                          fontFamily: 'var(--font-mono)',
                          borderRadius: 'var(--radius-sm)',
                          color: semanticFilter === f.key ? 'var(--accent-gold-light)' : 'var(--text-muted)',
                          backgroundColor: semanticFilter === f.key ? 'var(--bg-surface-elevated)' : 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {suggestedCount > 0 && (
                    <button
                      onClick={handleConfirmAllMappings}
                      disabled={confirmingAll}
                      className="trace-btn trace-btn-primary"
                      style={{ padding: '0.4rem 0.95rem', fontSize: '0.75rem' }}
                    >
                      {confirmingAll ? 'CONFIRMING...' : 'CONFIRM ALL MAPPINGS ↵'}
                    </button>
                  )}
                </div>
              </div>

              {/* Mappings Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-dim)' }}>
                      <th style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>PHYSICAL COLUMN</th>
                      <th style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>BUSINESS CONCEPT</th>
                      <th style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>ROLE</th>
                      <th style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>TYPE</th>
                      <th style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>AGGREGATION</th>
                      <th style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>STATUS</th>
                      <th style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMappings.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                          No semantic mappings matching filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredMappings.map((m) => {
                        const key = `${m.table_name}.${m.column_name}`;
                        const isExpanded = expandedMappingKey === key;
                        const isEditing = editingMappingKey === key;
                        const isConfirmed = m.status === 'confirmed';
                        const isSuggested = m.status === 'suggested';

                        return (
                          <React.Fragment key={key}>
                            <tr
                              style={{
                                borderBottom: '1px solid var(--border-dim)',
                                backgroundColor: isSuggested ? 'rgba(201, 168, 76, 0.03)' : 'transparent',
                              }}
                            >
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.column_name}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                                  ({m.table_name})
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 1rem', color: isConfirmed ? 'var(--accent-gold-light)' : 'var(--text-primary)', fontWeight: 500 }}>
                                {m.concept_name || 'Unmapped'}
                              </td>
                              <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                                {m.business_role?.toUpperCase() || 'ATTRIBUTE'}
                              </td>
                              <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {m.data_type}
                              </td>
                              <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {m.aggregation?.toUpperCase() || 'NONE'}
                              </td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <span
                                  style={{
                                    padding: '2px 7px',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.7rem',
                                    fontFamily: 'var(--font-mono)',
                                    fontWeight: 600,
                                    backgroundColor: isConfirmed
                                      ? 'var(--verdict-recommended-bg)'
                                      : isSuggested
                                      ? 'var(--verdict-conditions-bg)'
                                      : 'rgba(107, 114, 128, 0.15)',
                                    color: isConfirmed
                                      ? 'var(--verdict-recommended)'
                                      : isSuggested
                                      ? 'var(--verdict-conditions)'
                                      : 'var(--text-muted)',
                                    border: `1px solid ${
                                      isConfirmed
                                        ? 'var(--verdict-recommended-border)'
                                        : isSuggested
                                        ? 'var(--verdict-conditions-border)'
                                        : 'var(--border-dim)'
                                    }`,
                                  }}
                                >
                                  {isConfirmed ? 'CONFIRMED' : isSuggested ? 'SUGGESTED' : 'UNMAPPED'}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                                  {isSuggested && (
                                    <button
                                      onClick={() => handleConfirmSingleMapping(m.column_id, m.concept_key || undefined)}
                                      style={{
                                        padding: '0.2rem 0.55rem',
                                        fontSize: '0.7rem',
                                        fontFamily: 'var(--font-mono)',
                                        color: 'var(--accent-gold-light)',
                                        border: '1px solid var(--accent-gold-dim)',
                                        borderRadius: 'var(--radius-sm)',
                                        backgroundColor: 'var(--bg-surface)',
                                      }}
                                    >
                                      CONFIRM ✓
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      if (isEditing) {
                                        setEditingMappingKey(null);
                                      } else {
                                        setEditingMappingKey(key);
                                        setEditConceptKey(m.concept_key || '');
                                        setEditRole(m.business_role || 'attribute');
                                        setEditAggregation(m.aggregation || 'none');
                                      }
                                    }}
                                    style={{
                                      padding: '0.2rem 0.55rem',
                                      fontSize: '0.7rem',
                                      fontFamily: 'var(--font-mono)',
                                      color: 'var(--text-secondary)',
                                      border: '1px solid var(--border-dim)',
                                      borderRadius: 'var(--radius-sm)',
                                      backgroundColor: 'var(--bg-surface)',
                                    }}
                                  >
                                    {isEditing ? 'CANCEL' : 'EDIT'}
                                  </button>
                                  <button
                                    onClick={() => setExpandedMappingKey(isExpanded ? null : key)}
                                    style={{
                                      padding: '0.2rem 0.45rem',
                                      fontSize: '0.7rem',
                                      fontFamily: 'var(--font-mono)',
                                      color: 'var(--text-muted)',
                                    }}
                                  >
                                    {isExpanded ? '▲' : '▼'}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Editing Drawer */}
                            {isEditing && (
                              <tr style={{ backgroundColor: 'var(--bg-surface-elevated)' }}>
                                <td colSpan={7} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
                                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '3px' }}>
                                        CONCEPT KEY (CATALOG)
                                      </label>
                                      <input
                                        type="text"
                                        value={editConceptKey}
                                        onChange={(e) => setEditConceptKey(e.target.value)}
                                        placeholder="e.g. region_id, customer_id, unit_cost"
                                        style={{
                                          padding: '0.35rem 0.65rem',
                                          backgroundColor: 'var(--bg-primary)',
                                          border: '1px solid var(--border-subtle)',
                                          borderRadius: 'var(--radius-sm)',
                                          color: 'var(--text-primary)',
                                          fontFamily: 'var(--font-mono)',
                                          fontSize: '0.8rem',
                                          minWidth: '220px',
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '3px' }}>
                                        BUSINESS ROLE
                                      </label>
                                      <select
                                        value={editRole}
                                        onChange={(e) => setEditRole(e.target.value)}
                                        style={{
                                          padding: '0.35rem 0.65rem',
                                          backgroundColor: 'var(--bg-primary)',
                                          border: '1px solid var(--border-subtle)',
                                          borderRadius: 'var(--radius-sm)',
                                          color: 'var(--text-primary)',
                                          fontFamily: 'var(--font-mono)',
                                          fontSize: '0.8rem',
                                        }}
                                      >
                                        <option value="identifier">IDENTIFIER</option>
                                        <option value="dimension">DIMENSION</option>
                                        <option value="measure">MEASURE</option>
                                        <option value="attribute">ATTRIBUTE</option>
                                        <option value="temporal">TEMPORAL</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '3px' }}>
                                        DEFAULT AGGREGATION
                                      </label>
                                      <select
                                        value={editAggregation}
                                        onChange={(e) => setEditAggregation(e.target.value)}
                                        style={{
                                          padding: '0.35rem 0.65rem',
                                          backgroundColor: 'var(--bg-primary)',
                                          border: '1px solid var(--border-subtle)',
                                          borderRadius: 'var(--radius-sm)',
                                          color: 'var(--text-primary)',
                                          fontFamily: 'var(--font-mono)',
                                          fontSize: '0.8rem',
                                        }}
                                      >
                                        <option value="none">NONE</option>
                                        <option value="sum">SUM</option>
                                        <option value="avg">AVG</option>
                                        <option value="count">COUNT</option>
                                        <option value="distinct_count">DISTINCT_COUNT</option>
                                      </select>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      <button
                                        onClick={() => handleSaveEditedMapping(m.column_id)}
                                        className="trace-btn trace-btn-primary"
                                        style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem' }}
                                      >
                                        SAVE & CONFIRM
                                      </button>
                                      <button
                                        onClick={() => handleUnmap(m.column_id)}
                                        className="trace-btn trace-btn-secondary"
                                        style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem', color: 'var(--verdict-decline)' }}
                                      >
                                        UNMAP
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}

                            {/* Expandable Details Drawer */}
                            {isExpanded && !isEditing && (
                              <tr style={{ backgroundColor: 'var(--bg-surface)' }}>
                                <td colSpan={7} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.8rem' }}>
                                    <div>
                                      <span className="trace-kicker">PROVENANCE METHOD</span>
                                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '2px' }}>
                                        {m.provenance_method}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="trace-kicker">DOMAIN</span>
                                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-gold-light)', marginTop: '2px' }}>
                                        {m.domain || 'general'}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="trace-kicker">UNIT</span>
                                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        {m.unit || 'None'}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="trace-kicker">COLUMN ID</span>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        {m.column_id}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      ) : (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
          <div className="trace-kicker" style={{ color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>No Dataset Active</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Register a business dataset or seed the canonical NovaMart benchmark to inspect data health checks and semantic groundings.
          </p>
          <button onClick={handleSeedNovaMart} disabled={seeding} className="trace-btn trace-btn-primary">
            {seeding ? 'Seeding...' : 'Seed NovaMart Benchmark'}
          </button>
        </div>
      )}
    </div>
  );
}
