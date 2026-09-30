import { type View } from '@/lib/bolt/types';
import { DATA_FINDINGS, EVIDENCE_CHAIN_PREMIUM } from '@/lib/bolt/data';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { EvidenceDrawer, EvidenceLink } from './EvidenceDrawer';
import { Section, Divider } from './ui/Section';

interface DataHealthScreenProps {
  onNavigate: (view: View) => void;
}

export function DataHealthScreen({ onNavigate }: DataHealthScreenProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<string | null>(null);

  const handleFindingClick = (id: string) => {
    setSelectedFinding(id);
    setDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-base-900">
      <div className="max-w-canvas mx-auto px-8 lg:px-16 pt-16 pb-16">
        {/* Header */}
        <div className="mb-12">
          <div className="text-xs text-ink-400 font-medium mb-2">NovaMart · audit</div>
          <h1 className="font-serif text-hero text-ink-50 text-balance">
            Before the decision, check the evidence.
          </h1>
          <p className="mt-3 text-ink-300 text-lg max-w-prose-doc leading-relaxed">
            TRACE inspected the data for problems that would distort the decision. Each finding
            is priced into the Decision Premium.
          </p>
        </div>

        {/* Findings */}
        <div className="border-t rule">
          {DATA_FINDINGS.map((finding, idx) => (
            <div key={finding.id}>
              <div
                className="py-8 cursor-pointer group"
                onClick={() => handleFindingClick(finding.id)}
              >
                <div className="grid grid-cols-[auto_1fr_auto] gap-6 items-start">
                  {/* Number */}
                  <div className="editorial-num text-3xl text-vermilion-600 tabular-nums">
                    {finding.value}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="text-sm text-ink-400 mb-1">{finding.metric}</div>
                    <div className="text-base text-ink-100 leading-relaxed mb-2">
                      {finding.description}
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <span className="text-ink-300">
                        <span className="text-ink-400">TRACE did: </span>
                        {finding.action}
                      </span>
                      <span className="text-brass-600 font-medium">
                        {finding.impact}
                      </span>
                    </div>
                  </div>

                  {/* Expand indicator */}
                  <div className="pt-2">
                    <ChevronRight className="w-4 h-4 text-ink-300 group-hover:text-vermilion-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
              {idx < DATA_FINDINGS.length - 1 && <Divider />}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-12 border-t rule pt-8">
          <div className="grid sm:grid-cols-3 gap-8">
            <div>
              <div className="text-xs text-ink-400 mb-1">Findings</div>
              <div className="editorial-num text-2xl text-ink-50">4</div>
            </div>
            <div>
              <div className="text-xs text-ink-400 mb-1">Data exposure</div>
              <div className="editorial-num text-2xl text-vermilion-600">−$40K</div>
            </div>
            <div>
              <div className="text-xs text-ink-400 mb-1">Premium contribution</div>
              <div className="editorial-num text-2xl text-brass-600">+$24K</div>
            </div>
          </div>
          <div className="mt-4">
            <EvidenceLink onClick={() => setDrawerOpen(true)}>
              Evidence behind this number
            </EvidenceLink>
          </div>
        </div>

        {/* Action */}
        <Divider className="mt-12" />
        <div className="mt-8 flex items-center justify-between">
          <div className="text-xs text-ink-400">
            4 findings · $40K data exposure priced into premium
          </div>
          <button
            onClick={() => onNavigate('investigation')}
            className="group inline-flex items-center gap-2 bg-ink-50 text-base-900 px-6 py-3 rounded-sm text-sm font-medium hover:bg-ink-700 transition-colors focus-ring"
          >
            Begin investigation
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      <EvidenceDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Data-quality findings"
        root={EVIDENCE_CHAIN_PREMIUM}
      />
    </div>
  );
}
