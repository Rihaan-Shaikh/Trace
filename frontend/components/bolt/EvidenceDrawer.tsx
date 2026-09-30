import { type EvidenceNode } from '@/lib/bolt/types';
import { X, ArrowDown } from 'lucide-react';
import { type ReactNode } from 'react';

interface EvidenceDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  root: EvidenceNode;
}

const LEVEL_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  Fact: { color: 'text-ink-600', bg: 'bg-parchment-50', border: 'border-ink-200' },
  Calculation: { color: 'text-brass-600', bg: 'bg-brass-50', border: 'border-brass-200' },
  Model: { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
  Recommendation: { color: 'text-vermilion-600', bg: 'bg-vermilion-50', border: 'border-vermilion-200' },
};

function EvidenceNodeRow({ node, depth }: { node: EvidenceNode; depth: number }) {
  const style = LEVEL_STYLES[node.level] || LEVEL_STYLES.Fact;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="animate-slide-up">
      <div
        className={`flex items-baseline gap-3 py-3 ${depth > 0 ? 'pl-6' : ''}`}
        style={{ paddingLeft: `${depth * 24}px` }}
      >
        {/* Connector line */}
        {depth > 0 && (
          <div className="absolute -ml-3 w-px h-full bg-ink-100" style={{ marginLeft: `${-12 + depth * 24}px` }} />
        )}

        <div className={`flex-1 flex items-center justify-between gap-4 ${style.bg} ${style.border} border rounded-sm px-3 py-2`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`text-[10px] font-medium ${style.color} uppercase tracking-wide whitespace-nowrap`}>
              {node.level}
            </span>
            <span className="text-sm text-ink-700 font-medium truncate">{node.label}</span>
          </div>
          {node.value && (
            <span className="text-sm tabular-nums text-ink-800 font-semibold whitespace-nowrap">
              {node.value}
            </span>
          )}
        </div>
      </div>

      {hasChildren && (
        <div className="relative">
          <div className="flex items-center justify-center py-1" style={{ paddingLeft: `${depth * 24 + 12}px` }}>
            <ArrowDown className="w-3 h-3 text-ink-200" strokeWidth={1.5} />
          </div>
          {node.children!.map((child) => (
            <EvidenceNodeRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function EvidenceDrawer({ open, onClose, title, root }: EvidenceDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink-900/20 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-[520px] bg-parchment-50 shadow-drawer animate-slide-in-right overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-parchment-50/95 backdrop-blur-sm border-b rule px-6 py-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-ink-400 font-medium mb-0.5">Evidence chain</div>
            <h3 className="font-serif text-xl text-ink-800">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-ink-400 hover:text-ink-700 hover:bg-parchment-100 transition-colors focus-ring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chain */}
        <div className="px-6 py-6">
          <div className="text-xs text-ink-400 mb-4 leading-relaxed">
            Every number in TRACE traces back to source records, calculations, and model assumptions.
            Inspect each link in the chain.
          </div>
          <EvidenceNodeRow node={root} depth={0} />
        </div>

        {/* Footer */}
        <div className="border-t rule px-6 py-4 mt-4">
          <div className="text-xs text-ink-400">
            Levels: <span className="text-ink-600">Fact</span> ·{' '}
            <span className="text-brass-600">Calculation</span> ·{' '}
            <span className="text-slate-600">Model</span> ·{' '}
            <span className="text-vermilion-600">Recommendation</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EvidenceLinkProps {
  onClick: () => void;
  children: ReactNode;
}

export function EvidenceLink({ onClick, children }: EvidenceLinkProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs text-vermilion-600 hover:text-vermilion-700 hover:underline underline-offset-2 transition-colors font-medium"
    >
      {children}
    </button>
  );
}
