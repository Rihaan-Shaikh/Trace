import os

path = "frontend/components/bolt/DecisionBrief.tsx"
with open(path, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

content = content.replace("", "")
content = content.replace("%^", "˜")
content = content.replace("^'", "~")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
