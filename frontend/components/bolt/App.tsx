'use client';

import { useState, useEffect } from 'react';
import { type View, type SandboxAssumptions } from '@/lib/bolt/types';
import { DEFAULT_ASSUMPTIONS } from '@/lib/bolt/data';
import { AppShell } from '@/components/bolt/AppShell';
import { HomeScreen } from '@/components/bolt/HomeScreen';
import { DataScreen, SemanticMapScreen } from '@/components/bolt/DataScreens';
import { DataHealthScreen } from '@/components/bolt/DataHealthScreen';
import { InvestigationScreen } from '@/components/bolt/InvestigationScreen';
import { DecisionBrief } from '@/components/bolt/DecisionBrief';
import { SandboxScreen } from '@/components/bolt/SandboxScreen';
import { ApprovalScreen, DecisionRecordScreen } from '@/components/bolt/ApprovalScreens';
import { LedgerScreen } from '@/components/bolt/LedgerScreen';
import { RateCardScreen } from '@/components/bolt/RateCardScreen';
import { api } from '@/lib/api-client';

export const CANONICAL_DECISION_ID = 'a19d5e02-25df-4db2-b934-0486c59129bc';
export const CANONICAL_DATASET_ID = '5b1755ee-56a5-4a2d-a076-7c1d087c7744';

function App() {
  const [view, setView] = useState<View>('home');
  const [decisionText, setDecisionText] = useState('');
  const [decisionId, setDecisionId] = useState<string>(CANONICAL_DECISION_ID);
  const [datasetId, setDatasetId] = useState<string>(CANONICAL_DATASET_ID);
  const [assumptions, setAssumptions] = useState<SandboxAssumptions>(DEFAULT_ASSUMPTIONS);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'modify' | 'reject'>('approve');
  const [approvalNote, setApprovalNote] = useState('');

  // Discover latest active underwritten decision and benchmark dataset
  useEffect(() => {
    let isMounted = true;
    async function initLiveState() {
      try {
        const decisionsRes = await api.decisions.list(0, 10);
        if (isMounted && decisionsRes.items && decisionsRes.items.length > 0) {
          // Look for an underwritten decision or the canonical one
          const underwritten = decisionsRes.items.find(
            (d) => d.id === CANONICAL_DECISION_ID || d.status === 'underwritten' || d.status === 'approved'
          );
          if (underwritten) {
            setDecisionId(prev => prev === CANONICAL_DECISION_ID ? underwritten.id : prev);
            if (underwritten.dataset_id) {
              setDatasetId(prev => prev === CANONICAL_DATASET_ID ? underwritten.dataset_id : prev);
            }
          } else {
            setDecisionId(prev => prev === CANONICAL_DECISION_ID ? decisionsRes.items[0].id : prev);
          }
        }
      } catch (err) {
        console.warn('Backend API connection check (using canonical baseline):', err);
      }

      try {
        const datasetsRes = await api.datasets.list(0, 10);
        if (isMounted && datasetsRes.items && datasetsRes.items.length > 0) {
          const benchmark = datasetsRes.items.find(
            (d) => d.id === CANONICAL_DATASET_ID || d.name.toLowerCase().includes('novamart')
          );
          if (benchmark) {
            setDatasetId(benchmark.id);
          } else {
            setDatasetId(datasetsRes.items[0].id);
          }
        }
      } catch (err) {
      }
    }

    initLiveState();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleNavigate = (next: View) => {
    if (next === 'investigation' && decisionId && datasetId) {
      api.decisions.update(decisionId, { dataset_id: datasetId }).catch(() => {});
    }
    setView(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleStartDecision = async (text: string) => {
    setDecisionText(text);
    if (!text.trim()) {
      handleNavigate('data');
      return;
    }

    try {
      const created = await api.decisions.create({
        title: text.trim(),
        question_text: text.trim(),
        horizon_days: 90,
      });
      if (created && created.id) {
        setDecisionId(created.id);
        try { await api.decisions.setObjective(created.id, { primary_goal: "Maximize retention", target_metric: "retention_rate" }); } catch (e) { }
        }
    } catch (e) {
    }
    handleNavigate('data');
  };

  const handleApprove = (action: 'approve' | 'modify' | 'reject', note: string) => {
    setApprovalAction(action);
    setApprovalNote(note);
  };

  const renderView = () => {
    switch (view) {
      case 'home':
        return (
          <HomeScreen
            onNavigate={(v) => {
              if (v === 'data') handleStartDecision(decisionText);
              else handleNavigate(v);
            }}
            onSetDecision={setDecisionText}
            decisionText={decisionText}
          />
        );
      case 'data':
        return <DataScreen onNavigate={handleNavigate} datasetId={datasetId} setDatasetId={setDatasetId} />;
      case 'semantic-map':
        return <SemanticMapScreen onNavigate={handleNavigate} datasetId={datasetId} />;
      case 'data-health':
        return <DataHealthScreen onNavigate={handleNavigate} datasetId={datasetId} />;
      case 'investigation':
        return <InvestigationScreen onNavigate={handleNavigate} decisionId={decisionId} />;
      case 'decision-brief':
        return (
          <DecisionBrief
            onNavigate={handleNavigate}
            assumptions={assumptions}
            setAssumptions={setAssumptions}
            decisionId={decisionId}
          />
        );
      case 'sandbox':
        return (
          <SandboxScreen
            onNavigate={handleNavigate}
            assumptions={assumptions}
            setAssumptions={setAssumptions}
            decisionId={decisionId}
          />
        );
      case 'approval':
        return (
          <ApprovalScreen
            onNavigate={handleNavigate}
            assumptions={assumptions}
            onApprove={handleApprove}
            decisionId={decisionId}
          />
        );
      case 'decision-record':
        return (
          <DecisionRecordScreen
            onNavigate={handleNavigate}
            assumptions={assumptions}
            approvalAction={approvalAction}
            approvalNote={approvalNote}
            approverName="NovaMart strategy team"
            decisionId={decisionId}
          />
        );
      case 'ledger':
        return <LedgerScreen onNavigate={handleNavigate} />;
      case 'rate-card':
        return <RateCardScreen onNavigate={handleNavigate} />;
      default:
        return (
          <HomeScreen
            onNavigate={handleNavigate}
            onSetDecision={setDecisionText}
            decisionText={decisionText}
          />
        );
    }
  };

  return (
    <AppShell currentView={view} onNavigate={handleNavigate} hasText={decisionText.trim().length > 0}>
      {renderView()}
    </AppShell>
  );
}

export default App;
