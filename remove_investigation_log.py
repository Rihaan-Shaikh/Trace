import re

path = "frontend/components/bolt/InvestigationScreen.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("console.error(err);", "")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
