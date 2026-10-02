import re

path = "frontend/components/bolt/App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'if (created && created.id) {\n          setDecisionId(created.id);\n        }',
    'if (created && created.id) {\n          setDecisionId(created.id);\n          try { await api.decisions.setObjective(created.id, { primary_goal: "Maximize retention", target_metric: "retention_rate" }); } catch (e) { }\n        }'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
