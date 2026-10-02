import re

path_app = "frontend/components/bolt/App.tsx"
with open(path_app, "r", encoding="utf-8") as f:
    app_content = f.read()

app_content = re.sub(
    r'<ApprovalScreen onNavigate=\{handleNavigate\} />',
    r'<ApprovalScreen onNavigate={handleNavigate} decisionTitle={decisionText} />',
    app_content
)
app_content = re.sub(
    r'<DecisionRecordScreen onNavigate=\{handleNavigate\} />',
    r'<DecisionRecordScreen onNavigate={handleNavigate} decisionTitle={decisionText} />',
    app_content
)
with open(path_app, "w", encoding="utf-8") as f:
    f.write(app_content)


path_screens = "frontend/components/bolt/ApprovalScreens.tsx"
with open(path_screens, "r", encoding="utf-8") as f:
    screens_content = f.read()

screens_content = screens_content.replace(
    'interface ApprovalScreenProps {\n  onNavigate: (view: View) => void;\n}',
    'interface ApprovalScreenProps {\n  onNavigate: (view: View) => void;\n  decisionTitle?: string;\n}'
)
screens_content = screens_content.replace(
    'export function ApprovalScreen({ onNavigate }: ApprovalScreenProps) {',
    'export function ApprovalScreen({ onNavigate, decisionTitle }: ApprovalScreenProps) {'
)

screens_content = screens_content.replace(
    'interface DecisionRecordScreenProps {\n  onNavigate: (view: View) => void;\n}',
    'interface DecisionRecordScreenProps {\n  onNavigate: (view: View) => void;\n  decisionTitle?: string;\n}'
)
screens_content = screens_content.replace(
    'export function DecisionRecordScreen({ onNavigate }: DecisionRecordScreenProps) {',
    'export function DecisionRecordScreen({ onNavigate, decisionTitle }: DecisionRecordScreenProps) {'
)

screens_content = screens_content.replace(
    'Stop blanket discounts for low-margin customers.',
    '{decisionTitle || \'Pricing decision matrix\'}'
)

with open(path_screens, "w", encoding="utf-8") as f:
    f.write(screens_content)

print("Updated ApprovalScreens")
