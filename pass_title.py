import re

# Update App.tsx
path_app = "frontend/components/bolt/App.tsx"
with open(path_app, "r", encoding="utf-8") as f:
    app_content = f.read()

app_content = app_content.replace(
    'setAssumptions={setAssumptions}\n              decisionId={decisionId}\n            />',
    'setAssumptions={setAssumptions}\n              decisionId={decisionId}\n              decisionTitle={decisionText}\n            />'
)

with open(path_app, "w", encoding="utf-8") as f:
    f.write(app_content)


# Update DecisionBrief.tsx
path_brief = "frontend/components/bolt/DecisionBrief.tsx"
with open(path_brief, "r", encoding="utf-8") as f:
    brief_content = f.read()

brief_content = brief_content.replace(
    'decisionId?: string;',
    'decisionId?: string;\n  decisionTitle?: string;'
)

brief_content = brief_content.replace(
    'export function DecisionBrief({ onNavigate, assumptions, setAssumptions, decisionId }: DecisionBriefProps) {',
    'export function DecisionBrief({ onNavigate, assumptions, setAssumptions, decisionId, decisionTitle }: DecisionBriefProps) {'
)

brief_content = brief_content.replace(
    "{liveBrief?.brief_title || 'Stop blanket discounts for low-margin customers.'}",
    "{liveBrief?.brief_title || decisionTitle || 'Pricing decision matrix'}"
)

with open(path_brief, "w", encoding="utf-8") as f:
    f.write(brief_content)

print("Updated App and DecisionBrief to pass decisionTitle")
