import { type ReactNode } from 'react';

interface SectionProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function Section({ eyebrow, title, subtitle, children, className = '' }: SectionProps) {
  return (
    <section className={`py-10 ${className}`}>
      {eyebrow && (
        <div className="text-xs font-medium text-ink-400 mb-2 tracking-wide">{eyebrow}</div>
      )}
      <h2 className="font-serif text-4xl md:text-5xl tracking-tight leading-none mb-4 text-ink-800 text-balance">{title}</h2>
      {subtitle && (
        <p className="mt-2 text-ink-500 text-base w-full pr-8">{subtitle}</p>
      )}
      <div className="mt-8">{children}</div>
    </section>
  );
}

interface DividerProps {
  className?: string;
}

export function Divider({ className = '' }: DividerProps) {
  return <div className={`border-t rule ${className}`} />;
}

interface StatusMarkProps {
  state: 'mapped' | 'pending' | 'completed' | 'verified' | 'flagged';
}

export function StatusMark({ state }: StatusMarkProps) {
  const styles: Record<StatusMarkProps['state'], string> = {
    mapped: 'bg-brass-300',
    pending: 'bg-ink-200',
    completed: 'bg-brass-400',
    verified: 'bg-brass-400',
    flagged: 'bg-vermilion-400',
  };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${styles[state]}`} />;
}

interface VerdictBadgeProps {
  verdict: string;
  size?: 'sm' | 'md' | 'lg';
}

export function VerdictBadge({ verdict, size = 'md' }: VerdictBadgeProps) {
  const isRefer = verdict === 'Refer';
  const isDecline = verdict === 'Decline';
  const isApproved = verdict === 'Approved';
  const isLapsed = isRefer || isDecline;

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <span
      className={`inline-flex items-center gap-2 font-medium ${sizeClasses[size]} rounded-sm border ${
        isLapsed
          ? 'border-vermilion-300 text-vermilion-700 bg-vermilion-50'
          : isApproved
            ? 'border-brass-300 text-brass-700 bg-brass-50'
            : 'border-ink-200 text-ink-600 bg-parchment-50'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isLapsed ? 'bg-vermilion-500' : isApproved ? 'bg-brass-400' : 'bg-ink-400'
        }`}
      />
      {verdict}
    </span>
  );
}

interface FootnoteProps {
  children: ReactNode;
}

export function Footnote({ children }: FootnoteProps) {
  return (
    <p className="text-xs text-ink-400 mt-1 leading-relaxed">{children}</p>
  );
}


