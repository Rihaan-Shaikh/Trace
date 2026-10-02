import re

path = "frontend/components/bolt/ApprovalScreens.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Add decisionTitle to ApprovalScreenProps if not there
if "decisionTitle" not in content[:content.find("ApprovalScreen(")]:
    content = re.sub(
        r'(interface ApprovalScreenProps \{[^\}]+)(\})',
        r'\1  decisionTitle?: string;\n\2',
        content,
        count=1
    )

if "decisionTitle" not in content[content.find("ApprovalScreen("):content.find("{", content.find("ApprovalScreen("))]:
    content = content.replace(
        'export function ApprovalScreen({ onNavigate, assumptions, onApprove, decisionId }: ApprovalScreenProps) {',
        'export function ApprovalScreen({ onNavigate, assumptions, onApprove, decisionId, decisionTitle }: ApprovalScreenProps) {'
    )


# Add decisionTitle to DecisionRecordScreenProps
start = content.find("interface DecisionRecordScreenProps")
if "decisionTitle" not in content[start:content.find("}", start)]:
    content = re.sub(
        r'(interface DecisionRecordScreenProps \{[^\}]+)(\})',
        r'\1  decisionTitle?: string;\n\2',
        content,
        count=1
    )

fn_start = content.find("export function DecisionRecordScreen")
if "decisionTitle" not in content[fn_start:content.find("{", fn_start)]:
    content = content.replace(
        'export function DecisionRecordScreen({ onNavigate, assumptions, approvalAction, approvalNote, approverName, decisionId }: DecisionRecordScreenProps) {',
        'export function DecisionRecordScreen({ onNavigate, assumptions, approvalAction, approvalNote, approverName, decisionId, decisionTitle }: DecisionRecordScreenProps) {'
    )

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
