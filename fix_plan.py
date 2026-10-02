import re

path = "frontend/components/bolt/InvestigationScreen.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'await api.decisions.runInvestigation(decisionId);',
    'await api.decisions.generatePlan(decisionId);\n        await api.decisions.runInvestigation(decisionId);'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Injected generatePlan")
