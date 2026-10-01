import { type View } from '@/lib/bolt/types';
import { DATA_FINDINGS, EVIDENCE_CHAIN_PREMIUM, formatCurrency } from '@/lib/bolt/data';
import { ArrowRight, ChevronRight, Database } from 'lucide-react';
import { useState, useEffect } from 'react';
import { EvidenceDrawer, EvidenceLink } from './EvidenceDrawer';
import { Section, Divider } from './ui/Section';
import { api } from '@/lib/api-client';

interface DataHealthScreenProps {
  onNavigate: (view: View) => void;
  datasetId?: string;
}

export function DataHealthScreen({ onNavigate, datasetId }: DataHealthScreenProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<string | null>(null);
  const [liveFindings, setLiveFindings] = useState<any[]>(DATA_FINDINGS);
  const [healthScore, setHealthScore] = useState<number>(94);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadHealth() {
      if (!datasetId) return;
      try {
        const res = await api.datasets.getDataHealth(datasetId);
        if (isMounted && res && res.findings && res.findings.length > 0) {
          setHealthScore(Math.round(res.overall_health_score * 100));
          const mapped = res.findings.map((f: any, i: number) => ({
            id: f.id || `f-${i}`,
            metric: f.finding_type === 'missing' ? 'missing attribute values' : 'external coverage lapse',
            value: f.affected_ratio ? `${(f.affected_ratio * 100).toFixed(1)}%` : 'Exclusion',
            description: f.issue_description,
            action: f.proposed_treatment,
            impact: f.effect_on_premium_load
              ? `Adds ${Math.round(f.effect_on_premium_load * 100)}% load to Decision Premium`
              : 'Adds to Decision Premium',
            severity: f.severity || 'medium',
          }));
          setLiveFindings(mapped);
          setIsLive(true);
        }
      } catch (err) {
        console.warn('Data health API check deferred:', err);
      }
    }
    loadHealth();
    return () => {
      isMounted = false;
    };
  }, [datasetId]);

  const handleFindingClick = (id: string) => {
    setSelectedFinding(id);
    setDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-parchment-100">
      <div className="max-w-canvas mx-auto px-8 lg:px-16 pt-16 pb-16">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="text-xs text-ink-400 font-medium">NovaMart · audit</div>
            {isLive && (
              <span className="inline-flex items-center gap-1.5 text-xs text-brass-700 bg-brass-50 border border-brass-200 px-2.5 py-1 rounded-sm font-medium">
                <Database className="w-3.5 h-3.5" />
                Live Profiler Health Audit ({healthScore}%)
              </span>
            )}
          </div>
          <h1 className="font-serif text-hero text-ink-800 text-balance">
            Before the decision, check the evidence.
          </h1>
          <p className="mt-3 text-ink-500 text-lg max-w-prose-doc leading-relaxed">
            TRACE audited the underlying tables for schema defects and noise that would distort the decision.
            Every detected finding is mathematically priced into the Decision Premium.
          </p>
        </div>

        {/* Findings */}
        <div className="border-t rule">
          {liveFindings.map((finding) => (
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
                    <div className="text-base text-ink-700 leading-relaxed mb-2">
                      {finding.description}
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <span className="text-ink-500">
                        <span className="text-ink-400">TRACE treatment: </span>
                        {finding.action}
                      </span>
                      <span className="text-brass-600 font-medium">
                        {finding.impact}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="pt-2 text-ink-300 group-hover:text-ink-600 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <Divider />
            </div>
          ))}
        </div>

        {/* Evidence link */}
        <div className="mt-8">
          <EvidenceLink onClick={() => { setSelectedFinding(null); setDrawerOpen(true); }}>
            Evidence chain behind data findings
          </EvidenceLink>
        </div>

        {/* Action */}
        <div className="mt-12 flex items-center justify-between">
          <button
            onClick={() => onNavigate('semantic-map')}
            className="text-sm text-ink-500 hover:text-ink-700 transition-colors"
          >
            Back to semantic map
          </button>
          <button
            onClick={() => onNavigate('investigation')}
            className="group inline-flex items-center gap-2 bg-ink-800 text-parchment-50 px-6 py-3 rounded-sm text-sm font-medium hover:bg-ink-700 transition-colors focus-ring"
          >
            Launch underwriting investigation
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      <EvidenceDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedFinding ? 'Data finding evidence' : 'Data health audit chain'}
        root={EVIDENCE_CHAIN_PREMIUM}
      />
    </div>
  );
}
