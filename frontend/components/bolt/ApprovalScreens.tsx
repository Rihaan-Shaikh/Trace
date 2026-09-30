import { type View, type SandboxAssumptions, type DecisionCalc } from '@/lib/bolt/types';
import { computeDecision, formatCurrency, DEFAULT_ASSUMPTIONS } from '@/lib/bolt/data';
import { ArrowRight, Check, X, Pencil } from 'lucide-react';
import { useState } from 'react';
import { VerdictBadge, Divider } from './ui/Section';

interface ApprovalScreenProps {
  onNavigate: (view: View) => void;
  assumptions: SandboxAssumptions;
  onApprove: (action: 'approve' | 'modify' | 'reject', note: string) => void;
}

export function ApprovalScreen({ onNavigate, assumptions, onApprove }: ApprovalScreenProps) {
  const calc = computeDecision(assumptions);
  const [action, setAction] = useState<'approve' | 'modify' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    if (!action) return;
    onApprove(action, note);
    setConfirmed(true);
    setTimeout(() => onNavigate('decision-record'), 600);
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-base-900 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-brass-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-brass-600" strokeWidth={1.5} />
          </div>
          <div className="text-sm text-ink-300">Writing decision record…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-900">
      <div className="max-w-canvas mx-auto px-8 lg:px-16 pt-16 pb-20">
        {/* Header */}
        <div className="mb-12">
          <div className="text-xs text-ink-400 font-medium mb-2">NovaMart · approval</div>
          <h1 className="font-serif text-hero text-ink-50 text-balance">
            Your decision.
          </h1>
          <p className="mt-3 text-ink-300 text-lg max-w-prose-doc leading-relaxed">
            TRACE recommends and prices. You decide.
          </p>
        </div>

        {/* Decision summary */}
        <div className="border-t border-b rule py-8 mb-10">
          <div className="grid lg:grid-cols-[1fr_auto] gap-8">
            <div>
              <div className="text-xs text-ink-400 mb-2">Recommendation</div>
              <div className="text-xl text-ink-50 font-medium leading-relaxed max-w-2xl">
                Stop blanket discounts for low-margin customers.
              </div>
              <div className="mt-4 flex items-center gap-3">
                <VerdictBadge verdict={calc.verdict} />
                <span className="text-xs text-ink-400">version 1.0</span>
              </div>
            </div>
            <div className="lg:text-right">
              <div className="text-xs text-ink-400 mb-1">Decision Premium</div>
              <div className="editorial-num text-3xl text-ink-50 tabular-nums">
                {formatCurrency(calc.premium)}
              </div>
              <div className="text-xs text-ink-400 mt-1 tabular-nums">
                {calc.premiumRate.toFixed(1)}% of upside
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-8">
          <div className="text-xs text-ink-400 font-medium mb-4">Decision</div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setAction('approve')}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-sm text-sm font-medium transition-all border-2 ${
                action === 'approve'
                  ? 'bg-ink-50 text-base-900 border-ink-800'
                  : 'bg-base-800 text-ink-100 border-rule hover:border-base-500'
              }`}
            >
              <Check className="w-4 h-4" />
              Approve
            </button>
            <button
              onClick={() => setAction('modify')}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-sm text-sm font-medium transition-all border-2 ${
                action === 'modify'
                  ? 'bg-ink-50 text-base-900 border-ink-800'
                  : 'bg-base-800 text-ink-300 border-rule hover:border-base-500'
              }`}
            >
              <Pencil className="w-4 h-4" />
              Modify
            </button>
            <button
              onClick={() => setAction('reject')}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-sm text-sm font-medium transition-all border-2 ${
                action === 'reject'
                  ? 'bg-vermilion-600 text-base-900 border-vermilion-600'
                  : 'bg-base-800 text-ink-300 border-rule hover:border-base-500'
              }`}
            >
              <X className="w-4 h-4" />
              Reject
            </button>
          </div>
        </div>

        {/* Note */}
        {action && (
          <div className="animate-fade-in">
            <div className="text-xs text-ink-400 font-medium mb-3">Add a note</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note for the decision record…"
              className="w-full min-h-[80px] bg-base-800 border rule rounded-sm px-4 py-3 text-sm text-ink-100 placeholder:text-ink-300 resize-none focus:outline-none focus:border-vermilion-300 transition-colors"
            />

            <div className="mt-4 px-5 py-3 bg-base-800 border rule rounded-sm">
              <div className="text-xs text-ink-300 leading-relaxed">
                This {action} will create a Decision Record and write the prediction to the
                Loss History Ledger.
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleConfirm}
                className="group inline-flex items-center gap-2 bg-ink-50 text-base-900 px-6 py-3 rounded-sm text-sm font-medium hover:bg-ink-700 transition-colors focus-ring"
              >
                Confirm {action}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {!action && (
          <div className="mt-8">
            <div className="text-sm text-ink-400 leading-relaxed max-w-prose-doc">
              The human is the final authority. TRACE recommends and prices. The human decides.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Decision Record ──────────────────────────────────────────────────────────

interface DecisionRecordScreenProps {
  onNavigate: (view: View) => void;
  assumptions: SandboxAssumptions;
  approvalAction: 'approve' | 'modify' | 'reject';
  approvalNote: string;
  approverName: string;
}

export function DecisionRecordScreen({
  onNavigate,
  assumptions,
  approvalAction,
  approvalNote,
  approverName,
}: DecisionRecordScreenProps) {
  const calc = computeDecision(assumptions);
  const timestamp = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-base-900">
      <div className="max-w-canvas mx-auto px-8 lg:px-16 pt-16 pb-20">
        {/* Header */}
        <div className="mb-12">
          <div className="text-xs text-ink-400 font-medium mb-2">NovaMart · record</div>
          <h1 className="font-serif text-hero text-ink-50 text-balance">
            Decision record
          </h1>
        </div>

        {/* Document */}
        <div className="border-2 rule rounded-sm bg-base-800 px-8 lg:px-12 py-10 max-w-3xl">
          {/* Record header */}
          <div className="flex items-center justify-between border-b rule pb-6 mb-8">
            <div>
              <div className="text-xs text-ink-400 mb-1">Record no.</div>
              <div className="text-sm font-mono text-ink-100">DR-2026-09-30-001</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-ink-400 mb-1">Status</div>
              <div className="text-sm font-medium text-brass-600">
                {approvalAction === 'approve' ? 'Approved' : approvalAction === 'modify' ? 'Modified' : 'Rejected'}
              </div>
            </div>
          </div>

          {/* Decision */}
          <div className="mb-8">
            <div className="text-xs text-ink-400 mb-2">Decision</div>
            <div className="text-lg text-ink-50 font-medium leading-relaxed">
              Stop blanket discounts for low-margin customers.
            </div>
          </div>

          {/* Key facts grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-8">
            <RecordField label="Verdict" value={calc.verdict} />
            <RecordField label="Decision Premium" value={formatCurrency(calc.premium)} mono />
            <RecordField label="Premium rate" value={`${calc.premiumRate.toFixed(1)}%`} mono />
            <RecordField label="Projected upside" value={formatCurrency(calc.projectedUpside)} mono />
            <RecordField label="Net-loss probability" value={`${calc.netLossProbability}%`} mono />
            <RecordField label="Coverage state" value={calc.coverageState === 'lapsed' ? 'Lapsed' : 'Covered'} />
          </div>

          {/* Exposure */}
          <div className="border-t rule pt-6 mb-8">
            <div className="text-xs text-ink-400 mb-3">Exposure</div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <RecordField label="P10 outcome" value={formatCurrency(calc.exposure.p10)} small />
              <RecordField label="Average worst 10%" value={formatCurrency(calc.exposure.avgWorst10)} small />
              <RecordField label="Worst plausible" value={formatCurrency(calc.exposure.worstPlausible)} small />
              <RecordField label="Data exposure" value={formatCurrency(calc.exposure.dataExposure)} small />
            </div>
          </div>

          {/* Coverage lapse conditions */}
          <div className="border-t rule pt-6 mb-8">
            <div className="text-xs text-ink-400 mb-3">Coverage lapse conditions</div>
            <div className="space-y-2">
              <div className="text-sm text-ink-200">Segment churn — 3.1% current, 6.2% lapse threshold</div>
              <div className="text-sm text-ink-200">Top account concentration — 1 of 3 exposed, 2 of 3 lapse</div>
              <div className="text-sm text-ink-200">Competitor price gap — unknown, {'>'}15% lapse</div>
              <div className="text-sm text-ink-200">Low-margin definition — 18% cut-off, +3 points lapse</div>
            </div>
          </div>

          {/* Approval */}
          <div className="border-t rule pt-6 mb-8">
            <div className="text-xs text-ink-400 mb-3">Approval</div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <RecordField label="Approver" value={approverName} />
              <RecordField label="Action" value={approvalAction} />
              <RecordField label="Timestamp" value={timestamp} />
              <RecordField label="Version" value="1.0" />
            </div>
            {approvalNote && (
              <div className="mt-4">
                <div className="text-xs text-ink-400 mb-1">Note</div>
                <div className="text-sm text-ink-200 italic">“{approvalNote}”</div>
              </div>
            )}
          </div>

          {/* Signature line */}
          <div className="border-t rule pt-8 mt-8">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs text-ink-400 mb-1">Signed</div>
                <div className="font-serif text-lg text-ink-100 italic">{approverName}</div>
                <div className="text-xs text-ink-400 mt-1">{timestamp}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-ink-400 mb-1">TRACE</div>
                <div className="font-serif text-lg text-ink-100">Underwritten</div>
                <div className="text-xs text-ink-400 mt-1">Not confidence. Coverage.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-10 flex items-center justify-between">
          <div className="text-xs text-ink-400">
            This record has been written to the Loss History Ledger.
          </div>
          <button
            onClick={() => onNavigate('ledger')}
            className="group inline-flex items-center gap-2 bg-ink-50 text-base-900 px-6 py-3 rounded-sm text-sm font-medium hover:bg-ink-700 transition-colors focus-ring"
          >
            View ledger
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordField({ label, value, mono, small }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div>
      <div className="text-xs text-ink-400 mb-1">{label}</div>
      <div className={`${small ? 'text-sm' : 'text-base'} ${mono ? 'tabular-nums' : ''} text-ink-100 font-medium`}>
        {value}
      </div>
    </div>
  );
}
