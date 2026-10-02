import re

path = "frontend/components/bolt/ApprovalScreens.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# find "decisionId," and append "\n  decisionTitle," after it inside DecisionRecordScreen definition
content = re.sub(
    r'(decisionId,\s*)(\}: DecisionRecordScreenProps)',
    r'\1  decisionTitle,\n\2',
    content
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
