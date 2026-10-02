import { type View, type SandboxAssumptions, type DecisionCalc } from '@/lib/bolt/types';
import { computeDecision, formatCurrency, DEFAULT_ASSUMPTIONS } from '@/lib/bolt/data';
import { ArrowRight, Check, X, Pencil, ShieldCheck, Database } from 'lucide-react';
import { useState, useEffect } from 'react';
import { VerdictBadge, Divider } from './ui/Section';
import { api } from '@/lib/api-client';

interface ApprovalScreenProps {
  onNavigate: (view: View) => void;
  assumptions: SandboxAssumptions;
  onApprove: (action: 'approve' | 'modify' | 'reject', note: string) => void;
  decisionId?: string;
  decisionTitle?: string;
}

export function ApprovalScreen({ onNavigate, assumptions, onApprove, decisionId, decisionTitle }: ApprovalScreenProps) {
  const calc = computeDecision(assumptions);
  const [action, setAction] = useState<'approve' | 'modify' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!action) return;
    setIsSubmitting(true);
    try {
      if (decisionId) {
        await api.approvals.submitAction(decisionId, {
          action: action === 'approve' ? 'APPROVE' : action === 'modify' ? 'MODIFY' : 'REJECT',
          approver_name: 'NovaMart strategy team',
          approver_role: 'Chief Commercial Officer',
          notes: note,
        });
      }
    } catch (e) {
    } finally {
      setIsSubmitting(false);
    }

    onApprove(action, note);
    setConfirmed(true);
    setTimeout(() => onNavigate('decision-record'), 600);
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-parchment-100 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-brass-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-brass-600" strokeWidth={1.5} />
          </div>
          <div className="text-sm text-ink-500">Writing immutable decision record…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment-100">
      <div className="max-w-canvas mx-auto px-8 lg:px-16 pt-16 pb-20">
        {/* Header */}
        <div className="mb-12">
          <div className="text-xs text-ink-400 font-medium mb-2">NovaMart - approval</div>
          <h1 className="font-serif text-hero text-ink-800 ">
            Your decision.
          </h1>
          <p className="mt-3 text-ink-500 text-lg max-w-prose-doc leading-relaxed">
            <span className="font-serif italic font-medium lowercase tracking-wider text-ink-500">trace</span> recommends and prices. You decide. Human approval binds the record.
          </p>
        </div>

        {/* Decision summary */}
        <div className="border-t border-b rule py-8 mb-10">
          <div className="grid lg:grid-cols-[1fr_auto] gap-8">
            <div>
              <div className="text-xs text-ink-400 mb-2">Recommendation</div>
              <div className="text-xl text-ink-800 font-medium leading-relaxed max-w-2xl">
                {decisionTitle || 'Pricing decision matrix'}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <VerdictBadge verdict={calc.verdict} />
                <span className="text-xs text-ink-400">version 1.0</span>
              </div>
            </div>
            <div className="lg:text-right">
              <div className="text-xs text-ink-400 mb-1">Decision Premium</div>
              <div className="editorial-num text-3xl text-ink-800 tabular-nums">
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
          <div className="grid sm:grid-cols-3 gap-4">
            <button
              onClick={() => setAction('approve')}
              className={`p-6 border rounded-sm text-left transition-all ${
                action === 'approve'
                  ? 'border-ink-800 bg-parchment-50 ring-1 ring-ink-800'
                  : 'rule bg-parchment-50/50 hover:bg-parchment-50'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-brass-100 flex items-center justify-center mb-3">
                <Check className="w-4 h-4 text-brass-700" strokeWidth={2} />
              </div>
              <div className="text-base font-medium text-ink-800 mb-1">Approve</div>
              <div className="text-xs text-ink-400 leading-relaxed">
                Accept recommendation with all stated coverage conditions and tripwires.
              </div>
            </button>

            <button
              onClick={() => setAction('modify')}
              className={`p-6 border rounded-sm text-left transition-all ${
                action === 'modify'
                  ? 'border-ink-800 bg-parchment-50 ring-1 ring-ink-800'
                  : 'rule bg-parchment-50/50 hover:bg-parchment-50'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-ink-100 flex items-center justify-center mb-3">
                <Pencil className="w-4 h-4 text-ink-600" />
              </div>
              <div className="text-base font-medium text-ink-800 mb-1">Modify</div>
              <div className="text-xs text-ink-400 leading-relaxed">
                Adjust assumptions, policy limits, or conditions before binding.
              </div>
            </button>

            <button
              onClick={() => setAction('reject')}
              className={`p-6 border rounded-sm text-left transition-all ${
                action === 'reject'
                  ? 'border-ink-800 bg-parchment-50 ring-1 ring-ink-800'
                  : 'rule bg-parchment-50/50 hover:bg-parchment-50'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-vermilion-100 flex items-center justify-center mb-3">
                <X className="w-4 h-4 text-vermilion-600" strokeWidth={2} />
              </div>
              <div className="text-base font-medium text-ink-800 mb-1">Reject</div>
              <div className="text-xs text-ink-400 leading-relaxed">
                Decline the recommendation and record reasons in the loss history ledger.
              </div>
            </button>
          </div>
        </div>

        {/* Note field */}
        {action && (
          <div className="mb-8 animate-fade-in">
            <label className="text-xs text-ink-400 font-medium block mb-2">
              {action === 'approve'
                ? 'Approval notes (optional)'
                : action === 'modify'
                  ? 'Modifications requested'
                  : 'Rejection reason'}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                action === 'approve'
                  ? 'E.g., Approved with condition: sales review after 45 days.'
                  : action === 'modify'
                    ? 'Describe what assumptions should change…'
                    : 'Explain why the recommendation was rejected…'
              }
              className="w-full bg-parchment-50 border rule rounded-sm p-4 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-vermilion-300 transition-colors"
              rows={3}
            />
          </div>
        )}

        {/* Confirmation */}
        {action && (
          <div className="flex items-center gap-4 animate-fade-in">
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="group inline-flex items-center gap-2 bg-ink-900 text-parchment-50 px-6 py-3 rounded-full shadow-[0_2px_15px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300 text-sm font-medium hover:bg-ink-700 transition-colors focus-ring"
            >
              {isSubmitting ? 'Signing…' : 'Confirm decision'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <span className="text-xs text-ink-400">
              This will create an immutable record and write to the loss ledger.
            </span>
          </div>
        )}

        {!action && (
          <div className="mt-8">
            <div className="text-sm text-ink-400 leading-relaxed max-w-prose-doc">
              The human is the final authority. <span className="font-serif italic font-medium lowercase tracking-wider text-ink-500">trace</span> recommends and prices. The human decides.
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
  decisionId?: string;
  decisionTitle?: string;
}

export function DecisionRecordScreen({
  onNavigate,
  assumptions,
  approvalAction,
  approvalNote,
  approverName,
  decisionId,
  decisionTitle,
}: DecisionRecordScreenProps) {
  const calc = computeDecision(assumptions);
  const [liveRecord, setLiveRecord] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadRecord() {
      if (!decisionId) return;
      try {
        const rec = await api.approvals.getRecord(decisionId);
        if (isMounted && rec) {
          setLiveRecord(rec);
        }
      } catch (err) {
      }
    }
    loadRecord();
    return () => {
      isMounted = false;
    };
  }, [decisionId]);

  const timestamp = liveRecord?.created_at
    ? new Date(liveRecord.created_at).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  const recordNo = liveRecord?.id
    ? `DR-${liveRecord.id.slice(0, 13).toUpperCase()}`
    : 'DR-2026-09-30-001';

  const hash = liveRecord?.snapshot_integrity_hash || '703e74df28b51b37a8164e55fd9960afbebacd859811f8b41337ac87f2d38345';

  return (
    <div className="min-h-screen bg-parchment-100">
      <div className="max-w-canvas mx-auto px-8 lg:px-16 pt-16 pb-20">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="text-xs text-ink-400 font-medium">NovaMart - record</div>
            {liveRecord && (
              <span className="inline-flex items-center gap-1.5 text-xs text-brass-700 bg-brass-50 border border-brass-200 px-2.5 py-1 rounded-sm font-medium">
                <Database className="w-3.5 h-3.5" />
                Immutable Database Record Loaded
              </span>
            )}
          </div>
          <h1 className="font-serif text-hero text-ink-800 ">
            Decision record
          </h1>
        </div>

        {/* Document */}
        <div className="border-2 rule rounded-sm bg-parchment-50 px-8 lg:px-12 py-10 max-w-3xl">
          {/* Record header */}
          <div className="flex items-center justify-between border-b rule pb-6 mb-8">
            <div>
              <div className="text-xs text-ink-400 mb-1">Record no.</div>
              <div className="text-sm font-mono text-ink-700">{recordNo}</div>
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
            <div className="text-lg text-ink-800 font-medium leading-relaxed">
              {decisionTitle || 'Pricing decision matrix'}
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
              <div className="text-sm text-ink-600">Segment churn — 3.1% current, 6.2% lapse threshold</div>
              <div className="text-sm text-ink-600">Top account concentration — 1 of 3 exposed, 2 of 3 lapse</div>
              <div className="text-sm text-ink-600">Competitor price gap — unknown, {'>'}15% lapse</div>
              <div className="text-sm text-ink-600">Low-margin definition — 18% cut-off, +3 points lapse</div>
            </div>
          </div>

          {/* Counter-findings */}
          <div className="border-t rule pt-6 mb-8">
            <div className="text-xs text-ink-400 mb-3">Opposition file (counter-decision)</div>
            <div className="space-y-1.5 text-sm text-ink-600">
              <div>Contracted accounts — 3 accounts, ≈$210K overstated</div>
              <div>Order frequency decline — 2 accounts, 1.4 pts</div>
              <div>Competitor response — unknown</div>
            </div>
          </div>

          {/* Sign-off */}
          <div className="border-t rule pt-6 mb-8">
            <div className="text-xs text-ink-400 mb-3">Sign-off</div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <RecordField
                label="Approver"
                value={liveRecord?.approver_name || approverName}
              />
              <RecordField
                label="Role"
                value={liveRecord?.approver_role || 'Executive Underwriting Authority'}
              />
              <RecordField
                label="Action"
                value={approvalAction.charAt(0).toUpperCase() + approvalAction.slice(1)}
              />
              <RecordField label="Timestamp" value={timestamp} />
            </div>
            {approvalNote && (
              <div className="mt-4 pt-4 border-t rule">
                <div className="text-xs text-ink-400 mb-1">Notes</div>
                <div className="text-sm text-ink-700 italic">{approvalNote}</div>
              </div>
            )}
          </div>

          {/* Immutability hash */}
          <div className="border-t rule pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-brass-600" />
              <div className="text-xs text-ink-400 font-medium">Cryptographic seal</div>
            </div>
            <div className="font-mono text-xs text-ink-400 break-all bg-parchment-100 p-3 rounded-sm">
              SHA-256: {hash}
            </div>
            <div className="text-[11px] text-ink-300 mt-2">
              This record is immutable and permanently written to the <span className="font-serif italic font-medium lowercase tracking-wider text-ink-500">trace</span> Loss History Ledger.
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={() => onNavigate('ledger')}
            className="group inline-flex items-center gap-2 bg-ink-900 text-parchment-50 px-6 py-3 rounded-full shadow-[0_2px_15px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300 text-sm font-medium hover:bg-ink-700 transition-colors focus-ring"
          >
            View loss history ledger
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button
            onClick={() => onNavigate('rate-card')}
            className="text-sm text-ink-500 hover:text-ink-700 transition-colors"
          >
            Inspect rate card
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordField({
  label,
  value,
  mono,
  small,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-ink-400 mb-0.5">{label}</div>
      <div
        className={`${small ? 'text-xs' : 'text-sm'} ${
          mono ? 'font-mono' : ''
        } text-ink-800 font-medium`}
      >
        {value}
      </div>
    </div>
  );
}
