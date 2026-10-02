import os

files = [
  "frontend/components/bolt/DecisionBrief.tsx",
  "frontend/components/bolt/DataHealthScreen.tsx",
  "frontend/components/bolt/DataScreens.tsx",
  "frontend/components/bolt/InvestigationScreen.tsx",
  "frontend/components/bolt/HomeScreen.tsx"
]

for p in files:
    with open(p, "r", encoding="utf-8", errors="ignore") as f:
        c = f.read()
    
    # We will search for exact substring matches that we know are bad
    c = c.replace("^", "~")
    c = c.replace(" ", "˜ ")
    c = c.replace("", "·")
    
    with open(p, "w", encoding="utf-8") as f:
        f.write(c)
