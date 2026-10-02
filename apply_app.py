import re
with open("frontend/components/bolt/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(
    r'const handleNavigate = \(next: View\) => \{[\s\S]*?setDecisionText\(text\);',
    """const handleNavigate = (next: View) => {
    if (next === 'investigation' && decisionId && datasetId) {
      api.decisions.update(decisionId, { dataset_id: datasetId }).catch(console.warn);
    }
    setView(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleStartDecision = async (text: string) => {
    setDecisionText(text);""",
    content
)

with open("frontend/components/bolt/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
