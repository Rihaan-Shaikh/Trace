import re

path = "frontend/components/bolt/ApprovalScreens.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Add decisionTitle to ApprovalScreenProps
content = content.replace(
    '  decisionId?: string;\n}',
    '  decisionId?: string;\n  decisionTitle?: string;\n}'
)

content = content.replace(
    'export function ApprovalScreen({ onNavigate, assumptions, onApprove, decisionId }: ApprovalScreenProps) {',
    'export function ApprovalScreen({ onNavigate, assumptions, onApprove, decisionId, decisionTitle }: ApprovalScreenProps) {'
)

# Add decisionTitle to DecisionRecordScreenProps
content = content.replace(
    'interface DecisionRecordScreenProps {\n  onNavigate: (view: View) => void;\n  decisionId?: string;\n}',
    'interface DecisionRecordScreenProps {\n  onNavigate: (view: View) => void;\n  decisionId?: string;\n  decisionTitle?: string;\n}'
)

content = content.replace(
    'export function DecisionRecordScreen({ onNavigate, decisionId }: DecisionRecordScreenProps) {',
    'export function DecisionRecordScreen({ onNavigate, decisionId, decisionTitle }: DecisionRecordScreenProps) {'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
