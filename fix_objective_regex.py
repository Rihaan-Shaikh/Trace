import re

path = "frontend/components/bolt/App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(
    r'(if \(created && created\.id\) \{\s*setDecisionId\(created\.id\);\s*)(\})',
    r'\1  try { await api.decisions.setObjective(created.id, { primary_goal: "Maximize retention", target_metric: "retention_rate" }); } catch (e) { }\n        \2',
    content
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
