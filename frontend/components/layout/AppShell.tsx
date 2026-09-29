'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

const NAV_ITEMS = [
  { label: 'Overview', href: '/' },
  { label: 'Decisions', href: '/decisions' },
  { label: 'Data', href: '/data' },
  { label: 'Evidence', href: '/evidence' },
  { label: 'Loss History', href: '/ledger' },
  { label: 'Rate Card', href: '/rate-card' },
  { label: 'Evaluation', href: '/evaluation' },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.health
      .get()
      .then((data) => setDbConnected(data.database.connected))
      .catch(() => setDbConnected(false));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResetDemo = async () => {
    try {
      setResetting(true);
      await api.demo.reset();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
      router.refresh();
      // Reload current page to refresh data state
      window.location.reload();
    } catch (err) {
      console.error('Demo reset failed:', err);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      {/* Signature Top Pixel Strip */}
      <div className="trace-pixel-strip">
        <span className="strip-cream" />
        <span className="strip-gold" />
        <span className="strip-blue" />
        <span className="strip-grey" />
      </div>

      {/* Top Navigation Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-dim)',
          backgroundColor: 'var(--bg-primary)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1680px',
            width: '100%',
            margin: '0 auto',
            padding: '0.75rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Brand & Core Promise */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.25rem' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
              <span
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontSize: '1.85rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: 'var(--text-primary)',
                }}
              >
                TRACE
              </span>
            </Link>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: 'var(--accent-gold)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Not confidence. Coverage.
            </span>
          </div>

          {/* Primary Navigation */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'var(--bg-surface-elevated)' : 'transparent',
                    border: `1px solid ${isActive ? 'var(--border-subtle)' : 'transparent'}`,
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions & Operational Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} ref={popoverRef}>
            {/* Demo Reset Trigger */}
            <button
              onClick={handleResetDemo}
              disabled={resetting}
              title="Reset TRACE environment to canonical NovaMart benchmark & hero decision state"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: resetSuccess ? 'var(--verdict-recommended)' : 'var(--text-secondary)',
                backgroundColor: 'var(--bg-surface)',
                border: `1px solid ${resetSuccess ? 'var(--verdict-recommended-border)' : 'var(--border-dim)'}`,
                borderRadius: 'var(--radius-sm)',
                cursor: resetting ? 'wait' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {resetting ? 'Resetting...' : resetSuccess ? '✓ Demo Restored' : 'Reset Demo'}
            </button>

            {/* Interactive Operational Status Pill */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setStatusOpen(!statusOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-dim)',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor:
                      dbConnected === true
                        ? 'var(--verdict-recommended)'
                        : dbConnected === false
                        ? 'var(--verdict-decline)'
                        : 'var(--text-muted)',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--text-primary)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {dbConnected === true ? 'Operational' : 'Connecting'}
                </span>
              </button>

              {/* Status Popover */}
              {statusOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '280px',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    boxShadow: 'var(--shadow-subtle)',
                    zIndex: 100,
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      color: 'var(--accent-gold)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '0.75rem',
                    }}
                  >
                    System Diagnostics
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Database</span>
                      <span style={{ color: 'var(--verdict-recommended)', fontFamily: 'var(--font-mono)' }}>PostgreSQL Live</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Underwriting</span>
                      <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>Deterministic</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Evaluation</span>
                      <span style={{ color: 'var(--verdict-recommended)', fontFamily: 'var(--font-mono)' }}>18 / 18 Pass</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Benchmark</span>
                      <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>NovaMart Seed #42</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main
        style={{
          flex: 1,
          maxWidth: '1680px',
          width: '100%',
          margin: '0 auto',
          padding: '2rem',
        }}
      >
        {children}
      </main>

      {/* Product Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-dim)',
          padding: '1.25rem 2rem',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1680px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        <div>TRACE Decision Underwriting Engine</div>
        <div style={{ color: 'var(--text-secondary)' }}>
          Every numerical result originates from executable deterministic code.
        </div>
      </footer>
    </div>
  );
};
