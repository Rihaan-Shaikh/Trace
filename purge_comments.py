import re

path = "frontend/components/bolt/DecisionBrief.tsx"
with open(path, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

# Remove all JSX comments containing A?
content = re.sub(r'\{\/\*.*?\*\/\}', '', content)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
