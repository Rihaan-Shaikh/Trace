import React, { useState } from 'react';
import { EvidenceItem } from '@/lib/types';

interface Column<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  getRowKey?: (item: T, index: number) => string | number;
}

export function DataTable<T>({
  columns,
  data,
  emptyMessage = 'No records found.',
  onRowClick,
  getRowKey,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div
        style={{
          padding: '2.5rem 1.5rem',
          textAlign: 'left',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          backgroundColor: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-dim)',
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      style={{
        overflowX: 'auto',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '0.875rem',
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            {columns.map((col, idx) => (
              <th
                key={idx}
                style={{
                  padding: '0.75rem 1rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  width: col.width,
                  textAlign: col.align || 'left',
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rIdx) => {
            const key = getRowKey ? getRowKey(row, rIdx) : rIdx;
            const isClickable = Boolean(onRowClick);

            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={isClickable ? 'data-table-row clickable' : 'data-table-row'}
                style={{
                  borderBottom: '1px solid var(--border-dim)',
                  cursor: isClickable ? 'pointer' : 'default',
                  transition: 'background-color 0.12s ease',
                }}
              >
                {columns.map((col, cIdx) => (
                  <td
                    key={cIdx}
                    style={{
                      padding: '0.85rem 1rem',
                      color: 'var(--text-primary)',
                      textAlign: col.align || 'left',
                      verticalAlign: 'middle',
                    }}
                  >
                    {col.accessor(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <style jsx>{`
        .clickable:hover {
          background-color: var(--bg-surface-elevated) !important;
        }
      `}</style>
    </div>
  );
}

export const ExpandableEvidenceRow: React.FC<{ evidence: EvidenceItem }> = ({ evidence }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        border: '1px solid var(--border-dim)',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'var(--bg-subtle)',
        marginBottom: '0.5rem',
        overflow: 'hidden',
        transition: 'border-color 0.15s ease',
      }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '0.85rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          backgroundColor: isOpen ? 'var(--bg-surface)' : 'transparent',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
          <span
            style={{
              padding: '2px 6px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-dim)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.7rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-gold)',
              flexShrink: 0,
            }}
          >
            {evidence.statement_level}
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
            {evidence.title}
          </span>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: 'var(--accent-gold-light)',
            letterSpacing: '0.04em',
            flexShrink: 0,
            marginLeft: '1rem',
          }}
        >
          {isOpen ? '▲ HIDE PROVENANCE' : '▼ AUDIT PROVENANCE'}
        </span>
      </div>

      {isOpen && (
        <div
          style={{
            padding: '1.25rem',
            borderTop: '1px solid var(--border-dim)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
              Statement
            </span>
            <div style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {evidence.statement_text}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-dim)' }}>
            {evidence.metric_name && (
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                  Metric
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-gold-light)', fontSize: '0.8rem' }}>
                  {evidence.metric_name}
                </span>
              </div>
            )}
            {evidence.source_table_name && (
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                  Source Table
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                  {evidence.source_table_name}
                </span>
              </div>
            )}
            {evidence.calculation_id && (
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                  Calculation ID
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-gold-dim)', fontSize: '0.8rem' }}>
                  {evidence.calculation_id}
                </span>
              </div>
            )}
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                Recorded At
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {new Date(evidence.created_at).toUTCString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
