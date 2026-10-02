import re

path = "frontend/components/bolt/App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace setDecisionId in loadCanonical to respect if user already moved on
content = content.replace(
    'setDecisionId(underwritten.id);',
    'setDecisionId(prev => prev === CANONICAL_DECISION_ID ? underwritten.id : prev);'
)
content = content.replace(
    'setDatasetId(underwritten.dataset_id);',
    'setDatasetId(prev => prev === CANONICAL_DATASET_ID ? underwritten.dataset_id : prev);'
)
content = content.replace(
    'setDecisionId(decisionsRes.items[0].id);',
    'setDecisionId(prev => prev === CANONICAL_DECISION_ID ? decisionsRes.items[0].id : prev);'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed loadCanonical race condition")
