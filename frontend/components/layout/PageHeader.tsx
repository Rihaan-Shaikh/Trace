import React from 'react';

interface PageHeaderProps {
  plainTitle: string;
  italicTitle?: string;
  kicker?: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  plainTitle,
  italicTitle,
  kicker,
  description,
  actions,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingBottom: '1.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}
    >
      <div>
        {kicker && <div className="trace-kicker" style={{ marginBottom: '0.25rem' }}>{kicker}</div>}
        <h1 className="editorial-headline" style={{ fontSize: '2.5rem', lineHeight: 1.1 }}>
          {plainTitle}
          {italicTitle && <em>{italicTitle}</em>}
        </h1>
        {description && (
          <p
            style={{
              color: 'var(--text-secondary)',
              marginTop: '0.5rem',
              maxWidth: '650px',
              fontSize: '0.95rem',
            }}
          >
            {description}
          </p>
        )}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
};
